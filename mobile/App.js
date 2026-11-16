import React, { useState, useEffect, useRef } from 'react';
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

import {
  GUAJIRA_MUNICIPIOS,
  GUAJIRA_ESPECIES_NATIVAS,
  GUAJIRA_COMUNIDADES,
  ESTADOS_FITOSANITARIOS,
  CONOCE_ECORAICES,
  DEFAULT_API_BASE_URL
} from './src/constants/guajira';
import {
  getDB,
  saveOfflineTree,
  getAllOfflineTrees,
  getOfflineStats,
  deleteOfflineTree
} from './src/services/db';
import { persistTreePhoto } from './src/services/storage';
import { syncOfflineOutbox } from './src/services/sync';
import Map3DView from './src/components/Map3DView';

export default function App() {
  // Navigation Tabs: 'home' | 'map3d' | 'capture' | 'catalog' | 'communities' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // GPS State
  const [coords, setCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Field Capture Form State
  const [speciesName, setSpeciesName] = useState('Trupillo');
  const [municipio, setMunicipio] = useState('Riohacha');
  const [healthState, setHealthState] = useState('Sano y vigoroso');
  const [heightMeters, setHeightMeters] = useState('4.5');
  const [diameterCm, setDiameterCm] = useState('25');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  // Outbox / Offline Sync State
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [outboxTrees, setOutboxTrees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // Profile & Settings State
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [userName, setUserName] = useState('Yelfran David Hernández Iguaran');
  const [userEmail, setUserEmail] = useState('yelfrandavid@gmail.com');
  const [userTerritory, setUserTerritory] = useState('Riohacha');
  const [token, setToken] = useState('');
  const [remoteTrees, setRemoteTrees] = useState([]);

  // Modal Ficha Botánica Detallada (Panel 5 del mockup)
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
    AsyncStorage.getItem('ecoraices_user_name').then((val) => {
      if (val) setUserName(val);
    });

    // 3. Obtener ubicación GPS al abrir
    fetchCurrentLocation(true);

    // 4. Intentar precargar observaciones remotas
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
    if (!speciesName.trim()) {
      Alert.alert('Falta especie', 'Indica el nombre de la especie.');
      return;
    }

    if (!coords) {
      Alert.alert('Sin GPS', 'Presiona "Actualizar GPS" para georreferenciar el árbol.');
      return;
    }

    try {
      let localPhotoPath = null;
      if (photoUri) {
        localPhotoPath = await persistTreePhoto(photoUri);
      }

      const clientUuid = 'tree-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

      await saveOfflineTree({
        client_uuid: clientUuid,
        species_name: speciesName,
        scientific_name: getScientificFor(speciesName),
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

      Alert.alert(
        '🌳 Guardado Offline',
        `El árbol "${speciesName}" se guardó en la base de datos interna SQLite. No se perderá aunque estés sin señal.`,
        [{ text: 'Entendido' }]
      );

      // Limpiar formulario para la siguiente captura
      setNotes('');
      setPhotoUri(null);
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
        'Sincronización Completada',
        `Se subieron exitosamente ${res.synced} árboles a Dokploy/FastAPI.${res.failed > 0 ? ` (${res.failed} con error)` : ''}`
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

  // Combinar árboles locales con remotos para el mapa 3D
  const allMapTrees = [
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Barra de Cabecera Superior EcoRaíces */}
      <View style={styles.topHeader}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogoBadge}>
            <Text style={styles.headerLogoIcon}>🌳</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>EcoRaíces</Text>
            <Text style={styles.headerSubtitle}>La Guajira • Ciencia Ciudadana</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.outboxPill, stats.pending > 0 && styles.outboxPillActive]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={styles.outboxPillIcon}>☁️</Text>
            <Text style={[styles.outboxPillText, stats.pending > 0 && styles.outboxPillTextActive]}>
              {stats.pending > 0 ? `${stats.pending} en cola` : 'Al día'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido Principal según Pestaña Activa */}
      <View style={styles.contentArea}>
        {/* ============================================================== */}
        {/* 1. INICIO (PANELES 1 & 7: Hero, Métricas, Noticias y Misión)    */}
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
                  <Text style={styles.heroActionBtnText}>🗺️ Explorar Mapa 3D</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: '#475569' }]}
                  onPress={() => setActiveTab('communities')}
                >
                  <Text style={styles.heroActionBtnText}>👥 Comunidades</Text>
                </TouchableOpacity>
              </View>

              {/* Indicadores Clave de Desempeño (KPIs) */}
              <View style={styles.kpiRow}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiNumber}>{GUAJIRA_ESPECIES_NATIVAS.length}</Text>
                  <Text style={styles.kpiLabel}>Especies</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiNumber, { color: '#15803d' }]}>
                    {61 + outboxTrees.length}
                  </Text>
                  <Text style={styles.kpiLabel}>Árboles Registrados</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={[styles.kpiNumber, { color: '#0284c7' }]}>
                    {GUAJIRA_COMUNIDADES.length}
                  </Text>
                  <Text style={styles.kpiLabel}>Comunidades</Text>
                </View>
              </View>
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

            <View style={styles.newsCard}>
              <View style={styles.newsHeader}>
                <Text style={[styles.newsBadge, { backgroundColor: '#dcfce7', color: '#15803d' }]}>
                  🌿 Floración Macuira
                </Text>
                <Text style={styles.newsDate}>Hace 2 días</Text>
              </View>
              <Text style={styles.newsTitle}>
                Avistamiento récord de Guayacán en floración en Serranía de la Macuira
              </Text>
              <Text style={styles.newsSnippet}>
                Las lluvias de transición activaron los polinizadores nativos en la Alta Guajira. 14 nuevos ejemplares censados con éxito.
              </Text>
            </View>

            {/* Panel Conoce EcoRaíces (Panel 7) */}
            <View style={styles.conoceCard}>
              <Text style={styles.conoceTitle}>Conoce EcoRaíces</Text>
              <Text style={styles.conoceSubtitle}>
                Una iniciativa biocultural para la preservación de los bosques más resilientes del Caribe.
              </Text>

              <View style={styles.misionVisionGrid}>
                <View style={styles.mvBox}>
                  <Text style={styles.mvHeading}>Nuestra Misión</Text>
                  <Text style={styles.mvText}>{CONOCE_ECORAICES.mision}</Text>
                </View>
                <View style={styles.mvBox}>
                  <Text style={styles.mvHeading}>Nuestra Visión</Text>
                  <Text style={styles.mvText}>{CONOCE_ECORAICES.vision}</Text>
                </View>
              </View>

              {/* Banner Bosque Seco Tropical */}
              <View style={styles.bosqueSecoCard}>
                <Text style={styles.bosqueSecoTitle}>{CONOCE_ECORAICES.bosqueSeco.titulo}</Text>
                <Text style={styles.bosqueSecoDesc}>{CONOCE_ECORAICES.bosqueSeco.descripcion}</Text>
                {CONOCE_ECORAICES.bosqueSeco.puntos.map((pt, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>🌱</Text>
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                ))}
              </View>

              {/* Pilares Técnicos */}
              <Text style={styles.pilaresHeading}>Nuestros Pilares Técnicos</Text>
              <View style={styles.pilaresGrid}>
                {CONOCE_ECORAICES.pilares.map((pil, idx) => (
                  <View key={idx} style={styles.pilarCard}>
                    <Text style={styles.pilarIcon}>{pil.icon}</Text>
                    <Text style={styles.pilarTitle}>{pil.title}</Text>
                    <Text style={styles.pilarDesc}>{pil.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 2. MAPA 3D (PANEL GRANDE: Edificios 3D, Isometría, Filtros)     */}
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
        {/* 3. CAPTURA DE CAMPO (PANEL 3: GPS Satelital, Foto, SQLite)     */}
        {/* ============================================================== */}
        {activeTab === 'capture' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContent}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Formulario de Registro de Especies</Text>
              <Text style={styles.formSubtitle}>
                Captura en campo 100% offline. Guarda en memoria interna y sincroniza cuando tengas señal.
              </Text>

              {/* GPS Satelital Status Box */}
              <View style={styles.gpsCard}>
                <View style={styles.gpsRow}>
                  <Text style={styles.gpsIcon}>🛰️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gpsTitle}>Ubicación Satelital (GNSS)</Text>
                    <Text style={styles.gpsCoordsText}>
                      {coords
                        ? `Lat: ${coords.latitude.toFixed(6)} | Lng: ${coords.longitude.toFixed(6)}`
                        : 'Obteniendo coordenadas del hardware...'}
                    </Text>
                    {gpsAccuracy && (
                      <Text style={styles.gpsAccuracyText}>
                        Precisión: ±{gpsAccuracy.toFixed(1)} metros {gpsAccuracy <= 10 ? '🎯 Excelente' : '🟡 Aceptable'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.refreshGpsBtn}
                    onPress={() => fetchCurrentLocation(false)}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#15803d" />
                    ) : (
                      <Text style={styles.refreshGpsBtnText}>🔄 Actualizar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Acceso Rápido a Especies Nativas Guajiras */}
              <Text style={styles.fieldLabel}>Selecciona Especie Nativa:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.speciesChipsRow}>
                {GUAJIRA_ESPECIES_NATIVAS.map((sp) => {
                  const isSelected = speciesName === sp.name;
                  return (
                    <TouchableOpacity
                      key={sp.id}
                      style={[
                        styles.speciesChip,
                        isSelected && styles.speciesChipActive,
                        sp.isInvasive && styles.speciesChipInvasive
                      ]}
                      onPress={() => setSpeciesName(sp.name)}
                    >
                      <Text style={styles.speciesChipIcon}>{sp.icon}</Text>
                      <View>
                        <Text style={[styles.speciesChipName, isSelected && styles.speciesChipNameActive]}>
                          {sp.name}
                        </Text>
                        <Text style={styles.speciesChipTag}>{sp.tag}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Nombre de la especie manual si se requiere */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Nombre de la especie:</Text>
                <TextInput
                  style={styles.textInput}
                  value={speciesName}
                  onChangeText={setSpeciesName}
                  placeholder="Ej: Trupillo, Dividivi, Neem..."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Municipio de La Guajira */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Municipio / Territorio:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muniScroll}>
                  {GUAJIRA_MUNICIPIOS.map((mun) => (
                    <TouchableOpacity
                      key={mun}
                      style={[styles.muniChip, municipio === mun && styles.muniChipActive]}
                      onPress={() => setMunicipio(mun)}
                    >
                      <Text style={[styles.muniChipText, municipio === mun && styles.muniChipTextActive]}>
                        📍 {mun}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Estado Fitosanitario */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Estado de Salud:</Text>
                <View style={styles.healthGrid}>
                  {ESTADOS_FITOSANITARIOS.map((st) => (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.healthBtn, healthState === st.id && { borderColor: st.color, backgroundColor: '#f0fdf4' }]}
                      onPress={() => setHealthState(st.id)}
                    >
                      <Text style={styles.healthBtnText}>{st.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Medidas (Altura y Diámetro) */}
              <View style={styles.measureRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Altura est. (m):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={heightMeters}
                    onChangeText={setHeightMeters}
                    keyboardType="numeric"
                    placeholder="Ej: 4.5"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Diámetro (cm):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={diameterCm}
                    onChangeText={setDiameterCm}
                    keyboardType="numeric"
                    placeholder="Ej: 30"
                  />
                </View>
              </View>

              {/* Captura de Fotografía */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Fotografía en Campo:</Text>
                {photoUri ? (
                  <View style={styles.photoPreviewBox}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                      <Text style={styles.removePhotoBtnText}>✕ Cambiar foto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity style={styles.photoActionBtn} onPress={takePhoto}>
                      <Text style={styles.photoActionIcon}>📷</Text>
                      <Text style={styles.photoActionText}>Tomar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#f1f5f9' }]} onPress={pickImageFromGallery}>
                      <Text style={styles.photoActionIcon}>🖼️</Text>
                      <Text style={[styles.photoActionText, { color: '#475569' }]}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Notas de Campo */}
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Notas u observaciones ecológicas:</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline={true}
                  placeholder="Ej: Copa en floración, nidos de pájaros, suelo pedregoso..."
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Botón Principal Guardar Registro */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveTree}>
                <Text style={styles.submitBtnText}>💾 Guardar Registro (Offline)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 4. CATÁLOGO DE ESPECIES (PANELES 4 & 5: Cuadrícula & Ficha)     */}
        {/* ============================================================== */}
        {activeTab === 'catalog' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.catalogContent}>
            <View style={styles.catalogHeaderCard}>
              <Text style={styles.catalogTitle}>Catálogo de Especies Nativas</Text>
              <Text style={styles.catalogSubtitle}>
                Biodiversidad del bosque seco, especies xerofíticas y fichas botánicas detalladas de La Guajira.
              </Text>
            </View>

            {/* Cuadrícula de Especies (Panel 4) */}
            <View style={styles.speciesGrid}>
              {GUAJIRA_ESPECIES_NATIVAS.map((sp) => (
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
        {/* 5. COMUNIDADES (PANEL 6: Banners Guajiros, Miembros, Proyectos) */}
        {/* ============================================================== */}
        {activeTab === 'communities' && (
          <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.communitiesContent}>
            <View style={styles.communitiesHeaderCard}>
              <Text style={styles.communitiesTitle}>Comunidades de La Guajira</Text>
              <Text style={styles.communitiesSubtitle}>
                Redes locales y colectivos Wayuu que lideran la protección forestal en cada municipio.
              </Text>
            </View>

            {GUAJIRA_COMUNIDADES.map((com) => (
              <View key={com.id} style={styles.communityCard}>
                <Image source={{ uri: com.banner }} style={styles.communityBanner} />
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
            ))}
          </ScrollView>
        )}

        {/* ============================================================== */}
        {/* 6. PERFIL (PANEL 8: Usuario, Territorio, Cola Outbox & Dokploy) */}
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

            {/* Cola de Sincronización Outbox */}
            <View style={styles.outboxSectionCard}>
              <View style={styles.outboxHeaderRow}>
                <View>
                  <Text style={styles.outboxTitle}>Cola de Sincronización Outbox</Text>
                  <Text style={styles.outboxSubtitle}>
                    {stats.pending} pendientes • {stats.synced} sincronizados en Dokploy
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

              {/* Lista de Registros Locales */}
              {outboxTrees.length === 0 ? (
                <View style={styles.emptyOutboxBox}>
                  <Text style={styles.emptyOutboxText}>No hay árboles guardados en la base de datos local.</Text>
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

            {/* Ajustes de Servidor Dokploy */}
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

              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Territorio Base:</Text>
                <TextInput
                  style={styles.textInput}
                  value={userTerritory}
                  onChangeText={(val) => {
                    setUserTerritory(val);
                    AsyncStorage.setItem('ecoraices_user_territory', val);
                  }}
                  placeholder="Riohacha"
                />
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modal Ficha Botánica 3D (Panel 5 del mockup) */}
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

      {/* Barra de Navegación Inferior (Tabs Idénticos al Mockup) */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('map3d')}>
          <Text style={[styles.tabIcon, activeTab === 'map3d' && styles.tabIconActive]}>🗺️</Text>
          <Text style={[styles.tabLabel, activeTab === 'map3d' && styles.tabLabelActive]}>Mapa 3D</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtnCenter} onPress={() => setActiveTab('capture')}>
          <View style={styles.tabCenterCircle}>
            <Text style={styles.tabCenterIcon}>➕</Text>
          </View>
          <Text style={[styles.tabLabel, activeTab === 'capture' && styles.tabLabelActive]}>Campo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('catalog')}>
          <Text style={[styles.tabIcon, activeTab === 'catalog' && styles.tabIconActive]}>🌿</Text>
          <Text style={[styles.tabLabel, activeTab === 'catalog' && styles.tabLabelActive]}>Catálogo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('communities')}>
          <Text style={[styles.tabIcon, activeTab === 'communities' && styles.tabIconActive]}>👥</Text>
          <Text style={[styles.tabLabel, activeTab === 'communities' && styles.tabLabelActive]}>Comunidades</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  topHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
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
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerLogoIcon: {
    fontSize: 20
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  outboxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999
  },
  outboxPillActive: {
    backgroundColor: '#fef3c7'
  },
  outboxPillIcon: {
    fontSize: 12
  },
  outboxPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b'
  },
  outboxPillTextActive: {
    color: '#b45309'
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
  misionVisionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  mvBox: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  mvHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4
  },
  mvText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15
  },
  bosqueSecoCard: {
    backgroundColor: '#14532d',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14
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
    lineHeight: 15,
    marginBottom: 8
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4
  },
  bulletDot: {
    fontSize: 12
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    color: '#f0fdf4',
    lineHeight: 15
  },
  pilaresHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8
  },
  pilaresGrid: {
    gap: 8
  },
  pilarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  pilarIcon: {
    fontSize: 20
  },
  pilarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  pilarDesc: {
    fontSize: 10,
    color: '#64748b'
  },
  formContent: {
    padding: 16,
    paddingBottom: 40
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a'
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14
  },
  gpsCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    marginBottom: 14
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  gpsIcon: {
    fontSize: 22
  },
  gpsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534'
  },
  gpsCoordsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0f172a',
    marginTop: 2
  },
  gpsAccuracyText: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: '700',
    marginTop: 2
  },
  refreshGpsBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac'
  },
  refreshGpsBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d'
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6
  },
  speciesChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  speciesChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#15803d'
  },
  speciesChipInvasive: {
    borderColor: '#fca5a5'
  },
  speciesChipIcon: {
    fontSize: 18
  },
  speciesChipName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a'
  },
  speciesChipNameActive: {
    color: '#15803d'
  },
  speciesChipTag: {
    fontSize: 9,
    color: '#64748b'
  },
  inputGroup: {
    marginBottom: 12
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a'
  },
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
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  healthBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center'
  },
  healthBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155'
  },
  measureRow: {
    flexDirection: 'row',
    gap: 10
  },
  photoPreviewBox: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10
  },
  removePhotoBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  removePhotoBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac'
  },
  photoActionIcon: {
    fontSize: 18
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d'
  },
  submitBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900'
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
    height: 120,
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
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
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
    marginTop: -14
  },
  tabCenterCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#15803d',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4
  },
  tabCenterIcon: {
    fontSize: 20,
    color: '#ffffff'
  },
  tabIcon: {
    fontSize: 18,
    color: '#94a3b8'
  },
  tabIconActive: {
    color: '#15803d'
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2
  },
  tabLabelActive: {
    color: '#15803d'
  }
});
