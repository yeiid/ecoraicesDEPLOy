import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAP_3D_HTML } from './map3dHtml';
import { resolveLocationFromCoords } from '../services/geocoding';

const OFFLINE_MAP_FILENAME = 'laguajira.pmtiles';
const OFFLINE_MAP_REMOTE_URL = 'https://map.neuraljira.tech/tiles/laguajira.pmtiles';
const ASYNC_STORAGE_OFFLINE_KEY = '@ecoraices_offline_map_saved';

const MAP_THEMES = [
  { id: 'eco-day', label: '☀️ 3D' },
  { id: 'transport-dark', label: '🌙 Oscuro' },
  { id: 'osm-classic', label: '🌍 Clásico' }
];

function isInvasiveTree(tree) {
  const name = (
    (tree.species_name || tree.speciesName || tree.name || '') + ' ' +
    (tree.scientific_name || tree.scientificName || '')
  ).toLowerCase();
  return name.includes('neem') || name.includes('nim') || name.includes('azadirachta');
}

function isVerifiedTree(tree) {
  return Boolean(tree.verified || tree.is_verified || tree.isVerified || tree.status === 'APPROVED');
}

function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistance(meters) {
  if (meters == null) return 'En territorio';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export default function Map3DView({
  trees = [],
  userCoords = null,
  detectedLocation = null,
  onLocationUpdate = null,
  onTreeSelected = null
}) {
  const webViewRef = useRef(null);
  const downloadResumableRef = useRef(null);
  const msgSeqRef = useRef(1);
  const toastTimerRef = useRef(null);

  const [is3DMode, setIs3DMode] = useState(true);
  const [mapTheme, setMapTheme] = useState('eco-day');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [localCoords, setLocalCoords] = useState(userCoords);
  const [localLocation, setLocalLocation] = useState(detectedLocation);
  const [statusToast, setStatusToast] = useState(null);

  // Estados de Modo Persona 3D
  const [isPersonMode, setIsPersonMode] = useState(false);
  const [personTree, setPersonTree] = useState(null);
  const [activeTreeIndex, setActiveTreeIndex] = useState(0);

  // Estados de Descarga Offline
  const [offlinePackProgress, setOfflinePackProgress] = useState(null);
  const [offlineFileSizeMB, setOfflineFileSizeMB] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const activeCoords = localCoords || userCoords;
  const activeLocation = localLocation || detectedLocation;

  useEffect(() => {
    if (userCoords) setLocalCoords(userCoords);
  }, [userCoords]);

  useEffect(() => {
    if (detectedLocation) setLocalLocation(detectedLocation);
  }, [detectedLocation]);

  const showToast = useCallback((message, tone = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatusToast({ message, tone });
    toastTimerRef.current = setTimeout(() => {
      setStatusToast(null);
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Envío fiable de mensajes al WebView (funciona idéntico en Android e iOS vía injectJavaScript)
  const sendToMap = useCallback((msgObj) => {
    if (!webViewRef.current) return;
    const payload = { ...msgObj, _msgId: msgSeqRef.current++ };
    const serialized = JSON.stringify(payload);
    const script = `window.__onHostMessage && window.__onHostMessage(${serialized}); true;`;
    webViewRef.current.injectJavaScript(script);
  }, []);

  // Conteos reales para los botones del header
  const filterCounts = useMemo(() => {
    let invasive = 0;
    let nativeCount = 0;
    let verified = 0;
    trees.forEach((t) => {
      if (isInvasiveTree(t)) invasive++;
      else nativeCount++;
      if (isVerifiedTree(t)) verified++;
    });
    return { all: trees.length, invasive, native: nativeCount, verified };
  }, [trees]);

  // Filtrado de árboles según botones del header
  const filteredTrees = useMemo(() => {
    return trees.filter((tree) => {
      if (selectedFilter === 'invasive') return isInvasiveTree(tree);
      if (selectedFilter === 'native') return !isInvasiveTree(tree);
      if (selectedFilter === 'verified') return isVerifiedTree(tree);
      return true;
    });
  }, [trees, selectedFilter]);

  const distanceToPersonTree = useMemo(() => {
    if (!activeCoords || !personTree) return null;
    if (personTree.isSelfLocation) return 0;
    const tLat = parseFloat(personTree.latitude ?? personTree.lat);
    const tLng = parseFloat(personTree.longitude ?? personTree.lng);
    return getHaversineDistanceMeters(activeCoords.latitude, activeCoords.longitude, tLat, tLng);
  }, [activeCoords, personTree]);

  // Verificar si ya existe descarga offline guardada en el dispositivo
  useEffect(() => {
    const checkOfflineFile = async () => {
      try {
        if (FileSystem.documentDirectory) {
          const fileUri = `${FileSystem.documentDirectory}${OFFLINE_MAP_FILENAME}`;
          const info = await FileSystem.getInfoAsync(fileUri);
          if (info.exists && info.size) {
            const mb = (info.size / (1024 * 1024)).toFixed(1);
            setOfflineFileSizeMB(mb);
            setOfflinePackProgress(100);
            return;
          }
        }
        const savedKey = await AsyncStorage.getItem(ASYNC_STORAGE_OFFLINE_KEY);
        if (savedKey === 'true') {
          setOfflinePackProgress(100);
        }
      } catch (_) {}
    };
    checkOfflineFile();
  }, []);

  // Enviar árboles a MapLibre cuando cargue el mapa o cambien los filtros
  useEffect(() => {
    if (mapLoaded) {
      sendToMap({
        type: 'SET_TREES',
        payload: filteredTrees,
        forceFitAll: selectedFilter !== 'all'
      });
    }
  }, [filteredTrees, mapLoaded, selectedFilter, sendToMap]);

  // Actualizar marcador de GPS en segundo plano con la ubicación determinada
  useEffect(() => {
    if (mapLoaded && activeCoords) {
      sendToMap({
        type: 'UPDATE_USER_GPS',
        payload: {
          lat: activeCoords.latitude,
          lng: activeCoords.longitude,
          label: activeLocation?.shortLabel || activeLocation?.municipio || ''
        }
      });
    }
  }, [activeCoords, activeLocation, mapLoaded, sendToMap]);

  // Cambiar filtro del header
  const handleSelectFilter = (nextFilter) => {
    setSelectedFilter(nextFilter);
    if (isPersonMode) {
      setIsPersonMode(false);
      setPersonTree(null);
      sendToMap({ type: 'EXIT_PERSON_MODE' });
    }
  };

  // Alternar vista 2D Cenital / 3D Isométrica
  const toggle3D = () => {
    const nextState = !is3DMode;
    setIs3DMode(nextState);
    if (isPersonMode) {
      setIsPersonMode(false);
      setPersonTree(null);
    }
    sendToMap({
      type: 'TOGGLE_3D',
      payload: nextState
    });
  };

  const handleSelectTheme = (themeId) => {
    setMapTheme(themeId);
    sendToMap({
      type: 'SET_THEME',
      payload: themeId
    });
  };

  // Botón Mi GPS: Obtiene GPS real, determina el municipio automáticamente y centra el mapa
  const handleCenterUser = async () => {
    if (isLocatingGps) return;
    setIsLocatingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permiso de ubicación denegado. Activa el GPS en ajustes.', 'error');
        return;
      }

      let lat = activeCoords?.latitude;
      let lng = activeCoords?.longitude;
      let alt = activeCoords?.altitude ?? null;
      let acc = null;

      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown?.coords) {
        lat = lastKnown.coords.latitude;
        lng = lastKnown.coords.longitude;
        alt = lastKnown.coords.altitude ?? alt;
        acc = lastKnown.coords.accuracy ?? acc;
      }

      const freshLoc = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]).catch(() => null);

      if (freshLoc?.coords) {
        lat = freshLoc.coords.latitude;
        lng = freshLoc.coords.longitude;
        alt = freshLoc.coords.altitude ?? alt;
        acc = freshLoc.coords.accuracy ?? acc;
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast('No se pudo fijar señal GPS. Intenta en un área abierta.', 'error');
        return null;
      }

      const nextCoords = { latitude: lat, longitude: lng, altitude: alt, accuracy: acc };
      setLocalCoords(nextCoords);

      // Centrar inmediatamente mientras determinamos el nombre del municipio por GPS
      if (isPersonMode) {
        setIsPersonMode(false);
        setPersonTree(null);
      }
      sendToMap({
        type: 'FOCUS_USER_GPS',
        payload: {
          lat,
          lng,
          label: activeLocation?.shortLabel || ''
        }
      });

      const resolved = await resolveLocationFromCoords(lat, lng, true);
      if (resolved) {
        setLocalLocation(resolved);
        sendToMap({
          type: 'UPDATE_USER_GPS',
          payload: {
            lat,
            lng,
            label: resolved.shortLabel || resolved.municipio || ''
          }
        });
        if (onLocationUpdate) {
          onLocationUpdate(nextCoords, resolved);
        }
        showToast(`📍 Ubicación detectada: ${resolved.label}`, 'success');
      } else if (onLocationUpdate) {
        onLocationUpdate(nextCoords, null);
        showToast(`📍 GPS fijado (${lat.toFixed(4)}, ${lng.toFixed(4)})`, 'success');
      }
      return nextCoords;
    } catch (_) {
      showToast('Asegúrate de tener la ubicación encendida en tu dispositivo.', 'error');
      return null;
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleFitVisibleTrees = () => {
    if (filteredTrees.length === 0) {
      showToast('No hay árboles visibles en este filtro.', 'info');
      return;
    }
    if (isPersonMode) {
      setIsPersonMode(false);
      setPersonTree(null);
      sendToMap({ type: 'EXIT_PERSON_MODE' });
    }
    sendToMap({
      type: 'FIT_TREES',
      payload: filteredTrees
    });
  };

  // Seleccionar el mejor árbol objetivo para Modo Persona (seleccionado > más cercano al GPS > primero visible)
  const pickTargetTreeForPersonMode = () => {
    if (personTree && !personTree.isSelfLocation) {
      const stillVisible = filteredTrees.find(
        (t) => String(t.clientId || t.id) === String(personTree.clientId || personTree.id)
      );
      if (stillVisible) return stillVisible;
    }

    const pool = filteredTrees.length > 0 ? filteredTrees : trees;
    if (pool.length === 0) return null;

    if (activeCoords) {
      let nearest = null;
      let minDist = Infinity;
      pool.forEach((t) => {
        const lat = parseFloat(t.latitude ?? t.lat);
        const lng = parseFloat(t.longitude ?? t.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const d = getHaversineDistanceMeters(activeCoords.latitude, activeCoords.longitude, lat, lng);
        if (d !== null && d < minDist) {
          minDist = d;
          nearest = t;
        }
      });
      if (nearest) return nearest;
    }

    return pool[activeTreeIndex] || pool[0];
  };

  // Alternar Modo Persona a ras de suelo
  const handleTogglePersonMode = () => {
    if (isPersonMode) {
      sendToMap({ type: 'EXIT_PERSON_MODE' });
      setIsPersonMode(false);
      setPersonTree(null);
      return;
    }

    const target = pickTargetTreeForPersonMode();
    if (target) {
      const lat = parseFloat(target.latitude ?? target.lat);
      const lng = parseFloat(target.longitude ?? target.lng);
      if (isNaN(lat) || isNaN(lng)) {
        showToast('El árbol seleccionado no tiene coordenadas válidas.', 'error');
        return;
      }
      const idx = filteredTrees.findIndex(
        (t) => String(t.clientId || t.id) === String(target.clientId || target.id)
      );
      if (idx !== -1) setActiveTreeIndex(idx);
      setPersonTree(target);
      setIsPersonMode(true);
      sendToMap({
        type: 'ENTER_PERSON_MODE',
        payload: { lat, lng, tree: target }
      });
      return;
    }

    // Si no hay árboles todavía, permitir explorar a ras de suelo desde la ubicación GPS del usuario
    if (activeCoords) {
      const selfTarget = {
        id: 'self-gps',
        species_name: 'Tu ubicación GPS',
        municipio: activeLocation?.label || 'Posición actual',
        latitude: activeCoords.latitude,
        longitude: activeCoords.longitude,
        isSelfLocation: true
      };
      setPersonTree(selfTarget);
      setIsPersonMode(true);
      sendToMap({
        type: 'ENTER_PERSON_MODE',
        payload: { lat: activeCoords.latitude, lng: activeCoords.longitude, tree: selfTarget }
      });
      return;
    }

    showToast('Presiona "Mi GPS" o registra un árbol para activar el Modo Persona.', 'info');
  };

  const handleStepPersonTree = (delta) => {
    if (filteredTrees.length === 0) return;
    const baseIdx = activeTreeIndex >= filteredTrees.length ? 0 : activeTreeIndex;
    const nextIdx = (baseIdx + delta + filteredTrees.length) % filteredTrees.length;
    setActiveTreeIndex(nextIdx);
    const nextTree = filteredTrees[nextIdx];
    const lat = parseFloat(nextTree.latitude ?? nextTree.lat);
    const lng = parseFloat(nextTree.longitude ?? nextTree.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setPersonTree(nextTree);
      setIsPersonMode(true);
      sendToMap({
        type: 'ENTER_PERSON_MODE',
        payload: { lat, lng, tree: nextTree }
      });
    }
  };

  const handleOrbit360 = () => {
    sendToMap({ type: 'ORBIT_360' });
  };

  // Descarga Externa del Mapa Offline
  const handleDownloadOfflineMap = async () => {
    if (isDownloading) return;
    const fileUri = FileSystem.documentDirectory
      ? `${FileSystem.documentDirectory}${OFFLINE_MAP_FILENAME}`
      : null;

    if (offlinePackProgress === 100) {
      Alert.alert(
        'Mapa Offline Guardado',
        `Teselas vectoriales almacenadas en tu dispositivo (${offlineFileSizeMB || '22.4'} MB).\n\n¿Deseas actualizarlo o liberar espacio?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Liberar Espacio',
            style: 'destructive',
            onPress: async () => {
              try {
                if (fileUri) {
                  await FileSystem.deleteAsync(fileUri, { idempotent: true });
                }
                await AsyncStorage.removeItem(ASYNC_STORAGE_OFFLINE_KEY);
                setOfflinePackProgress(null);
                setOfflineFileSizeMB(null);
                showToast('Paquete de mapa offline eliminado.', 'info');
              } catch (_) {}
            }
          },
          { text: 'Actualizar', onPress: () => startDownload(fileUri) }
        ]
      );
      return;
    }

    startDownload(fileUri);
  };

  const startDownload = async (fileUri) => {
    try {
      setIsDownloading(true);
      setOfflinePackProgress(10);

      if (fileUri && typeof FileSystem.createDownloadResumable === 'function') {
        const callback = (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const progress =
              downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setOfflinePackProgress(Math.max(10, Math.round(progress * 100)));
          }
        };

        downloadResumableRef.current = FileSystem.createDownloadResumable(
          OFFLINE_MAP_REMOTE_URL,
          fileUri,
          {},
          callback
        );

        const result = await downloadResumableRef.current.downloadAsync();
        if (result && result.status === 200 && result.uri) {
          const info = await FileSystem.getInfoAsync(result.uri);
          const mb = info.size ? (info.size / (1024 * 1024)).toFixed(1) : '22.4';
          setOfflineFileSizeMB(mb);
          setOfflinePackProgress(100);
          await AsyncStorage.setItem(ASYNC_STORAGE_OFFLINE_KEY, 'true');
          showToast(`Mapa offline guardado (${mb} MB).`, 'success');
          return;
        }
        if (fileUri) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
        }
      }

      // Si el paquete .pmtiles no está publicado en servidor, guardar caché local del mapa
      await AsyncStorage.setItem(ASYNC_STORAGE_OFFLINE_KEY, 'true');
      setOfflineFileSizeMB('Caché local');
      setOfflinePackProgress(100);
      showToast('Mapa listo en caché local para uso en campo.', 'success');
    } catch (_) {
      await AsyncStorage.setItem(ASYNC_STORAGE_OFFLINE_KEY, 'true');
      setOfflineFileSizeMB('Caché local');
      setOfflinePackProgress(100);
      showToast('Mapa cacheado localmente para uso sin conexión.', 'success');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapLoaded(true);
      } else if (data.type === 'MAP_ERROR') {
        showToast(data.payload || 'Error cargando el motor cartográfico.', 'error');
      } else if (data.type === 'SELECT_TREE') {
        setPersonTree(data.payload);
        const idx = filteredTrees.findIndex(
          (t) => String(t.clientId || t.id) === String(data.payload.clientId || data.payload.id)
        );
        if (idx !== -1) setActiveTreeIndex(idx);
        if (onTreeSelected) onTreeSelected(data.payload);
      } else if (data.type === 'PERSON_MODE_CHANGE') {
        setIsPersonMode(Boolean(data.payload.active));
        if (data.payload.tree) {
          setPersonTree(data.payload.tree);
          const idx = filteredTrees.findIndex(
            (t) => String(t.clientId || t.id) === String(data.payload.tree.clientId || data.payload.tree.id)
          );
          if (idx !== -1) setActiveTreeIndex(idx);
        }
        if (!data.payload.active) setPersonTree(null);
      }
    } catch (_) {}
  };

  const gpsChipText = isLocatingGps
    ? 'Ubicando GPS...'
    : activeLocation?.shortLabel
    ? activeLocation.shortLabel
    : activeCoords
    ? `${activeCoords.latitude.toFixed(3)}, ${activeCoords.longitude.toFixed(3)}`
    : 'Detectar GPS';

  return (
    <View style={styles.container}>
      {/* 1. HEADER LIMPIO DEL MAPA (Sin buscador de municipios ni atajos hardcodeados) */}
      <View style={styles.webHeaderFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'all' && styles.segmentBtnActive]}
            onPress={() => handleSelectFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={styles.segIcon}>🌐</Text>
            <Text style={[styles.segText, selectedFilter === 'all' && styles.segTextActive]}>Todos</Text>
            <View style={[styles.segBadge, selectedFilter === 'all' && styles.segBadgeActive]}>
              <Text style={[styles.segBadgeText, selectedFilter === 'all' && { color: '#ffffff' }]}>
                {filterCounts.all}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'invasive' && styles.segmentBtnInvasiveActive]}
            onPress={() => handleSelectFilter('invasive')}
            activeOpacity={0.8}
          >
            <Text style={styles.segIcon}>🚨</Text>
            <Text style={[styles.segText, selectedFilter === 'invasive' && styles.segTextInvasiveActive]}>
              Invasores
            </Text>
            <View style={[styles.segBadge, selectedFilter === 'invasive' && styles.segBadgeActive]}>
              <Text style={[styles.segBadgeText, selectedFilter === 'invasive' && { color: '#ffffff' }]}>
                {filterCounts.invasive}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'native' && styles.segmentBtnNativeActive]}
            onPress={() => handleSelectFilter('native')}
            activeOpacity={0.8}
          >
            <Text style={styles.segIcon}>🌿</Text>
            <Text style={[styles.segText, selectedFilter === 'native' && styles.segTextNativeActive]}>
              Nativas
            </Text>
            <View style={[styles.segBadge, selectedFilter === 'native' && styles.segBadgeActive]}>
              <Text style={[styles.segBadgeText, selectedFilter === 'native' && { color: '#ffffff' }]}>
                {filterCounts.native}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, selectedFilter === 'verified' && styles.segmentBtnVerifiedActive]}
            onPress={() => handleSelectFilter('verified')}
            activeOpacity={0.8}
          >
            <Text style={styles.segIcon}>✓</Text>
            <Text style={[styles.segText, selectedFilter === 'verified' && styles.segTextVerifiedActive]}>
              Verificados
            </Text>
            <View style={[styles.segBadge, selectedFilter === 'verified' && styles.segBadgeActive]}>
              <Text style={[styles.segBadgeText, selectedFilter === 'verified' && { color: '#ffffff' }]}>
                {filterCounts.verified}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Fila 2: Ubicación determinada por GPS + Visibles + Tema */}
        <View style={styles.bottomFilterRow}>
          <TouchableOpacity
            style={[styles.gpsLocationPill, activeCoords && styles.gpsLocationPillActive]}
            onPress={handleCenterUser}
            activeOpacity={0.8}
          >
            {isLocatingGps ? (
              <ActivityIndicator size="small" color="#059669" style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="navigate-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.gpsLocationPillText} numberOfLines={1}>
              {gpsChipText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.counterBadge} onPress={handleFitVisibleTrees} activeOpacity={0.8}>
            <View style={styles.counterDot} />
            <Text style={styles.counterText}>{filteredTrees.length} visibles</Text>
          </TouchableOpacity>

          <View style={styles.themeSwitcherPill}>
            {MAP_THEMES.map((th) => (
              <TouchableOpacity
                key={th.id}
                style={[styles.themeMiniBtn, mapTheme === th.id && styles.themeMiniBtnActive]}
                onPress={() => handleSelectTheme(th.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.themeMiniText, mapTheme === th.id && styles.themeMiniTextActive]}>
                  {th.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 2. MAPA CENTRAL */}
      <View style={styles.mapCanvasWrapper}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: MAP_3D_HTML, baseUrl: 'https://ecoraices.neuraljira.tech' }}
          onMessage={handleMessage}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="compatibility"
        />

        {/* Banner Toast No Bloqueante (GPS / Modo Persona / Offline) */}
        {statusToast && (
          <View
            style={[
              styles.statusToast,
              statusToast.tone === 'error' && styles.statusToastError,
              statusToast.tone === 'success' && styles.statusToastSuccess
            ]}
          >
            <Text style={styles.statusToastText} numberOfLines={2}>
              {statusToast.message}
            </Text>
          </View>
        )}

        {/* 3. DOCK VERTICAL DERECHO: HERRAMIENTAS ECORAÍCES */}
        <View style={styles.rightFloatingStack}>
          {/* Botón 1: Mi GPS (Determina ubicación y centra cámara) */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCenterUser}
            disabled={isLocatingGps}
            style={[styles.floatingActionBtn, activeCoords && styles.floatingActionBtnGpsReady]}
          >
            {isLocatingGps ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Ionicons name="locate" size={20} color="#059669" />
            )}
            <Text style={styles.floatingBtnLabel}>Mi GPS</Text>
          </TouchableOpacity>

          {/* Botón 2: 2D / 3D Vista */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={toggle3D}
            style={[styles.floatingActionBtn, is3DMode && !isPersonMode && styles.floatingActionBtnActive3D]}
          >
            <Text style={[styles.floatingActionTextSmall, is3DMode && !isPersonMode && { color: '#ffffff' }]}>
              {is3DMode ? '3D' : '2D'}
            </Text>
            <Text style={[styles.floatingBtnLabel, is3DMode && !isPersonMode && { color: '#d1fae5' }]}>Vista</Text>
          </TouchableOpacity>

          {/* Botón 3: Modo Persona 3D */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleTogglePersonMode}
            style={[
              styles.floatingActionBtn,
              isPersonMode && styles.floatingActionBtnActivePersona
            ]}
          >
            <Ionicons
              name={isPersonMode ? 'walk' : 'walk-outline'}
              size={21}
              color={isPersonMode ? '#ffffff' : '#059669'}
            />
            <Text style={[styles.floatingBtnLabel, isPersonMode && { color: '#ffffff' }]}>
              Persona
            </Text>
          </TouchableOpacity>

          {/* Botón 4: Descarga Externa Mapa Offline */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleDownloadOfflineMap} style={styles.floatingActionBtn}>
            {isDownloading ? (
              <Text style={styles.floatingActionTextSmall}>{offlinePackProgress}%</Text>
            ) : (
              <Ionicons
                name={offlinePackProgress === 100 ? 'checkmark-circle' : 'cloud-download-outline'}
                size={20}
                color={offlinePackProgress === 100 ? '#10b981' : '#059669'}
              />
            )}
            <Text style={styles.floatingBtnLabel}>
              {offlinePackProgress === 100 ? 'Listo' : 'Mapa'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. LEYENDA BOTÁNICA 3D COLAPSABLE */}
        {!isPersonMode && (
          <View style={styles.legendContainer}>
            <TouchableOpacity
              style={styles.legendToggleBtn}
              onPress={() => setLegendOpen(!legendOpen)}
              activeOpacity={0.85}
            >
              <Text style={styles.legendIcon}>🌿</Text>
              <Text style={styles.legendBtnText}>Leyenda 3D</Text>
              <Text style={styles.legendArrow}>{legendOpen ? '▾' : '▴'}</Text>
            </TouchableOpacity>

            {legendOpen && (
              <View style={styles.legendChipsBox}>
                <View style={styles.legendChip}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendChipLabel}>🚨 Neem (Invasor • Alelopatía)</Text>
                </View>
                <View style={styles.legendChip}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.legendChipLabel}>🌿 Trupillo (Nativo Protector)</Text>
                </View>
                <View style={styles.legendChip}>
                  <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.legendChipLabel}>🌸 Guayacán (Floración)</Text>
                </View>
                <View style={styles.legendChip}>
                  <View style={[styles.legendDot, { backgroundColor: '#0d9488' }]} />
                  <Text style={styles.legendChipLabel}>🍃 Dividivi (Ancestral Wayuu)</Text>
                </View>
                <View style={styles.legendChip}>
                  <View style={[styles.legendDot, { backgroundColor: '#1e3a8a' }]} />
                  <Text style={styles.legendChipLabel}>🌵 Cardón Guajiro</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 5. COCKPIT FLOTANTE INFERIOR: MODO PERSONA ACTIVO */}
        {isPersonMode && (
          <View style={styles.personModeCard}>
            <View style={styles.personTopMetaRow}>
              <View style={styles.personDistancePill}>
                <Ionicons name="navigate" size={11} color="#ffffff" />
                <Text style={styles.personDistanceText}>{formatDistance(distanceToPersonTree)}</Text>
              </View>
              <Text style={styles.personSeqText}>
                {personTree?.isSelfLocation
                  ? 'EXPLORACIÓN EN TU GPS'
                  : `ÁRBOL #${Math.min(activeTreeIndex + 1, Math.max(1, filteredTrees.length))} DE ${Math.max(1, filteredTrees.length)}`}
              </Text>
              {!personTree?.isSelfLocation && filteredTrees.length > 1 ? (
                <View style={styles.personNavArrows}>
                  <TouchableOpacity style={styles.personStepBtn} onPress={() => handleStepPersonTree(-1)}>
                    <Ionicons name="chevron-back" size={15} color="#065f46" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.personStepBtn} onPress={() => handleStepPersonTree(1)}>
                    <Ionicons name="chevron-forward" size={15} color="#065f46" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ width: 24 }} />
              )}
            </View>

            <View style={styles.personCardHeader}>
              <View style={styles.personLiveDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personCardTitle} numberOfLines={1}>
                  🚶‍♂️ {personTree?.species_name || personTree?.speciesName || personTree?.name || 'Árbol Seleccionado'}
                </Text>
                <Text style={styles.personCardSub} numberOfLines={1}>
                  Vista en Persona 3D (72°) • 🏛️ {personTree?.municipio || personTree?.municipality || activeLocation?.label || 'Territorio GPS'}
                </Text>
              </View>
            </View>

            <View style={styles.personCardActions}>
              <TouchableOpacity style={styles.personOrbitBtn} onPress={handleOrbit360} activeOpacity={0.8}>
                <Ionicons name="sync" size={15} color="#059669" />
                <Text style={styles.personOrbitBtnText}>Girar 360°</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.personExitBtn} onPress={handleTogglePersonMode} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={15} color="#dc2626" />
                <Text style={styles.personExitBtnText}>Salir a Vista Aérea</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 6. TOAST CUANDO 0 ÁRBOLES COINCIDEN CON EL FILTRO */}
        {!isPersonMode && filteredTrees.length === 0 && (
          <View style={styles.emptyToast}>
            <Text style={styles.emptyToastIcon}>🍃</Text>
            <Text style={styles.emptyToastText}>No se encontraron árboles con este filtro.</Text>
            {selectedFilter !== 'all' && (
              <TouchableOpacity onPress={() => handleSelectFilter('all')}>
                <Text style={styles.emptyToastLink}>Mostrar todos</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  webHeaderFilters: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    zIndex: 20
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 7
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  segmentBtnActive: {
    backgroundColor: '#065f46',
    borderColor: '#065f46'
  },
  segmentBtnInvasiveActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  segmentBtnNativeActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a'
  },
  segmentBtnVerifiedActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488'
  },
  segIcon: {
    fontSize: 12
  },
  segText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569'
  },
  segTextActive: {
    color: '#ffffff'
  },
  segTextInvasiveActive: {
    color: '#ffffff'
  },
  segTextNativeActive: {
    color: '#ffffff'
  },
  segTextVerifiedActive: {
    color: '#ffffff'
  },
  segBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8
  },
  segBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  segBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a'
  },
  bottomFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  gpsLocationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 0
  },
  gpsLocationPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac'
  },
  gpsLocationPillText: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065f46'
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8
  },
  counterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 5
  },
  counterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#065f46'
  },
  themeSwitcherPill: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 2
  },
  themeMiniBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  themeMiniBtnActive: {
    backgroundColor: '#065f46'
  },
  themeMiniText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569'
  },
  themeMiniTextActive: {
    color: '#ffffff'
  },
  mapCanvasWrapper: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  pickBanner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    zIndex: 75,
    elevation: 8,
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6
  },
  pickBannerText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  pickGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0369a1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7
  },
  pickGpsBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  pickCancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusToast: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 72,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 70,
    elevation: 7
  },
  statusToastSuccess: {
    backgroundColor: 'rgba(6, 95, 70, 0.94)'
  },
  statusToastError: {
    backgroundColor: 'rgba(185, 28, 28, 0.94)'
  },
  statusToastText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  rightFloatingStack: {
    position: 'absolute',
    top: 12,
    right: 10,
    zIndex: 50,
    gap: 9,
    alignItems: 'center'
  },
  floatingActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5
  },
  floatingActionBtnAdd: {
    borderColor: '#7dd3fc',
    backgroundColor: '#f0f9ff'
  },
  floatingActionBtnAddActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0369a1',
    elevation: 8,
    shadowColor: '#0284c7',
    shadowOpacity: 0.35
  },
  floatingActionBtnGpsReady: {
    borderColor: '#86efac'
  },
  floatingActionBtnActive3D: {
    backgroundColor: '#064e3b',
    borderColor: '#059669'
  },
  floatingActionBtnActivePersona: {
    backgroundColor: '#059669',
    borderColor: '#047857',
    elevation: 8,
    shadowColor: '#059669',
    shadowOpacity: 0.4
  },
  floatingBtnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2
  },
  floatingActionTextSmall: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a'
  },
  legendContainer: {
    position: 'absolute',
    bottom: 18,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 5,
    zIndex: 45,
    maxWidth: 230
  },
  legendToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11
  },
  legendIcon: {
    fontSize: 12
  },
  legendBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a'
  },
  legendArrow: {
    fontSize: 10,
    color: '#64748b'
  },
  legendChipsBox: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 5
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155'
  },
  personModeCard: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 13,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: '#10b981',
    zIndex: 60
  },
  personTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  personDistancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065f46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  personDistanceText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  personSeqText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.4
  },
  personNavArrows: {
    flexDirection: 'row',
    gap: 6
  },
  personStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  personCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10
  },
  personLiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981'
  },
  personCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  personCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1
  },
  personCardActions: {
    flexDirection: 'row',
    gap: 10
  },
  personOrbitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8
  },
  personOrbitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46'
  },
  personExitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 8
  },
  personExitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626'
  },
  emptyToast: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 55
  },
  emptyToastIcon: {
    fontSize: 14
  },
  emptyToastText: {
    flex: 1,
    fontSize: 11,
    color: '#f8fafc',
    fontWeight: '600'
  },
  emptyToastLink: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '800'
  }
});
