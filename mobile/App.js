import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  GUAJIRA_MUNICIPIOS,
  GUAJIRA_ESPECIES_NATIVAS,
  GUAJIRA_COMUNIDADES,
  ESTADOS_FITOSANITARIOS,
  CONOCE_ECORAICES,
  DEFAULT_API_BASE_URL
} from './src/constants/guajira';
import {
  calculateUserGamification,
  RANGOS_GUARDABOSQUES,
  MEDALLAS_SISTEMA
} from './src/constants/medals';
import {
  getDB,
  saveOfflineTree,
  getAllOfflineTrees,
  getOfflineStats
} from './src/services/db';
import { persistTreePhoto } from './src/services/storage';
import { syncOfflineOutbox } from './src/services/sync';
import Map3DView from './src/components/Map3DView';

// Mapeo de imágenes locales para las comunidades
const LOCAL_COMMUNITY_ASSETS = {
  'guajira-banner': require('./assets/guajira-banner.webp'),
  'guajira-paisaje': require('./assets/guajira-paisaje.webp'),
  'guajira-flora': require('./assets/guajira-flora.webp')
};

export default function App() {
  // Navigation Tabs: 'home' | 'map3d' | 'capture' | 'catalog' | 'communities' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // GPS State
  const [coords, setCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Field Capture Form State (Modo Rápido / Ráfaga en Campo)
  const [speciesName, setSpeciesName] = useState('Trupillo');
  const [municipio, setMunicipio] = useState('Riohacha');
  const [healthState, setHealthState] = useState('Sano y vigoroso');
  const [heightMeters, setHeightMeters] = useState('');
  const [diameterCm, setDiameterCm] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showOptionalBiometrics, setShowOptionalBiometrics] = useState(false);
  const [showTerritoryPicker, setShowTerritoryPicker] = useState(false);
  const [isCustomSpecies, setIsCustomSpecies] = useState(false);
  const [customSpeciesName, setCustomSpeciesName] = useState('');
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(null);

  // Outbox / Offline Sync State
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [outboxTrees, setOutboxTrees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // Catalog State (Live API + Offline Fallback)
  const [apiSpecies, setApiSpecies] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);

  // Profile & Settings State
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [userName, setUserName] = useState('Yelfran David Hernández Iguaran');
  const [userEmail, setUserEmail] = useState('yelfrandavid@gmail.com');
  const [userTerritory, setUserTerritory] = useState('Riohacha');
  const [token, setToken] = useState('');
  const [remoteTrees, setRemoteTrees] = useState([]);

  // Modal Ficha Botánica Detallada
  const [selectedSpeciesDetail, setSelectedSpeciesDetail] = useState(null);

  useEffect(() => {
    // 1. Inicializar SQLite
    getDB().then(() => {
      refreshStats();
    });

    // 2. Cargar preferencias persistidas
    AsyncStorage.getItem('ecoraices_server_url').then((val) => {
      if (val) setServerUrl(val);
    });
    AsyncStorage.getItem('ecoraices_user_territory').then((val) => {
      if (val) {
        setUserTerritory(val);
        setMunicipio(val);
      }
    });
    AsyncStorage.getItem('ecoraices_auth_token').then((val) => {
      if (val) setToken(val);
    });

    // 3. Obtener ubicación GPS al abrir
    fetchCurrentLocation(true);

    // 4. Cargar API de Especies y Observaciones
    loadLiveSpeciesCatalog();
    fetchRemoteObservations();
  }, []);

  const refreshStats = async () => {
    try {
      const s = await getOfflineStats();
      setStats(s);
      const list = await getAllOfflineTrees();
      setOutboxTrees(list);
    } catch (err) {
      console.warn('Error cargando stats:', err);
    }
  };

  // Cargar Catálogo desde la API de FastAPI
  const loadLiveSpeciesCatalog = async () => {
    setCatalogLoading(true);
    try {
      const [specRes, catRes] = await Promise.all([
        fetch(`${serverUrl}/api/species`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${serverUrl}/api/categories`).then((r) => (r.ok ? r.json() : []))
      ]);

      if (Array.isArray(specRes) && specRes.length > 0) {
        setApiSpecies(specRes);
        AsyncStorage.setItem('ecoraices_cached_species', JSON.stringify(specRes));
      } else {
        // Intentar leer caché local
        const cached = await AsyncStorage.getItem('ecoraices_cached_species');
        if (cached) setApiSpecies(JSON.parse(cached));
      }

      if (Array.isArray(catRes) && catRes.length > 0) {
        setApiCategories(catRes);
      }
    } catch (err) {
      console.log('[Catalog API] Offline o sin red, usando respaldo local');
      const cached = await AsyncStorage.getItem('ecoraices_cached_species');
      if (cached) {
        setApiSpecies(JSON.parse(cached));
      }
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchRemoteObservations = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/observations`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setRemoteTrees(data);
        }
      }
    } catch (e) {
      console.log('Modo offline / Servidor no accesible:', e.message);
    }
  };

  const fetchCurrentLocation = async (silent = false) => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para registrar coordenadas.');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });

      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude
      });
      setGpsAccuracy(location.coords.accuracy);
    } catch (err) {
      if (!silent) Alert.alert('Error GPS', 'No se pudo obtener la posición satelital: ' + err.message);
    } finally {
      setIsLocating(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para fotografiar los árboles.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error Cámara', err.message);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: false
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error Galería', err.message);
    }
  };

  const handleSaveTree = async () => {
    const finalSpecies = isCustomSpecies ? customSpeciesName.trim() : speciesName.trim();
    if (!finalSpecies) {
      Alert.alert('Falta especie', 'Selecciona o escribe el nombre de la especie.');
      return;
    }

    if (!coords) {
      Alert.alert('Buscando GPS', 'Obteniendo satélites GNSS... Espera un momento.');
      fetchCurrentLocation(false);
      return;
    }

    try {
      let localPhotoPath = null;
      if (photoUri) {
        localPhotoPath = await persistTreePhoto(photoUri);
      }

      const clientUuid = 'tree-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      const currentNumber = sessionCount + 1;

      await saveOfflineTree({
        client_uuid: clientUuid,
        species_name: finalSpecies,
        scientific_name: getScientificFor(finalSpecies),
        municipality: municipio,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: gpsAccuracy || 10,
        height_meters: parseFloat(heightMeters) || null,
        diameter_cm: parseFloat(diameterCm) || null,
        health_state: healthState,
        notes: notes.trim(),
        local_photo_path: localPhotoPath
      });

      // Incrementar contador de sesión de campo
      setSessionCount(currentNumber);

      // Mostrar banner de guardado rápido sin alerta bloqueante
      setSaveSuccessBanner(`✅ Árbol #${currentNumber} (${finalSpecies}) guardado en SQLite (+30 pts)`);
      setTimeout(() => {
        setSaveSuccessBanner(null);
      }, 4000);

      // Resetear campos para la siguiente captura inmediata en campo
      setNotes('');
      setPhotoUri(null);
      setHeightMeters('');
      setDiameterCm('');
      if (isCustomSpecies) {
        setIsCustomSpecies(false);
        setCustomSpeciesName('');
        setSpeciesName('Trupillo');
      }

      // Actualizar estadísticas y refrescar GPS en segundo plano
      refreshStats();
      fetchCurrentLocation(true);
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    }
  };

  const handleStartSync = async () => {
    if (stats.pending === 0) {
      Alert.alert('Al día', 'No hay registros pendientes de sincronizar en tu cola.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: stats.pending });

    try {
      const res = await syncOfflineOutbox({
        apiBaseUrl: serverUrl,
        token: token || null,
        onProgress: (p) => setSyncProgress(p)
      });

      Alert.alert(
        'Sincronización Exitosa',
        `Se subieron ${res.synced} árboles a Dokploy/FastAPI.${res.failed > 0 ? ` (${res.failed} con error)` : ''}`
      );
      refreshStats();
      fetchRemoteObservations();
    } catch (err) {
      Alert.alert('Error de sincronización', err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const getScientificFor = (name) => {
    const found = GUAJIRA_ESPECIES_NATIVAS.find((s) => s.name.toLowerCase() === name.toLowerCase());
    return found ? found.scientific : 'Especie nativa';
  };

  // Combinar especies locales con las de la API para catálogo
  const displaySpeciesCatalog = useMemo(() => {
    const combined = [...GUAJIRA_ESPECIES_NATIVAS];
    if (apiSpecies.length > 0) {
      apiSpecies.forEach((as) => {
        if (!combined.some((cs) => cs.name.toLowerCase() === (as.name || '').toLowerCase())) {
          combined.push({
            id: as.id || as.name,
            name: as.name,
            scientific: as.scientificName || as.scientific_name || 'Especie forestal',
            family: as.category?.name || 'Flora Guajira',
            icon: '🌱',
            tag: as.status || 'Validado',
            category: as.category?.name || 'General',
            photo: as.imageUrl || 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp',
            status: as.status || 'Registrado',
            isInvasive: (as.name || '').toLowerCase().includes('neem'),
            botanicalDescription: as.description || 'Especie botánica registrada en la plataforma EcoRaíces.',
            ecologicalValue: as.habitat || 'Conservación del bosque seco tropical de La Guajira.',
            medicinalUses: 'Uso en programas de restauración biocultural.',
            sightingsCount: as.observationsCount || 12
          });
        }
      });
    }

    return combined.filter((sp) => {
      const matchSearch = (sp.name + ' ' + sp.scientific).toLowerCase().includes(catalogSearch.toLowerCase());
      if (!matchSearch) return false;
      if (selectedCategoryFilter && sp.category !== selectedCategoryFilter) return false;
      return true;
    });
  }, [apiSpecies, catalogSearch, selectedCategoryFilter]);

  // Lista de todos los árboles para el mapa 3D
  const allMapTrees = useMemo(() => {
    return [
      ...outboxTrees.map((t) => ({
        ...t,
        name: t.species_name,
        verified: t.sync_status === 'SYNCED'
      })),
      ...remoteTrees.map((rt) => ({
        ...rt,
        species_name: rt.species?.name || rt.name || 'Árbol',
        scientific_name: rt.species?.scientificName || '',
        municipality: rt.municipality || 'La Guajira',
        verified: true
      }))
    ];
  }, [outboxTrees, remoteTrees]);

  // Cálculo de Gamificación y Medallas del usuario
  const gamification = useMemo(() => {
    return calculateUserGamification(allMapTrees, GUAJIRA_COMUNIDADES.length);
  }, [allMapTrees]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1329" />

      {/* Barra de Cabecera Superior (Estilo HUD TranspoSys Cockpit) */}
      <View style={styles.topHeader}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogoBadge}>
            <Text style={styles.headerLogoIcon}>🌳</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>EcoRaíces</Text>
            <Text style={styles.headerSubtitle}>La Guajira • {userTerritory}</Text>
          </View>
        </View>

        <View style={styles.headerRightHUD}>
          {/* Badge Nivel Gamificado */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeIcon}>{gamification.currentRank.icon}</Text>
            <Text style={styles.levelBadgeText}>Nivel {gamification.currentRank.nivel}</Text>
          </View>

          {/* Outbox Pill */}
          <TouchableOpacity
            style={[styles.outboxPill, stats.pending > 0 && styles.outboxPillActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Ionicons name="cloud-outline" size={13} color={stats.pending > 0 ? '#d97706' : '#94a3b8'} />
            <Text style={[styles.outboxPillText, stats.pending > 0 && styles.outboxPillTextActive]}>
              {stats.pending > 0 ? `${stats.pending} en cola` : 'Al día'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal según Pestaña Activa */}
      <View style={styles.contentArea}>
        {/* ============================================================== */}
        {/* 1. INICIO (PANELES 1 & 7: Hero, Métricas, Gamificación, Misión)*/}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.homeContent}>
            {/* Hero Welcome Card */}
            <View style={styles.welcomeHeroCard}>
              <View style={styles.welcomeLogoBig}>
                <Text style={{ fontSize: 32 }}>🌳</Text>
              </View>
              <Text style={styles.welcomeTitle}>¡Bienvenidos a EcoRaíces!</Text>
              <Text style={styles.welcomeDesc}>
                Plataforma de ciencia ciudadana para observar, georreferenciar y proteger la biodiversidad del Bosque Seco Tropical en La Guajira.
              </Text>

              {/* Acciones Rápidas */}
              <View style={styles.heroQuickActions}>
                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: '#15803d' }]}
                  onPress={() => setActiveTab('capture')}
                >
                  <Text style={styles.heroActionBtnText}>➕ Registrar Árbol</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => setActiveTab('map3d')}
                >
                  <Text style={styles.heroActionBtnText}>🗺️ Mapa 3D Cockpit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: '#334155' }]}
                  onPress={() => setActiveTab('communities')}
                >
                  <Text style={styles.heroActionBtnText}>👥 Comunidades</Text>
                </TouchableOpacity>
              </View>

              {/* Indicadores Clave de Desempeño (KPIs) */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiNumber}>{displaySpeciesCatalog.length}</Text>
                  <Text style={styles.kpiLabel}>Especies</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiNumber, { color: '#10b981' }]}>
                    {61 + outboxTrees.length}
                  </Text>
                  <Text style={styles.kpiLabel}>Árboles Censados</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiNumber, { color: '#38bdf8' }]}>
                    {GUAJIRA_COMUNIDADES.length}
                  </Text>
                  <Text style={styles.kpiLabel}>Comunidades</Text>
                </View>
              </View>
            </View>

            {/* BARRA DE GAMIFICACIÓN / RANGO DEL GUARDABOSQUES */}
            <View style={styles.gamificationCard}>
              <View style={styles.gamificationHeader}>
                <View style={styles.rankIconCircle}>
                  <Text style={{ fontSize: 24 }}>{gamification.currentRank.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankTitle}>{gamification.currentRank.titulo}</Text>
                  <Text style={styles.rankPointsText}>
                    {gamification.earnedPoints} pts ecológicos • {gamification.unlockedCount} de {gamification.totalMedals} medallas
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTab('profile')}>
                  <Text style={styles.seeAllMedalsLink}>Ver todo →</Text>
                </TouchableOpacity>
              </View>

              {/* Barra de Progreso XP */}
              <View style={styles.progressBarWrapper}>
                <View style={[styles.progressBarFill, { width: `${gamification.progressToNext}%` }]} />
              </View>
              <Text style={styles.progressNoteText}>
                {gamification.nextRank
                  ? `${gamification.progressToNext}% para alcanzar ${gamification.nextRank.titulo}`
                  : '¡Nivel máximo de Cacique Mayor alcanzado!'}
              </Text>

              {/* Resumen de Medallas Rápidas */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.medalsMiniScroll}>
                {gamification.medals.map((m) => (
                  <View key={m.id} style={[styles.medalMiniPill, !m.unlocked && styles.medalLocked]}>
                    <Text style={styles.medalMiniIcon}>{m.unlocked ? m.icon : '🔒'}</Text>
                    <Text style={[styles.medalMiniTitle, !m.unlocked && { color: '#94a3b8' }]}>
                      {m.title}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Ahora de Noticias & Foro Global */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>Foro de Noticias & Comunidad</Text>
              <Text style={styles.sectionTag}>Tiempo Real</Text>
            </View>

            <View style={styles.newsCard}>
              <View style={styles.newsHeader}>
                <Text style={styles.newsBadge}>🚨 Alerta Fitosanitaria</Text>
                <Text style={styles.newsDate}>Hoy</Text>
              </View>
              <Text style={styles.newsTitle}>
                Protocolo Prioritario de Control de Neem en Riohacha y Manaure
              </Text>
              <Text style={styles.newsSnippet}>
                Se convoca a las comunidades Wayuu y comités locales a georreferenciar áreas invadidas para sustitución consciente con Trupillo y Dividivi.
              </Text>
            </View>

            {/* Conoce EcoRaíces */}
            <View style={styles.conoceCard}>
              <Text style={styles.conoceTitle}>Conoce EcoRaíces</Text>
              <Text style={styles.conoceSubtitle}>
                Una iniciativa biocultural para la preservación de los bosques más resilientes del Caribe.
              </Text>

              <View style={styles.bosqueSecoCard}>
                <Text style={styles.bosqueSecoTitle}>{CONOCE_ECORAICES.bosqueSeco.titulo}</Text>
                <Text style={styles.bosqueSecoDesc}>{CONOCE_ECORAICES.bosqueSeco.descripcion}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 2. MAPA 3D CON HERRAMIENTAS TRANSPORTE MOBILE (PANEL GRANDE)    */}
        {/* ============================================================== */}
        {activeTab === 'map3d' && (
          <Map3DView
            trees={allMapTrees}
            userCoords={coords}
            onTreeSelected={(tree) => {
              Alert.alert('Árbol Seleccionado', `${tree.species_name} en ${tree.municipality}`);
            }}
          />
        )}

        {/* ============================================================== */}
        {/* 3. CAPTURA DE CAMPO RÁPIDA (MODO RÁFAGA / SECUENCIAL MINIMALISTA) */}
        {/* ============================================================== */}
        {activeTab === 'capture' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContent}>
            {/* BARRA SUPERIOR DE ESTADO EN RUTA (COMPACTA Y ERGONÓMICA) */}
            <View style={styles.fieldTopBar}>
              <TouchableOpacity
                style={[
                  styles.fieldGpsBadge,
                  gpsAccuracy && gpsAccuracy <= 10 ? styles.fieldGpsGood : styles.fieldGpsSearching
                ]}
                onPress={() => fetchCurrentLocation(false)}
                disabled={isLocating}
              >
                <Text style={styles.fieldGpsDot}>🟢</Text>
                <Text style={styles.fieldGpsText}>
                  {isLocating
                    ? 'Buscando...'
                    : coords
                    ? `±${gpsAccuracy ? gpsAccuracy.toFixed(0) : '10'}m`
                    : 'Sin GPS'}
                </Text>
                {isLocating && <ActivityIndicator size="small" color="#15803d" style={{ marginLeft: 4 }} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fieldTerritoryBtn}
                onPress={() => setShowTerritoryPicker(!showTerritoryPicker)}
              >
                <Text style={styles.fieldTerritoryText}>📍 {municipio}</Text>
                <Ionicons name={showTerritoryPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#0369a1" />
              </TouchableOpacity>

              <View style={styles.fieldSessionBadge}>
                <Text style={styles.fieldSessionText}>🌳 #{sessionCount + 1}</Text>
              </View>
            </View>

            {/* SELECTOR DESPLEGABLE DE MUNICIPIO (SOLO SI SE CAMBIA DE ZONA) */}
            {showTerritoryPicker && (
              <View style={styles.territoryPickerCard}>
                <Text style={styles.territoryPickerTitle}>Territorio de trabajo (persiste toda la salida):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muniScroll}>
                  {GUAJIRA_MUNICIPIOS.map((mun) => (
                    <TouchableOpacity
                      key={mun}
                      style={[styles.muniChip, municipio === mun && styles.muniChipActive]}
                      onPress={() => {
                        setMunicipio(mun);
                        setShowTerritoryPicker(false);
                      }}
                    >
                      <Text style={[styles.muniChipText, municipio === mun && styles.muniChipTextActive]}>
                        📍 {mun}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* BANNER DE RETROALIMENTACIÓN RÁPIDA AL GUARDAR (NO BLOQUEA LA PANTALLA) */}
            {saveSuccessBanner && (
              <View style={styles.saveSuccessBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#15803d" />
                <Text style={styles.saveSuccessBannerText}>{saveSuccessBanner}</Text>
              </View>
            )}

            <View style={styles.formCardMinimal}>
              {/* 1. FOTO RÁPIDA DEL ÁRBOL */}
              {photoUri ? (
                <View style={styles.burstPhotoPreview}>
                  <Image source={{ uri: photoUri }} style={styles.burstPhotoImage} />
                  <View style={styles.burstPhotoOverlay}>
                    <Text style={styles.burstPhotoSpeciesText}>
                      📷 Foto lista • {isCustomSpecies ? customSpeciesName || 'Especie' : speciesName}
                    </Text>
                    <TouchableOpacity
                      style={styles.burstPhotoRetakeBtn}
                      onPress={() => setPhotoUri(null)}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ffffff" />
                      <Text style={styles.burstPhotoRetakeText}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.burstPhotoRow}>
                  <TouchableOpacity style={styles.burstCameraBtn} onPress={takePhoto}>
                    <Ionicons name="camera" size={22} color="#ffffff" />
                    <Text style={styles.burstCameraBtnText}>Tomar Foto del Árbol</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.burstGalleryBtn} onPress={pickImageFromGallery}>
                    <Ionicons name="images-outline" size={18} color="#475569" />
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. GRILLA RÁPIDA DE ESPECIES (1 TAP DIRECTO) */}
              <Text style={styles.minimalSectionLabel}>Especie Observada:</Text>
              <View style={styles.speciesGridMinimal}>
                {GUAJIRA_ESPECIES_NATIVAS.slice(0, 5).map((sp) => {
                  const isSelected = !isCustomSpecies && speciesName === sp.name;
                  return (
                    <TouchableOpacity
                      key={sp.id}
                      style={[
                        styles.speciesMinimalChip,
                        isSelected && styles.speciesMinimalChipActive,
                        sp.isInvasive && styles.speciesMinimalChipInvasive
                      ]}
                      onPress={() => {
                        setIsCustomSpecies(false);
                        setSpeciesName(sp.name);
                      }}
                    >
                      <Text style={styles.speciesMinimalIcon}>{sp.icon}</Text>
                      <Text
                        style={[
                          styles.speciesMinimalName,
                          isSelected && styles.speciesMinimalNameActive
                        ]}
                        numberOfLines={1}
                      >
                        {sp.name}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedCheckDot}>
                          <Ionicons name="checkmark" size={10} color="#ffffff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Opción Otra Especie */}
                <TouchableOpacity
                  style={[
                    styles.speciesMinimalChip,
                    isCustomSpecies && styles.speciesMinimalChipActive
                  ]}
                  onPress={() => {
                    setIsCustomSpecies(true);
                  }}
                >
                  <Text style={styles.speciesMinimalIcon}>➕</Text>
                  <Text
                    style={[
                      styles.speciesMinimalName,
                      isCustomSpecies && styles.speciesMinimalNameActive
                    ]}
                  >
                    Otra...
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Input si seleccionó 'Otra...' */}
              {isCustomSpecies && (
                <View style={styles.customSpeciesInputRow}>
                  <TextInput
                    style={styles.customSpeciesInput}
                    value={customSpeciesName}
                    onChangeText={setCustomSpeciesName}
                    placeholder="Escribe el nombre de la especie..."
                    placeholderTextColor="#94a3b8"
                    autoFocus={true}
                  />
                </View>
              )}

              {/* 3. ESTADO FITOSANITARIO (1 TAP) */}
              <Text style={styles.minimalSectionLabel}>Estado de Salud:</Text>
              <View style={styles.healthRowMinimal}>
                {ESTADOS_FITOSANITARIOS.map((st) => {
                  const isSelected = healthState === st.id;
                  return (
                    <TouchableOpacity
                      key={st.id}
                      style={[
                        styles.healthPillMinimal,
                        isSelected && { backgroundColor: st.color, borderColor: st.color }
                      ]}
                      onPress={() => setHealthState(st.id)}
                    >
                      <Text
                        style={[
                          styles.healthPillTextMinimal,
                          isSelected && { color: '#ffffff', fontWeight: '800' }
                        ]}
                        numberOfLines={1}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. MEDIDAS Y NOTAS (ACORDEÓN COLAPSABLE) */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setShowOptionalBiometrics(!showOptionalBiometrics)}
              >
                <Ionicons
                  name={showOptionalBiometrics ? 'chevron-up-circle' : 'add-circle-outline'}
                  size={16}
                  color="#15803d"
                />
                <Text style={styles.accordionHeaderText}>
                  {showOptionalBiometrics
                    ? 'Ocultar Medidas y Notas'
                    : '+ Altura, Diámetro y Notas (Opcional)'}
                </Text>
                {(heightMeters || diameterCm || notes) ? (
                  <View style={styles.accordionIndicatorDot} />
                ) : null}
              </TouchableOpacity>

              {showOptionalBiometrics && (
                <View style={styles.accordionBody}>
                  <View style={styles.measureRowMinimal}>
                    <View style={styles.measureFieldMinimal}>
                      <Text style={styles.subFieldLabel}>Altura (m):</Text>
                      <TextInput
                        style={styles.measureInput}
                        value={heightMeters}
                        onChangeText={setHeightMeters}
                        keyboardType="numeric"
                        placeholder="Ej: 4.5"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={styles.measureFieldMinimal}>
                      <Text style={styles.subFieldLabel}>Diámetro (cm):</Text>
                      <TextInput
                        style={styles.measureInput}
                        value={diameterCm}
                        onChangeText={setDiameterCm}
                        keyboardType="numeric"
                        placeholder="Ej: 25"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>

                  <TextInput
                    style={styles.notesInputMinimal}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notas ecológicas (suelo, fauna, afección)..."
                    placeholderTextColor="#94a3b8"
                    multiline={true}
                  />
                </View>
              )}

              {/* 5. BOTÓN PRINCIPAL DE GUARDADO RÁPIDO */}
              <TouchableOpacity
                style={styles.burstSubmitBtn}
                onPress={handleSaveTree}
              >
                <Ionicons name="flash" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.burstSubmitBtnText}>
                  GUARDAR ÁRBOL Y SIGUIENTE (#{sessionCount + 1})
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 4. CATÁLOGO CONECTADO A API WEB + CACHÉ OFFLINE (PANEL 4 & 5)   */}
        {/* ============================================================== */}
        {activeTab === 'catalog' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.catalogContent}>
            <View style={styles.catalogHeaderCard}>
              <View style={styles.catalogTitleRow}>
                <Text style={styles.catalogTitle}>Catálogo de Especies</Text>
                {catalogLoading && <ActivityIndicator size="small" color="#15803d" />}
              </View>
              <Text style={styles.catalogSubtitle}>
                Conectado con la API de FastAPI ({displaySpeciesCatalog.length} especies cargadas con fichas botánicas).
              </Text>

              {/* Buscador de especies */}
              <View style={styles.catalogSearchInputBox}>
                <Ionicons name="search" size={16} color="#64748b" />
                <TextInput
                  style={styles.catalogSearchInput}
                  placeholder="Buscar especie por nombre o nombre científico..."
                  placeholderTextColor="#94a3b8"
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
                {catalogSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCatalogSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Cuadrícula de Especies */}
            <View style={styles.speciesGrid}>
              {displaySpeciesCatalog.map((sp) => (
                <TouchableOpacity
                  key={sp.id}
                  style={styles.speciesGridCard}
                  onPress={() => setSelectedSpeciesDetail(sp)}
                >
                  <Image source={{ uri: sp.photo }} style={styles.speciesCardImg} />
                  <View style={styles.speciesCardBody}>
                    <View style={styles.speciesBadgeRow}>
                      <Text style={[styles.speciesTagBadge, sp.isInvasive && styles.speciesTagInvasive]}>
                        {sp.tag}
                      </Text>
                    </View>
                    <Text style={styles.speciesCardTitle}>{sp.name}</Text>
                    <Text style={styles.speciesCardScientific}>{sp.scientific}</Text>
                    <Text style={styles.speciesSightings}>📍 {sp.sightingsCount} avistamientos</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 5. COMUNIDADES (IMÁGENES LOCALES SOLAMENTE - PANEL 6)          */}
        {/* ============================================================== */}
        {activeTab === 'communities' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.communitiesContent}>
            <View style={styles.communitiesHeaderCard}>
              <Text style={styles.communitiesTitle}>Comunidades de La Guajira</Text>
              <Text style={styles.communitiesSubtitle}>
                Redes locales y colectivos Wayuu que lideran la protección forestal en cada territorio.
              </Text>
            </View>

            {GUAJIRA_COMUNIDADES.map((com, index) => {
              // Asignación estricta de imágenes locales empaquetadas
              const localAssetKey = index % 3 === 0 ? 'guajira-banner' : index % 3 === 1 ? 'guajira-paisaje' : 'guajira-flora';
              const localImageSource = LOCAL_COMMUNITY_ASSETS[localAssetKey];

              return (
                <View key={com.id} style={styles.communityCard}>
                  {/* Imagen 100% Local Bundled sin depender de URLs externas */}
                  <Image source={localImageSource} style={styles.communityBanner} />
                  <View style={styles.communityBody}>
                    <View style={styles.communityLocationBadge}>
                      <Text style={styles.communityLocationText}>📍 {com.municipality} • {com.territory}</Text>
                    </View>
                    <Text style={styles.communityName}>{com.name}</Text>
                    <Text style={styles.communityDesc}>{com.description}</Text>

                    <View style={styles.communityStatsRow}>
                      <View style={styles.cStatItem}>
                        <Text style={styles.cStatNum}>{com.membersCount}</Text>
                        <Text style={styles.cStatLabel}>Miembros</Text>
                      </View>
                      <View style={styles.cStatItem}>
                        <Text style={[styles.cStatNum, { color: '#15803d' }]}>{com.treesRegistered}</Text>
                        <Text style={styles.cStatLabel}>Árboles Censados</Text>
                      </View>
                      <View style={styles.cStatItem}>
                        <Text style={styles.cStatNum}>👑</Text>
                        <Text style={styles.cStatLabel}>{com.leader.split(' ')[0]}</Text>
                      </View>
                    </View>

                    <View style={styles.communityTagsRow}>
                      {com.tags.map((tag, tIdx) => (
                        <View key={tIdx} style={styles.communityTag}>
                          <Text style={styles.communityTagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.joinCommunityBtn}
                      onPress={() => Alert.alert('Comunidad', `Te has vinculado al nodo de ${com.name}.`)}
                    >
                      <Text style={styles.joinCommunityBtnText}>Unirse a esta Comunidad</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 6. PERFIL Y SISTEMA COMPLETO DE MEDALLAS (PANEL 8)             */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.profileContent}>
            {/* Header del Perfil */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>
                  {userName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </Text>
              </View>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileEmail}>{userEmail}</Text>
              <View style={styles.profileTerritoryPill}>
                <Text style={styles.profileTerritoryText}>📍 {userTerritory}, La Guajira</Text>
              </View>
            </View>

            {/* SECCIÓN DE MEDALLAS Y LOGROS GAMIFICADOS */}
            <View style={styles.medalsFullCard}>
              <View style={styles.medalsCardHeader}>
                <Ionicons name="trophy" size={20} color="#d97706" />
                <Text style={styles.medalsCardTitle}>Sistema de Medallas & Logros</Text>
              </View>
              <Text style={styles.medalsCardSubtitle}>
                {gamification.unlockedCount} de {gamification.totalMedals} desbloqueadas • Rango: {gamification.currentRank.titulo}
              </Text>

              {/* Tarjetas de Medallas en Cuadrícula */}
              <View style={styles.medalsGrid}>
                {gamification.medals.map((m) => (
                  <View key={m.id} style={[styles.medalGridItem, !m.unlocked && styles.medalGridItemLocked]}>
                    <Text style={styles.medalGridIcon}>{m.unlocked ? m.icon : '🔒'}</Text>
                    <Text style={[styles.medalGridTitle, !m.unlocked && { color: '#94a3b8' }]}>{m.title}</Text>
                    <Text style={styles.medalGridDesc}>{m.description}</Text>
                    <View style={styles.medalPointsTag}>
                      <Text style={styles.medalPointsText}>+{m.points} pts</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Impacto Ambiental Estimado */}
            <View style={styles.ecoImpactCard}>
              <Text style={styles.ecoImpactTitle}>🌱 Tu Impacto Ambiental Acumulado</Text>
              <View style={styles.ecoImpactRow}>
                <View style={styles.ecoImpactItem}>
                  <Text style={styles.ecoImpactNum}>{gamification.environmentalImpact.co2AbsorbedKg} kg</Text>
                  <Text style={styles.ecoImpactLabel}>CO2 Estimado Fijado</Text>
                </View>
                <View style={styles.ecoImpactItem}>
                  <Text style={[styles.ecoImpactNum, { color: '#0284c7' }]}>
                    {gamification.environmentalImpact.waterProtectedLitres} L
                  </Text>
                  <Text style={styles.ecoImpactLabel}>Agua Protegida en Suelo</Text>
                </View>
              </View>
            </View>

            {/* Cola de Sincronización Outbox */}
            <View style={styles.outboxSectionCard}>
              <View style={styles.outboxHeaderRow}>
                <View>
                  <Text style={styles.outboxTitle}>Cola de Sincronización Outbox</Text>
                  <Text style={styles.outboxSubtitle}>
                    {stats.pending} pendientes • {stats.synced} subidos a Dokploy
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.syncTriggerBtn, isSyncing && styles.syncTriggerBtnDisabled]}
                  onPress={handleStartSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.syncTriggerBtnText}>⚡ Sincronizar</Text>
                  )}
                </TouchableOpacity>
              </View>

              {syncProgress && (
                <View style={styles.syncProgressContainer}>
                  <Text style={styles.syncProgressText}>
                    Subiendo {syncProgress.current} de {syncProgress.total} árboles...
                  </Text>
                </View>
              )}

              {outboxTrees.length === 0 ? (
                <View style={styles.emptyOutboxBox}>
                  <Text style={styles.emptyOutboxText}>No hay árboles pendientes en la base de datos local.</Text>
                </View>
              ) : (
                outboxTrees.slice(0, 5).map((tree) => (
                  <View key={tree.id} style={styles.treeOutboxItem}>
                    <View style={styles.treeOutboxLeft}>
                      <Text style={styles.treeOutboxName}>{tree.species_name}</Text>
                      <Text style={styles.treeOutboxDetails}>
                        📍 {tree.municipality} • Lat: {tree.latitude.toFixed(4)}, Lng: {tree.longitude.toFixed(4)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.treeStatusBadge,
                        tree.sync_status === 'SYNCED' ? styles.statusSynced : styles.statusPending
                      ]}
                    >
                      <Text
                        style={[
                          styles.treeStatusText,
                          tree.sync_status === 'SYNCED' ? styles.statusTextSynced : styles.statusTextPending
                        ]}
                      >
                        {tree.sync_status === 'SYNCED' ? '✓ Subido' : '⏳ En Cola'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Ajustes de Servidor */}
            <View style={styles.settingsSectionCard}>
              <Text style={styles.settingsTitle}>Configuración de Conexión</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>URL del Servidor Dokploy:</Text>
                <TextInput
                  style={styles.textInput}
                  value={serverUrl}
                  onChangeText={(val) => {
                    setServerUrl(val);
                    AsyncStorage.setItem('ecoraices_server_url', val);
                  }}
                  placeholder="https://ecoraices.neuraljira.tech"
                />
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modal Ficha Botánica (Panel 5 del mockup) */}
      <Modal
        visible={Boolean(selectedSpeciesDetail)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedSpeciesDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedSpeciesDetail && (
              <>
                <Image source={{ uri: selectedSpeciesDetail.photo }} style={styles.modalBannerImg} />
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedSpeciesDetail(null)}>
                  <Text style={styles.modalCloseBtnText}>✕</Text>
                </TouchableOpacity>

                <ScrollView contentContainerStyle={styles.modalBodyScroll}>
                  <View style={styles.modalHeaderInfo}>
                    <Text style={styles.modalSpeciesName}>{selectedSpeciesDetail.name}</Text>
                    <Text style={styles.modalScientific}>{selectedSpeciesDetail.scientific}</Text>
                    <View style={styles.modalBadgesRow}>
                      <View style={styles.modalBadge}>
                        <Text style={styles.modalBadgeText}>{selectedSpeciesDetail.family}</Text>
                      </View>
                      <View style={[styles.modalBadge, selectedSpeciesDetail.isInvasive && styles.modalBadgeInvasive]}>
                        <Text style={styles.modalBadgeText}>{selectedSpeciesDetail.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>📖 Descripción Botánica</Text>
                    <Text style={styles.modalSectionText}>{selectedSpeciesDetail.botanicalDescription}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🌿 Valor Ecológico en Bosque Seco</Text>
                    <Text style={styles.modalSectionText}>{selectedSpeciesDetail.ecologicalValue}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🍵 Usos Medicinales y Tradición Wayuu</Text>
                    <Text style={styles.modalSectionText}>{selectedSpeciesDetail.medicinalUses}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalRegisterActionBtn}
                    onPress={() => {
                      setSpeciesName(selectedSpeciesDetail.name);
                      setSelectedSpeciesDetail(null);
                      setActiveTab('capture');
                    }}
                  >
                    <Text style={styles.modalRegisterActionBtnText}>
                      ➕ Registrar este árbol en campo
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Barra de Navegación Inferior Cockpit */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('home')}>
          <Ionicons name="home" size={20} color={activeTab === 'home' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('map3d')}>
          <Ionicons name="map" size={20} color={activeTab === 'map3d' ? '#38bdf8' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'map3d' && { color: '#38bdf8' }]}>Mapa 3D</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtnCenter} onPress={() => setActiveTab('capture')}>
          <View style={styles.tabCenterCircle}>
            <Ionicons name="add" size={26} color="#ffffff" />
          </View>
          <Text style={[styles.tabLabel, activeTab === 'capture' && styles.tabLabelActive]}>Campo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('catalog')}>
          <Ionicons name="leaf" size={20} color={activeTab === 'catalog' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'catalog' && styles.tabLabelActive]}>Catálogo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('communities')}>
          <Ionicons name="people" size={20} color={activeTab === 'communities' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'communities' && styles.tabLabelActive]}>Comunidades</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('profile')}>
          <Ionicons name="person" size={20} color={activeTab === 'profile' ? '#10b981' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1329'
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  headerLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#132144',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e3a8a'
  },
  headerLogoIcon: {
    fontSize: 20
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#34d399',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600'
  },
  headerRightHUD: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  levelBadgeIcon: {
    fontSize: 12
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8'
  },
  outboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  outboxPillActive: {
    backgroundColor: '#451a03',
    borderColor: '#b45309'
  },
  outboxPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8'
  },
  outboxPillTextActive: {
    color: '#f59e0b'
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  scrollContainer: {
    flex: 1
  },
  homeContent: {
    padding: 16,
    paddingBottom: 32
  },
  welcomeHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2
  },
  welcomeLogoBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15803d',
    textAlign: 'center'
  },
  welcomeDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6
  },
  heroQuickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%'
  },
  heroActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  heroActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%'
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a'
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2
  },
  gamificationCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  gamificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  rankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8'
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8'
  },
  rankPointsText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1
  },
  seeAllMedalsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399'
  },
  progressBarWrapper: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 10
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34d399'
  },
  progressNoteText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4
  },
  medalsMiniScroll: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  medalMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155'
  },
  medalLocked: {
    opacity: 0.5
  },
  medalMiniIcon: {
    fontSize: 12
  },
  medalMiniTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  newsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  newsBadge: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  newsDate: {
    fontSize: 10,
    color: '#94a3b8'
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18
  },
  newsSnippet: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16
  },
  conoceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  conoceTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
    textAlign: 'center'
  },
  conoceSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14
  },
  bosqueSecoCard: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 14
  },
  bosqueSecoTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4
  },
  bosqueSecoDesc: {
    fontSize: 11,
    color: '#bbf7d0',
    lineHeight: 15
  },
  formContent: {
    padding: 16,
    paddingBottom: 40
  },
  // ==============================================================
  // ESTILOS DE CAPTURA RÁPIDA / RÁFAGA EN CAMPO (MINIMALISTA)
  // ==============================================================
  fieldTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  fieldGpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1
  },
  fieldGpsGood: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac'
  },
  fieldGpsSearching: {
    backgroundColor: '#fefce8',
    borderColor: '#fde047'
  },
  fieldGpsDot: {
    fontSize: 9,
    marginRight: 4
  },
  fieldGpsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534'
  },
  fieldTerritoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bae6fd'
  },
  fieldTerritoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369a1'
  },
  fieldSessionBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20
  },
  fieldSessionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8'
  },
  territoryPickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  territoryPickerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8
  },
  saveSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  saveSuccessBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    flex: 1
  },
  formCardMinimal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  burstPhotoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  burstCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2
  },
  burstCameraBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900'
  },
  burstGalleryBtn: {
    width: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  burstPhotoPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    height: 140
  },
  burstPhotoImage: {
    width: '100%',
    height: '100%'
  },
  burstPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  burstPhotoSpeciesText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  burstPhotoRetakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  burstPhotoRetakeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800'
  },
  minimalSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    marginTop: 4
  },
  speciesGridMinimal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  speciesMinimalChip: {
    width: '31%',
    minWidth: 95,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative'
  },
  speciesMinimalChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#15803d'
  },
  speciesMinimalChipInvasive: {
    borderColor: '#fca5a5'
  },
  speciesMinimalIcon: {
    fontSize: 16
  },
  speciesMinimalName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    flex: 1
  },
  speciesMinimalNameActive: {
    color: '#15803d',
    fontWeight: '900'
  },
  selectedCheckDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center'
  },
  customSpeciesInputRow: {
    marginBottom: 10
  },
  customSpeciesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#15803d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a'
  },
  healthRowMinimal: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12
  },
  healthPillMinimal: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  healthPillTextMinimal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569'
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  accordionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d'
  },
  accordionIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    marginLeft: 4
  },
  accordionBody: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  measureRowMinimal: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8
  },
  measureFieldMinimal: {
    flex: 1
  },
  subFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4
  },
  measureInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a'
  },
  notesInputMinimal: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#0f172a',
    height: 50,
    textAlignVertical: 'top'
  },
  burstSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    elevation: 3
  },
  burstSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  // ESTILOS COMPARTIDOS
  muniScroll: {
    flexDirection: 'row',
    gap: 6
  },
  muniChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  muniChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7'
  },
  muniChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  muniChipTextActive: {
    color: '#ffffff'
  },
  catalogContent: {
    padding: 16,
    paddingBottom: 40
  },
  catalogHeaderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  catalogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  catalogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d'
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  catalogSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10
  },
  catalogSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a'
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  speciesGridCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2
  },
  speciesCardImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#e2e8f0'
  },
  speciesCardBody: {
    padding: 10
  },
  speciesBadgeRow: {
    marginBottom: 4
  },
  speciesTagBadge: {
    fontSize: 8,
    fontWeight: '800',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  speciesTagInvasive: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c'
  },
  speciesCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a'
  },
  speciesCardScientific: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 1
  },
  speciesSightings: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0284c7',
    marginTop: 6
  },
  communitiesContent: {
    padding: 16,
    paddingBottom: 40
  },
  communitiesHeaderCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  communitiesTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  communitiesSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  communityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    elevation: 2
  },
  communityBanner: {
    width: '100%',
    height: 130,
    backgroundColor: '#cbd5e1'
  },
  communityBody: {
    padding: 14
  },
  communityLocationBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  communityLocationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1'
  },
  communityName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a'
  },
  communityDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginTop: 4
  },
  communityStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8
  },
  cStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  cStatNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  cStatLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2
  },
  communityTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  communityTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  communityTagText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600'
  },
  joinCommunityBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinCommunityBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  },
  profileContent: {
    padding: 16,
    paddingBottom: 40
  },
  profileHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#86efac',
    marginBottom: 10
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15803d'
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  profileTerritoryPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 8
  },
  profileTerritoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1'
  },
  medalsFullCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  medalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  medalsCardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a'
  },
  medalsCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12
  },
  medalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  medalGridItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  medalGridItemLocked: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9'
  },
  medalGridIcon: {
    fontSize: 22,
    marginBottom: 4
  },
  medalGridTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a'
  },
  medalGridDesc: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 12,
    marginTop: 2
  },
  medalPointsTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6
  },
  medalPointsText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#15803d'
  },
  ecoImpactCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14
  },
  ecoImpactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
    marginBottom: 8
  },
  ecoImpactRow: {
    flexDirection: 'row',
    gap: 10
  },
  ecoImpactItem: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8
  },
  ecoImpactNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#34d399'
  },
  ecoImpactLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2
  },
  outboxSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14
  },
  outboxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  outboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a'
  },
  outboxSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  syncTriggerBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  syncTriggerBtnDisabled: {
    opacity: 0.6
  },
  syncTriggerBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800'
  },
  syncProgressContainer: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10
  },
  syncProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    textAlign: 'center'
  },
  emptyOutboxBox: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  emptyOutboxText: {
    fontSize: 11,
    color: '#94a3b8'
  },
  treeOutboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  treeOutboxLeft: {
    flex: 1
  },
  treeOutboxName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a'
  },
  treeOutboxDetails: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1
  },
  treeStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusPending: {
    backgroundColor: '#fef3c7'
  },
  statusSynced: {
    backgroundColor: '#dcfce7'
  },
  treeStatusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  statusTextPending: {
    color: '#b45309'
  },
  statusTextSynced: {
    color: '#15803d'
  },
  settingsSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden'
  },
  modalBannerImg: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0'
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  modalBodyScroll: {
    padding: 16,
    paddingBottom: 40
  },
  modalHeaderInfo: {
    marginBottom: 14
  },
  modalSpeciesName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a'
  },
  modalScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2
  },
  modalBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  modalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  modalBadgeInvasive: {
    backgroundColor: '#fee2e2'
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569'
  },
  modalSection: {
    marginBottom: 12
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 4
  },
  modalSectionText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18
  },
  modalRegisterActionBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  modalRegisterActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  bottomTabBar: {
    height: 62,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingBottom: Platform.OS === 'ios' ? 12 : 6,
    paddingTop: 6
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBtnCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16
  },
  tabCenterCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2
  },
  tabLabelActive: {
    color: '#10b981'
  }
});
