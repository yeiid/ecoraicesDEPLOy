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
  COLOMBIA_TERRITORIOS,
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
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import ProfileScreen from './src/screens/ProfileScreen';
import CaptureScreen from './src/screens/CaptureScreen';
import HomeScreen from './src/screens/HomeScreen';
import AboutScreen from './src/screens/AboutScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import CommunitiesScreen from './src/screens/CommunitiesScreen';
import TerritoryModal from './src/components/TerritoryModal';
import { colors } from './src/theme';

// Mapeo de imágenes locales para las comunidades
const LOCAL_COMMUNITY_ASSETS = {
  'guajira-banner': require('./assets/guajira-banner.webp'),
  'guajira-paisaje': require('./assets/guajira-paisaje.webp'),
  'guajira-flora': require('./assets/guajira-flora.webp')
};

const HEALTH_CHIPS = [
  { id: 'Sano y vigoroso', label: '🌳 Sano' },
  { id: 'Con floración o frutos', label: '🌸 Flores/Fruto' },
  { id: 'Dañado o talado', label: '🪓 Dañado' },
  { id: 'Seco o con plaga', label: '🍂 Seco/Plaga' }
];

export default function App() {
  // Navigation Tabs: 'home' | 'map3d' | 'capture' | 'catalog' | 'communities' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // GPS State
  const [coords, setCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Field Capture Form State (Fiel a NewObservationForm Web)
  const [speciesName, setSpeciesName] = useState('');
  const [municipio, setMunicipio] = useState('Riohacha');
  const [healthState, setHealthState] = useState('Sano y vigoroso');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [extraOptionsOpen, setExtraOptionsOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(null);
  const [saveErrorBanner, setSaveErrorBanner] = useState(null);

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
  const [userUsername, setUserUsername] = useState('yelfrandavid');
  const [userRole, setUserRole] = useState('Guardabosques Comunitario');
  const [userTerritory, setUserTerritory] = useState('Riohacha');
  const [userBio, setUserBio] = useState('Comprometido con la reforestación y conservación del Bosque Seco Tropical en La Guajira.');
  const [token, setToken] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [remoteTrees, setRemoteTrees] = useState([]);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [territorySearch, setTerritorySearch] = useState('');
  const [profileSaveBanner, setProfileSaveBanner] = useState(null);
  const [profileSubTab, setProfileSubTab] = useState('datos'); // 'datos' | 'arboles' | 'medallas' | 'outbox'

  // Estados de Autenticación con Dokploy (Login / Registro)
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authRemember, setAuthRemember] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

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
    AsyncStorage.getItem('ecoraices_user_name').then((val) => {
      if (val) setUserName(val);
    });
    AsyncStorage.getItem('ecoraices_user_email').then((val) => {
      if (val) setUserEmail(val);
    });
    AsyncStorage.getItem('ecoraices_user_username').then((val) => {
      if (val) setUserUsername(val);
    });
    AsyncStorage.getItem('ecoraices_user_role').then((val) => {
      if (val) setUserRole(val);
    });
    AsyncStorage.getItem('ecoraices_user_bio').then((val) => {
      if (val) setUserBio(val);
    });
    AsyncStorage.getItem('ecoraices_user_territory').then((val) => {
      if (val) {
        setUserTerritory(val);
        setMunicipio(val);
      }
    });
    AsyncStorage.getItem('ecoraices_auth_token').then((val) => {
      if (val) {
        setToken(val);
        fetchRemoteProfile(val);
      }
    });

    // 3. Obtener ubicación GPS al abrir
    fetchCurrentLocation(true);

    // 4. Cargar API de Especies y Observaciones
    loadLiveSpeciesCatalog();
    fetchRemoteObservations();
  }, []);

  const fetchRemoteProfile = async (authToken = token) => {
    if (!authToken) return;
    try {
      const response = await fetch(`${serverUrl}/api/users/me/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.profile) {
          const p = data.profile;
          if (p.name) setUserName(p.name);
          if (p.email) setUserEmail(p.email);
          if (p.username) setUserUsername(p.username);
          if (p.bio) setUserBio(p.bio);
          if (p.location) {
            setUserTerritory(p.location);
            setMunicipio(p.location);
          }
          if (p.role) setUserRole(p.role);

          await AsyncStorage.multiSet([
            ['ecoraices_user_name', p.name || ''],
            ['ecoraices_user_email', p.email || ''],
            ['ecoraices_user_username', p.username || ''],
            ['ecoraices_user_bio', p.bio || ''],
            ['ecoraices_user_territory', p.location || ''],
            ['ecoraices_user_role', p.role || '']
          ]);
        }
      }
    } catch (err) {
      console.log('Modo offline / Perfil remoto no accesible:', err.message);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    const cleanUrl = (serverUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${cleanUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus({
          ok: true,
          latency,
          server: cleanUrl.replace(/^https?:\/\//, ''),
          message: data.message || 'FastAPI backend en línea'
        });
      } else {
        setConnectionStatus({
          ok: false,
          latency,
          error: `El servidor respondió con código HTTP ${res.status}`
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setConnectionStatus({
        ok: false,
        error: err.name === 'AbortError'
          ? 'Tiempo de espera agotado (8s). Servidor no responde.'
          : 'No se pudo conectar al servidor. Revisa tu internet o la URL.'
      });
    }
  };

  const handleLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }
    setIsAuthLoading(true);
    const cleanUrl = (serverUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${cleanUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          remember: authRemember
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = Array.isArray(data.detail)
          ? data.detail[0]?.msg || 'Error de validación en credenciales.'
          : (data.detail || data.message || 'Error en las credenciales.');
        throw new Error(errorMsg);
      }

      if (data.token) {
        setToken(data.token);
        setIsGuestMode(false);
        await AsyncStorage.setItem('ecoraices_auth_token', data.token);

        if (data.user) {
          const u = data.user;
          if (u.name) setUserName(u.name);
          if (u.email) setUserEmail(u.email);
          if (u.username) setUserUsername(u.username);
          if (u.role) setUserRole(u.role);
          if (u.location) {
            setUserTerritory(u.location);
            setMunicipio(u.location);
          }
          await AsyncStorage.multiSet([
            ['ecoraices_user_name', u.name || ''],
            ['ecoraices_user_email', u.email || ''],
            ['ecoraices_user_username', u.username || ''],
            ['ecoraices_user_role', u.role || '']
          ]);
        }

        setAuthPassword('');
        setAuthSuccess('¡Sesión iniciada exitosamente!');
        fetchRemoteProfile(data.token);
        fetchRemoteObservations();
      } else {
        throw new Error('No se recibió el token de autenticación.');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setAuthError('Tiempo de espera agotado (12s). El servidor Dokploy tardó demasiado en responder.');
      } else if (err.message && err.message.includes('Network request failed')) {
        setAuthError(`No se pudo conectar a ${cleanUrl.replace(/^https?:\/\//, '')}. Verifica tu conexión a internet o el estado del servidor.`);
      } else {
        setAuthError(err.message || 'Error de conexión con el servidor Dokploy.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!authUsername.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError('Nombre de usuario, correo y contraseña son obligatorios.');
      return;
    }
    if (authPassword.length < 8) {
      setAuthError('La contraseña debe tener un mínimo de 8 caracteres.');
      return;
    }
    setIsAuthLoading(true);
    const cleanUrl = (serverUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${cleanUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername.trim(),
          email: authEmail.trim(),
          password: authPassword,
          name: authName.trim() || authUsername.trim()
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = Array.isArray(data.detail)
          ? data.detail[0]?.msg || 'Error de validación al registrarte.'
          : (data.detail || data.message || 'No se pudo crear la cuenta.');
        throw new Error(errorMsg);
      }

      if (data.token) {
        setToken(data.token);
        setIsGuestMode(false);
        await AsyncStorage.setItem('ecoraices_auth_token', data.token);

        if (data.user) {
          const u = data.user;
          if (u.name) setUserName(u.name);
          if (u.email) setUserEmail(u.email);
          if (u.username) setUserUsername(u.username);
          await AsyncStorage.multiSet([
            ['ecoraices_user_name', u.name || ''],
            ['ecoraices_user_email', u.email || ''],
            ['ecoraices_user_username', u.username || '']
          ]);
        }

        setAuthPassword('');
        setAuthSuccess('¡Cuenta creada y sesión iniciada exitosamente!');
        fetchRemoteProfile(data.token);
        fetchRemoteObservations();
      } else {
        setAuthSuccess('¡Cuenta creada exitosamente! Por favor inicia sesión.');
        setAuthMode('login');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setAuthError('Tiempo de espera agotado (12s). El servidor Dokploy tardó demasiado en responder.');
      } else if (err.message && err.message.includes('Network request failed')) {
        setAuthError(`No se pudo conectar a ${cleanUrl.replace(/^https?:\/\//, '')}. Verifica tu conexión a internet o el estado del servidor.`);
      } else {
        setAuthError(err.message || 'No se pudo crear la cuenta.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión? Tus árboles registrados en el dispositivo SQLite permanecerán a salvo para sincronizarse luego.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('ecoraices_auth_token');
              setToken('');
              setIsGuestMode(false);
              setAuthEmail('');
              setAuthPassword('');
              setAuthError('');
              setAuthSuccess('');
              Alert.alert('Sesión Cerrada', 'Has cerrado sesión exitosamente en este dispositivo.');
            } catch (err) {
              console.warn('Error al cerrar sesión:', err);
            }
          }
        }
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      await AsyncStorage.multiSet([
        ['ecoraices_user_name', userName],
        ['ecoraices_user_email', userEmail],
        ['ecoraices_user_username', userUsername],
        ['ecoraices_user_territory', userTerritory],
        ['ecoraices_user_bio', userBio],
        ['ecoraices_user_role', userRole]
      ]);
      setMunicipio(userTerritory);

      if (token) {
        fetch(`${serverUrl}/api/users/me/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: userName,
            username: userUsername,
            email: userEmail,
            bio: userBio,
            location: userTerritory
          })
        }).catch((err) => console.log('Sync profile error:', err.message));
      }

      setProfileSaveBanner('✓ Perfil y territorio actualizados exitosamente');
      setTimeout(() => setProfileSaveBanner(null), 3500);
    } catch (err) {
      console.warn('Error guardando perfil:', err);
    }
  };

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

  const handlePhotoSelect = () => {
    Alert.alert(
      'Fotografía del Árbol',
      'Elige el método de captura:',
      [
        { text: '📷 Tomar Foto con Cámara', onPress: takePhoto },
        { text: '🖼️ Elegir de la Galería', onPress: pickImageFromGallery },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  const handleSaveTree = async () => {
    const finalSpecies = speciesName.trim();
    if (!finalSpecies) {
      Alert.alert('Especie requerida', 'Por favor ingresa la especie o nombre común del árbol.');
      return;
    }

    if (!municipio.trim()) {
      Alert.alert('Municipio requerido', 'Por favor ingresa el municipio o sector.');
      return;
    }

    if (!coords) {
      Alert.alert('Ubicación requerida', 'Presiona "¿Dónde estoy?" para fijar las coordenadas satelitales del árbol.');
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
        municipality: municipio.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: gpsAccuracy || 10,
        height_meters: null,
        diameter_cm: null,
        health_state: healthState,
        notes: notes.trim(),
        local_photo_path: localPhotoPath
      });

      // Incrementar contador de sesión
      setSessionCount(currentNumber);

      // Mostrar banner de éxito (fiel a la web .quick-alert.success)
      setSaveSuccessBanner(`✓ Árbol "${finalSpecies}" guardado en SQLite offline (+30 pts)`);
      setTimeout(() => {
        setSaveSuccessBanner(null);
      }, 4000);

      // Resetear campos según continuousMode (Modo ráfaga)
      setPhotoUri(null);
      setNotes('');
      if (continuousMode) {
        setSpeciesName('');
        // Conservamos el municipio y la ubicación caliente para el siguiente árbol en campo
      } else {
        setSpeciesName('');
      }

      // Actualizar estadísticas y refrescar GPS
      refreshStats();
      fetchCurrentLocation(true);
    } catch (err) {
      setSaveErrorBanner('Error al guardar: ' + err.message);
      setTimeout(() => setSaveErrorBanner(null), 4000);
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

      {/* Barra de Cabecera Superior (Estilo Oficial EcoRaíces Mobile) */}
      <Header
        onLogoPress={() => setActiveTab('home')}
        pendingCount={stats.pending}
        isSyncing={isSyncing}
        onSyncPress={handleStartSync}
      />

      {/* Contenido Principal según Pestaña Activa */}
      <View style={styles.contentArea}>
        {/* ============================================================== */}
        {/* 1. INICIO (PANELES 1 & 7: Hero, Métricas, Gamificación, Misión)*/}
        {/* ============================================================== */}
        {activeTab === 'home' && (
          <HomeScreen
            displaySpeciesCatalog={displaySpeciesCatalog}
            outboxTrees={outboxTrees}
            gamification={gamification}
            onNavigateToCapture={() => setActiveTab('capture')}
            onNavigateToMap={() => setActiveTab('map3d')}
            onNavigateToAbout={() => setActiveTab('about')}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {/* ============================================================== */}
        {/* SOBRE NOSOTROS (MIRROR OFICIAL DE nosotros.astro EN MOBILE)    */}
        {/* ============================================================== */}
        {activeTab === 'about' && (
          <AboutScreen
            onNavigateBack={() => setActiveTab('home')}
          />
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
        {/* ============================================================== */}
        {/* 3. CAPTURA DE CAMPO (DISEÑO ORIGINAL WEB CON BOTÓN DÓNDE ESTOY) */}
        {/* ============================================================== */}
        {activeTab === 'capture' && (
          <CaptureScreen
            coords={coords}
            gpsAccuracy={gpsAccuracy}
            isLocating={isLocating}
            fetchCurrentLocation={fetchCurrentLocation}
            saveSuccessBanner={saveSuccessBanner}
            saveErrorBanner={saveErrorBanner}
            speciesName={speciesName}
            setSpeciesName={setSpeciesName}
            municipio={municipio}
            setMunicipio={setMunicipio}
            extraOptionsOpen={extraOptionsOpen}
            setExtraOptionsOpen={setExtraOptionsOpen}
            photoUri={photoUri}
            setPhotoUri={setPhotoUri}
            handlePhotoSelect={handlePhotoSelect}
            healthState={healthState}
            setHealthState={setHealthState}
            notes={notes}
            setNotes={setNotes}
            handleSaveTree={handleSaveTree}
            continuousMode={continuousMode}
            setContinuousMode={setContinuousMode}
            onNavigateToMap={() => setActiveTab('map3d')}
          />
        )}

        {/* ============================================================== */}
        {/* 4. CATÁLOGO CONECTADO A API WEB + CACHÉ OFFLINE (PANEL 4 & 5)   */}
        {/* ============================================================== */}
        {activeTab === 'catalog' && (
          <CatalogScreen
            displaySpeciesCatalog={displaySpeciesCatalog}
            catalogLoading={catalogLoading}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            selectedSpeciesDetail={selectedSpeciesDetail}
            setSelectedSpeciesDetail={setSelectedSpeciesDetail}
            onSelectSpeciesForCapture={(sp) => {
              setSpeciesName(sp.name);
              setActiveTab('capture');
            }}
          />
        )}

        {/* ============================================================== */}
        {/* 5. COMUNIDADES (IMÁGENES LOCALES SOLAMENTE - PANEL 6)          */}
        {/* ============================================================== */}
        {activeTab === 'communities' && (
          <CommunitiesScreen
            communities={GUAJIRA_COMUNIDADES}
            localAssets={LOCAL_COMMUNITY_ASSETS}
            onJoinCommunity={(com) => Alert.alert('Comunidad', 'Te has vinculado al nodo de ' + com.name + '.')}
          />
        )}

        {/* ============================================================== */}
        {/* 6. PERFIL Y SISTEMA COMPLETO DE MEDALLAS (PANEL 8)             */}
        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* 6. PERFIL Y SISTEMA COMPLETO DE MEDALLAS (MIRROR DE LA WEB)   */}
        {/* ============================================================== */}
        {activeTab === 'profile' && (
          <ProfileScreen
            token={token}
            isGuestMode={isGuestMode}
            setIsGuestMode={setIsGuestMode}
            userName={userName}
            setUserName={setUserName}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            userUsername={userUsername}
            setUserUsername={setUserUsername}
            userRole={userRole}
            setUserRole={setUserRole}
            userTerritory={userTerritory}
            userBio={userBio}
            setUserBio={setUserBio}
            authMode={authMode}
            setAuthMode={setAuthMode}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authPassword={authPassword}
            setAuthPassword={setAuthPassword}
            authName={authName}
            setAuthName={setAuthName}
            authUsername={authUsername}
            setAuthUsername={setAuthUsername}
            authRemember={authRemember}
            setAuthRemember={setAuthRemember}
            isAuthLoading={isAuthLoading}
            authError={authError}
            setAuthError={setAuthError}
            authSuccess={authSuccess}
            setAuthSuccess={setAuthSuccess}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handleLogin={handleLogin}
            handleRegister={handleRegister}
            handleLogout={handleLogout}
            handleSaveProfile={handleSaveProfile}
            setShowTerritoryModal={setShowTerritoryModal}
            profileSaveBanner={profileSaveBanner}
            profileSubTab={profileSubTab}
            setProfileSubTab={setProfileSubTab}
            outboxTrees={outboxTrees}
            remoteTrees={remoteTrees}
            gamification={gamification}
            stats={stats}
            isSyncing={isSyncing}
            syncProgress={syncProgress}
            handleStartSync={handleStartSync}
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            connectionStatus={connectionStatus}
            handleTestConnection={handleTestConnection}
            onNavigateToCapture={() => setActiveTab('capture')}
          />
        )}
      </View>

      {/* Modal Selector de Municipio / Territorio de Colombia */}
      <TerritoryModal
        visible={showTerritoryModal}
        onClose={() => {
          setShowTerritoryModal(false);
          setTerritorySearch('');
        }}
        territorySearch={territorySearch}
        setTerritorySearch={setTerritorySearch}
        userTerritory={userTerritory}
        onSelectTerritory={(name, fullLabel) => {
          setUserTerritory(fullLabel);
          setMunicipio(name);
        }}
      />


      {/* Barra de Navegación Inferior Cockpit */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1329'
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  }
});
