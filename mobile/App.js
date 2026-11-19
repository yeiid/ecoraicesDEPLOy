import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  LogBox
} from 'react-native';

LogBox.ignoreAllLogs(true);
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUAJIRA_ESPECIES_NATIVAS,
  GUAJIRA_COMUNIDADES,
  DEFAULT_API_BASE_URL
} from './src/constants/guajira';
import {
  calculateUserGamification
} from './src/constants/medals';
import {
  getDB,
  saveOfflineTree,
  getAllOfflineTrees,
  getOfflineStats,
  markTreeStatus
} from './src/services/db';
import { persistTreePhoto } from './src/services/storage';
import { syncOfflineOutbox, uploadSingleObservation } from './src/services/sync';
import { resolveLocationFromCoords } from './src/services/geocoding';
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

// Mapeo de imágenes locales de respaldo para banners de comunidades sin foto propia
const LOCAL_COMMUNITY_ASSETS = {
  'guajira-banner': require('./assets/guajira-banner.webp'),
  'guajira-paisaje': require('./assets/guajira-paisaje.webp'),
  'guajira-flora': require('./assets/guajira-flora.webp')
};

export default function App() {
  // Navigation Tabs: 'home' | 'map3d' | 'capture' | 'catalog' | 'communities' | 'profile' | 'about'
  const [activeTab, setActiveTab] = useState('home');

  // GPS State
  const [coords, setCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState(null);

  // Field Capture Form State (Conectado a POST /api/observations)
  const [speciesName, setSpeciesName] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [municipio, setMunicipio] = useState('Riohacha');
  const [treeHeight, setTreeHeight] = useState(8);
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
  const [syncBanner, setSyncBanner] = useState(null);

  // Backend Live Data State (FastAPI EcoRaíces Web)
  const [serverStats, setServerStats] = useState(null);
  const [apiSpecies, setApiSpecies] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiCommunities, setApiCommunities] = useState([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);
  const [remoteTrees, setRemoteTrees] = useState([]);

  // Profile & Settings State (Sin datos personales ficticios cuando no hay sesión)
  const serverUrl = DEFAULT_API_BASE_URL;
  const [userName, setUserName] = useState('Guardabosques EcoRaíces');
  const [userEmail, setUserEmail] = useState('');
  const [userUsername, setUserUsername] = useState('guardabosques');
  const [userRole, setUserRole] = useState('Guardabosques Comunitario');
  const [userTerritory, setUserTerritory] = useState('Riohacha');
  const [userBio, setUserBio] = useState('Monitoreo y conservación de la biodiversidad forestal.');
  const [token, setToken] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [showTerritoryModal, setShowTerritoryModal] = useState(false);
  const [territorySearch, setTerritorySearch] = useState('');
  const [profileSaveBanner, setProfileSaveBanner] = useState(null);
  const [profileSubTab, setProfileSubTab] = useState('datos'); // 'datos' | 'arboles' | 'medallas' | 'outbox'

  // Estados de Autenticación (Login / Registro)
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authRemember, setAuthRemember] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modal Ficha Botánica Detallada
  const [selectedSpeciesDetail, setSelectedSpeciesDetail] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        await getDB();
        await refreshStats();

        // Limpiar cualquier URL de servidor guardada en versiones previas
        AsyncStorage.removeItem('ecoraices_server_url').catch(() => {});

        const keys = [
          'ecoraices_user_name',
          'ecoraices_user_email',
          'ecoraices_user_username',
          'ecoraices_user_role',
          'ecoraices_user_bio',
          'ecoraices_user_territory',
          'ecoraices_auth_token'
        ];
        const entries = await AsyncStorage.multiGet(keys);
        const map = Object.fromEntries(entries);

        if (!isMounted) return;
        const activeBaseUrl = DEFAULT_API_BASE_URL;
        if (map['ecoraices_user_name']) setUserName(map['ecoraices_user_name']);
        if (map['ecoraices_user_email']) setUserEmail(map['ecoraices_user_email']);
        if (map['ecoraices_user_username']) setUserUsername(map['ecoraices_user_username']);
        if (map['ecoraices_user_role']) setUserRole(map['ecoraices_user_role']);
        if (map['ecoraices_user_bio']) setUserBio(map['ecoraices_user_bio']);
        if (map['ecoraices_user_territory']) {
          setUserTerritory(map['ecoraices_user_territory']);
          setMunicipio(map['ecoraices_user_territory'].split(',')[0].trim());
        }
        if (map['ecoraices_auth_token']) {
          setToken(map['ecoraices_auth_token']);
          fetchRemoteProfile(map['ecoraices_auth_token'], activeBaseUrl);
        }

        setTimeout(() => {
          if (!isMounted) return;
          fetchCurrentLocation(true);
          fetchServerStats(activeBaseUrl);
          loadLiveSpeciesCatalog(activeBaseUrl);
          fetchRemoteObservations(activeBaseUrl);
          fetchRemoteCommunities(activeBaseUrl);
        }, 100);
      } catch (err) {
        console.warn('Error inicializando app:', err);
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCleanBaseUrl = (customUrl) => {
    return (customUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
  };

  // 1. Estadísticas Globales Reales (GET /api/stats)
  const fetchServerStats = async (baseUrl) => {
    const clean = getCleanBaseUrl(baseUrl);
    try {
      const res = await fetch(`${clean}/api/stats`);
      if (res.ok) {
        const data = await res.json();
        setServerStats(data);
        AsyncStorage.setItem('ecoraices_cached_stats', JSON.stringify(data));
      }
    } catch (_) {
      const cached = await AsyncStorage.getItem('ecoraices_cached_stats');
      if (cached) setServerStats(JSON.parse(cached));
    }
  };

  // 2. Comunidades Reales (GET /api/communities)
  const fetchRemoteCommunities = async (baseUrl) => {
    setCommunitiesLoading(true);
    const clean = getCleanBaseUrl(baseUrl);
    try {
      const res = await fetch(`${clean}/api/communities`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setApiCommunities(data);
          AsyncStorage.setItem('ecoraices_cached_communities', JSON.stringify(data));
        }
      } else {
        const cached = await AsyncStorage.getItem('ecoraices_cached_communities');
        if (cached) setApiCommunities(JSON.parse(cached));
      }
    } catch (_) {
      const cached = await AsyncStorage.getItem('ecoraices_cached_communities');
      if (cached) {
        setApiCommunities(JSON.parse(cached));
      } else if (apiCommunities.length === 0) {
        setApiCommunities(GUAJIRA_COMUNIDADES);
      }
    } finally {
      setCommunitiesLoading(false);
    }
  };

  // 3. Catálogo de Especies y Categorías Reales (GET /api/species & GET /api/categories)
  const loadLiveSpeciesCatalog = async (baseUrl) => {
    setCatalogLoading(true);
    const clean = getCleanBaseUrl(baseUrl);
    try {
      const [specRes, catRes] = await Promise.all([
        fetch(`${clean}/api/species`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${clean}/api/categories`).then((r) => (r.ok ? r.json() : []))
      ]);

      if (Array.isArray(specRes) && specRes.length > 0) {
        setApiSpecies(specRes);
        AsyncStorage.setItem('ecoraices_cached_species', JSON.stringify(specRes));
      } else {
        const cached = await AsyncStorage.getItem('ecoraices_cached_species');
        if (cached) setApiSpecies(JSON.parse(cached));
      }

      if (Array.isArray(catRes) && catRes.length > 0) {
        setApiCategories(catRes);
        AsyncStorage.setItem('ecoraices_cached_categories', JSON.stringify(catRes));
      } else {
        const cachedCats = await AsyncStorage.getItem('ecoraices_cached_categories');
        if (cachedCats) setApiCategories(JSON.parse(cachedCats));
      }
    } catch (_) {
      const cached = await AsyncStorage.getItem('ecoraices_cached_species');
      if (cached) setApiSpecies(JSON.parse(cached));
      const cachedCats = await AsyncStorage.getItem('ecoraices_cached_categories');
      if (cachedCats) setApiCategories(JSON.parse(cachedCats));
    } finally {
      setCatalogLoading(false);
    }
  };

  // 4. Observaciones Reales (GET /api/observations)
  const fetchRemoteObservations = async (baseUrl) => {
    const clean = getCleanBaseUrl(baseUrl);
    try {
      const response = await fetch(`${clean}/api/observations?limit=250`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setRemoteTrees(data);
          AsyncStorage.setItem('ecoraices_cached_observations', JSON.stringify(data));
        }
      }
    } catch (_) {
      const cached = await AsyncStorage.getItem('ecoraices_cached_observations');
      if (cached) setRemoteTrees(JSON.parse(cached));
    }
  };

  // 5. Perfil Real del Usuario Autenticado (GET /api/users/me/profile)
  const fetchRemoteProfile = async (authToken = token, baseUrl) => {
    if (!authToken) return;
    const clean = getCleanBaseUrl(baseUrl);
    try {
      const response = await fetch(`${clean}/api/users/me/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const p = data?.profile || data?.user || data;
        if (p) {
          if (p.name) setUserName(p.name);
          if (p.email) setUserEmail(p.email);
          if (p.username) setUserUsername(p.username);
          if (p.bio) setUserBio(p.bio);
          if (p.location) {
            setUserTerritory(p.location);
            setMunicipio(p.location.split(',')[0].trim());
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
    } catch (_) {}
  };

  const handleLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }
    setIsAuthLoading(true);
    const cleanUrl = getCleanBaseUrl();
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
            setMunicipio(u.location.split(',')[0].trim());
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
        fetchRemoteProfile(data.token, cleanUrl);
        fetchRemoteObservations(cleanUrl);
        fetchServerStats(cleanUrl);
        fetchRemoteCommunities(cleanUrl);
      } else {
        throw new Error('No se recibió el token de autenticación.');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setAuthError('Tiempo de espera agotado (12s). El servidor tardó demasiado en responder.');
      } else {
        setAuthError(err.message || 'Error de conexión con el servidor EcoRaíces.');
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
    const cleanUrl = getCleanBaseUrl();
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
        fetchRemoteProfile(data.token, cleanUrl);
        fetchRemoteObservations(cleanUrl);
        fetchServerStats(cleanUrl);
      } else {
        setAuthSuccess('¡Cuenta creada exitosamente! Por favor inicia sesión.');
        setAuthMode('login');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setAuthError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar sesión? Tus árboles registrados en la cola local permanecerán guardados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'ecoraices_auth_token',
                'ecoraices_user_name',
                'ecoraices_user_email',
                'ecoraices_user_username',
                'ecoraices_user_role'
              ]);
              setToken('');
              setIsGuestMode(false);
              setUserName('Guardabosques EcoRaíces');
              setUserEmail('');
              setUserUsername('guardabosques');
              setAuthEmail('');
              setAuthPassword('');
              setAuthError('');
              setAuthSuccess('');
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
      setMunicipio(userTerritory.split(',')[0].trim());

      if (token) {
        fetch(`${getCleanBaseUrl()}/api/users/me/profile`, {
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
        }).catch(() => {});
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

  const applyGpsLocationInfo = (nextCoords, resolvedInfo) => {
    if (nextCoords) {
      setCoords({
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
        altitude: nextCoords.altitude ?? null
      });
      if (nextCoords.accuracy !== undefined && nextCoords.accuracy !== null) {
        setGpsAccuracy(nextCoords.accuracy);
      }
    }
    if (resolvedInfo) {
      setDetectedLocation(resolvedInfo);
      if (resolvedInfo.municipio && !resolvedInfo.isCoordsFallback) {
        setMunicipio(resolvedInfo.municipio);
      }
    }
  };

  const handleMapLocationUpdate = (nextCoords, resolvedInfo) => {
    applyGpsLocationInfo(nextCoords, resolvedInfo);
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

      let bestCoords = null;
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown && lastKnown.coords) {
        bestCoords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          altitude: lastKnown.coords.altitude,
          accuracy: lastKnown.coords.accuracy
        };
        setCoords({
          latitude: bestCoords.latitude,
          longitude: bestCoords.longitude,
          altitude: bestCoords.altitude
        });
        setGpsAccuracy(bestCoords.accuracy);
      }

      const gpsPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GPS timeout')), 3500)
      );

      const location = await Promise.race([gpsPromise, timeoutPromise]).catch(() => null);

      if (location && location.coords) {
        bestCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy
        };
        setCoords({
          latitude: bestCoords.latitude,
          longitude: bestCoords.longitude,
          altitude: bestCoords.altitude
        });
        setGpsAccuracy(bestCoords.accuracy);
      }

      if (bestCoords) {
        resolveLocationFromCoords(bestCoords.latitude, bestCoords.longitude, !silent)
          .then((locInfo) => {
            if (locInfo) {
              setDetectedLocation(locInfo);
              if (locInfo.municipio && !locInfo.isCoordsFallback) {
                setMunicipio(locInfo.municipio);
              }
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      if (!silent) console.log('Error GPS:', err.message);
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
    if (Platform.OS === 'web') {
      pickImageFromGallery();
      return;
    }
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

  const getScientificFor = (name) => {
    const fromApi = apiSpecies.find((s) => (s.name || '').toLowerCase() === (name || '').toLowerCase());
    if (fromApi && (fromApi.scientificName || fromApi.scientific_name)) {
      return fromApi.scientificName || fromApi.scientific_name;
    }
    const found = GUAJIRA_ESPECIES_NATIVAS.find((s) => s.name.toLowerCase() === (name || '').toLowerCase());
    return found ? found.scientific : '';
  };

  const handleSaveTree = async () => {
    const finalSpecies = speciesName.trim();
    if (!finalSpecies) {
      Alert.alert('Especie requerida', 'Por favor ingresa o elige la especie del árbol.');
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

      const clientId = 'tree_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const matchedSpecies = apiSpecies.find(
        (s) => (s.name || '').toLowerCase() === finalSpecies.toLowerCase()
      );
      const isSelectedIdReal = selectedSpeciesId && apiSpecies.some((s) => String(s.id) === String(selectedSpeciesId));
      const resolvedSpeciesId = isSelectedIdReal ? selectedSpeciesId : (matchedSpecies?.id || null);
      const isCommunityIdReal = selectedCommunityId && apiCommunities.some((c) => String(c.id) === String(selectedCommunityId));
      const resolvedCommunityId = isCommunityIdReal ? selectedCommunityId : null;
      const resolvedScientific = getScientificFor(finalSpecies);

      const numericHeight = Number(treeHeight) || 8;
      const rawNotes = notes.trim();
      const combinedNotes =
        rawNotes && !/Altura:\s*\d/i.test(rawNotes)
          ? `Altura: ${numericHeight}m. ${rawNotes}`
          : rawNotes || `Altura: ${numericHeight}m.`;

      const treePayload = {
        clientId,
        speciesId: resolvedSpeciesId,
        communityId: resolvedCommunityId,
        speciesName: finalSpecies,
        scientificName: resolvedScientific,
        municipio: (detectedLocation?.municipio || municipio || 'Riohacha').trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude || null,
        treeHeight: numericHeight,
        heightMeters: numericHeight,
        accuracy: gpsAccuracy || 10,
        healthState,
        notes: combinedNotes,
        localImagePath: localPhotoPath,
        observationDate: new Date().toISOString().split('T')[0]
      };

      await saveOfflineTree(treePayload);
      setSessionCount((prev) => prev + 1);

      // Si el usuario tiene sesión activa con token, intentamos sincronizar al instante con FastAPI
      let syncedImmediately = false;
      let immediateErr = null;
      if (token) {
        try {
          await uploadSingleObservation(treePayload, getCleanBaseUrl(), token, {
            species: apiSpecies,
            communities: apiCommunities
          });
          await markTreeStatus(clientId, 'SYNCED', null);
          syncedImmediately = true;
          fetchRemoteObservations();
          fetchServerStats();
        } catch (syncErr) {
          immediateErr = syncErr?.message || null;
          await markTreeStatus(clientId, 'ERROR', immediateErr);
        }
      }

      setSaveSuccessBanner(
        syncedImmediately
          ? `✓ Árbol "${finalSpecies}" subido en vivo al servidor EcoRaíces (+30 pts)`
          : immediateErr
          ? `✓ Guardado localmente en cola offline (pendiente: ${immediateErr})`
          : `✓ Árbol "${finalSpecies}" guardado en cola offline (+30 pts)`
      );
      setTimeout(() => {
        setSaveSuccessBanner(null);
      }, 4500);

      setPhotoUri(null);
      setNotes('');
      setSpeciesName('');
      setSelectedSpeciesId(null);

      await refreshStats();
      fetchCurrentLocation(true);
    } catch (err) {
      setSaveErrorBanner('Error al guardar: ' + err.message);
      setTimeout(() => setSaveErrorBanner(null), 4000);
    }
  };

  const showSyncFeedback = (text, tone = 'info') => {
    setSyncBanner({ text, tone });
    setTimeout(() => {
      setSyncBanner((prev) => (prev && prev.text === text ? null : prev));
    }, 4500);
  };

  const handleRefreshAllData = async () => {
    setIsSyncing(true);
    try {
      const cleanUrl = getCleanBaseUrl();
      await Promise.all([
        fetchServerStats(cleanUrl),
        fetchRemoteObservations(cleanUrl),
        fetchRemoteCommunities(cleanUrl),
        loadLiveSpeciesCatalog(cleanUrl),
        refreshStats()
      ]);
      showSyncFeedback('✓ Datos actualizados desde el servidor EcoRaíces', 'success');
    } catch (_) {
      showSyncFeedback('No se pudo conectar al servidor. Mostrando datos en caché.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartSync = async () => {
    if (stats.pending === 0) {
      await handleRefreshAllData();
      return;
    }

    if (!token) {
      showSyncFeedback('Inicia sesión en la pestaña Perfil para subir tus árboles.', 'error');
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Inicia Sesión para Sincronizar',
          'Tus árboles están seguros en tu dispositivo. Inicia sesión en la pestaña Perfil para subirlos al servidor EcoRaíces.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a Perfil', onPress: () => setActiveTab('profile') }
          ]
        );
      } else {
        setActiveTab('profile');
      }
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: stats.pending });

    try {
      const res = await syncOfflineOutbox({
        apiBaseUrl: serverUrl,
        token,
        species: apiSpecies,
        communities: apiCommunities,
        onProgress: (p) => setSyncProgress(p)
      });

      if (res.synced > 0) {
        const msg = `✓ Se subieron ${res.synced} árbol(es) al servidor.${res.failed > 0 ? ` (${res.failed} con error)` : ''}`;
        showSyncFeedback(msg, res.failed > 0 ? 'error' : 'success');
        if (Platform.OS !== 'web') {
          Alert.alert('Sincronización Exitosa', msg);
        }
      } else if (res.failed > 0) {
        const errMsg = res.errors?.[0]?.error || 'No se pudieron subir los registros.';
        showSyncFeedback(`⚠️ Error al sincronizar: ${errMsg}`, 'error');
        if (Platform.OS !== 'web') {
          Alert.alert('Error al Sincronizar', errMsg);
        }
      }
      await refreshStats();
      fetchRemoteObservations();
      fetchServerStats();
    } catch (err) {
      const errMsg = err?.message || 'Error inesperado de sincronización';
      showSyncFeedback(`⚠️ ${errMsg}`, 'error');
      if (Platform.OS !== 'web') {
        Alert.alert('Sincronización', errMsg);
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Conteo real de observaciones por especie (sin números inventados)
  const speciesObservationCounts = useMemo(() => {
    const counts = {};
    remoteTrees.forEach((rt) => {
      const sId = rt.speciesId || rt.species?.id;
      const sName = (rt.species?.name || rt.name || '').toLowerCase();
      if (sId) counts[sId] = (counts[sId] || 0) + 1;
      if (sName) counts[sName] = (counts[sName] || 0) + 1;
    });
    outboxTrees
      .filter((t) => t.syncStatus !== 'SYNCED')
      .forEach((t) => {
        const sId = t.speciesId;
        const sName = (t.speciesName || t.species_name || '').toLowerCase();
        if (sId) counts[sId] = (counts[sId] || 0) + 1;
        if (sName) counts[sName] = (counts[sName] || 0) + 1;
      });
    return counts;
  }, [remoteTrees, outboxTrees]);

  // Catálogo construido desde GET /api/species (61 especies reales) con conteo real de avistamientos
  const displaySpeciesCatalog = useMemo(() => {
    const cleanBase = getCleanBaseUrl();
    const sourceList =
      apiSpecies.length > 0
        ? apiSpecies.map((as) => {
            let photoUrl = as.imageUrl || 'https://ecoraices.neuraljira.tech/guajira-paisaje.webp';
            if (photoUrl.startsWith('/')) {
              photoUrl = `${cleanBase}${photoUrl}`;
            }
            const realCount =
              speciesObservationCounts[as.id] ||
              speciesObservationCounts[(as.name || '').toLowerCase()] ||
              0;

            return {
              id: as.id,
              name: as.name,
              scientific: as.scientificName || as.scientific_name || 'Especie forestal',
              family: as.family || as.category?.name || 'Flora Tropical',
              gbifKey: as.gbifKey || null,
              icon: '🌱',
              tag: as.category?.name || 'Catálogo Oficial',
              category: as.category?.name || 'General',
              categoryId: as.categoryId || as.category?.id || null,
              photo: photoUrl,
              status: as.status || 'Validado',
              isInvasive: (as.name || '').toLowerCase().includes('neem'),
              botanicalDescription: as.description || null,
              ecologicalValue: as.habitat || as.category?.description || null,
              sightingsCount: realCount
            };
          })
        : GUAJIRA_ESPECIES_NATIVAS.map((sp) => ({
            ...sp,
            sightingsCount: speciesObservationCounts[(sp.name || '').toLowerCase()] || 0
          }));

    return sourceList.filter((sp) => {
      const matchSearch = (
        (sp.name || '') + ' ' +
        (sp.scientific || '') + ' ' +
        (sp.family || '')
      )
        .toLowerCase()
        .includes(catalogSearch.toLowerCase());
      if (!matchSearch) return false;
      if (
        selectedCategoryFilter &&
        sp.category !== selectedCategoryFilter &&
        sp.categoryId !== selectedCategoryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [apiSpecies, catalogSearch, selectedCategoryFilter, speciesObservationCounts, serverUrl]);

  // Lista 100% real de árboles para el Mapa 3D (deduplicando cola local sincronizada y servidor FastAPI)
  const allMapTrees = useMemo(() => {
    const cleanBase = getCleanBaseUrl();
    const remoteIds = new Set(remoteTrees.map((rt) => String(rt.id)));

    const pendingOrUnsyncedLocal = outboxTrees
      .filter((t) => !remoteIds.has(String(t.clientId)) && t.syncStatus !== 'SYNCED')
      .map((t) => ({
        ...t,
        name: t.speciesName || t.species_name || 'Árbol Censado',
        species_name: t.speciesName || t.species_name || 'Árbol Censado',
        scientific_name: t.scientificName || t.scientific_name || '',
        municipality: t.municipio || t.municipality || 'La Guajira',
        verified: false
      }));

    const formattedRemote = remoteTrees.map((rt) => {
      let img = rt.imageUrl || null;
      if (img && img.startsWith('/')) {
        img = `${cleanBase}${img}`;
      }
      return {
        ...rt,
        imageUrl: img,
        name: rt.species?.name || rt.speciesName || rt.species_name || rt.name || 'Árbol Registrado',
        species_name: rt.species?.name || rt.speciesName || rt.species_name || rt.name || 'Árbol Registrado',
        scientific_name: rt.species?.scientificName || rt.scientific_name || '',
        municipality: rt.municipio || rt.municipality || 'Colombia',
        verified: rt.status === 'APPROVED' || Boolean(rt.verified)
      };
    });

    return [...pendingOrUnsyncedLocal, ...formattedRemote];
  }, [outboxTrees, remoteTrees, serverUrl]);

  // Cálculo de Gamificación y Medallas del usuario basado en registros reales
  const gamification = useMemo(() => {
    return calculateUserGamification(allMapTrees, apiCommunities.length || 1);
  }, [allMapTrees, apiCommunities.length]);

  const hasSyncError = useMemo(() => {
    return outboxTrees.some((t) => (t.syncStatus || t.sync_status) === 'ERROR');
  }, [outboxTrees]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={Platform.OS === 'android'}
      />

      {/* Barra de Cabecera Superior */}
      <Header
        onLogoPress={() => setActiveTab('home')}
        pendingCount={stats.pending}
        hasSyncError={hasSyncError}
        isSyncing={isSyncing}
        onSyncPress={handleStartSync}
        onRefreshPress={handleRefreshAllData}
      />

      {/* Banner de estado de sincronización visible en Web y Android/iOS */}
      {syncBanner && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setSyncBanner(null)}
          style={[
            styles.syncBanner,
            syncBanner.tone === 'success' && styles.syncBannerSuccess,
            syncBanner.tone === 'error' && styles.syncBannerError
          ]}
        >
          <Text style={styles.syncBannerText} numberOfLines={2}>
            {syncBanner.text}
          </Text>
          <Text style={styles.syncBannerClose}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Contenido Principal según Pestaña Activa */}
      <View style={styles.contentArea}>
        {/* 1. INICIO CONECTADO A /api/stats Y /api/observations */}
        {activeTab === 'home' && (
          <HomeScreen
            displaySpeciesCatalog={displaySpeciesCatalog}
            outboxTrees={outboxTrees}
            remoteTrees={remoteTrees}
            apiCommunities={apiCommunities}
            serverStats={serverStats}
            serverUrl={serverUrl}
            gamification={gamification}
            onNavigateToCapture={() => setActiveTab('capture')}
            onNavigateToMap={() => setActiveTab('map3d')}
            onNavigateToAbout={() => setActiveTab('about')}
            onNavigateToProfile={() => setActiveTab('profile')}
            onNavigateToCommunities={() => setActiveTab('communities')}
          />
        )}

        {/* SOBRE NOSOTROS */}
        {activeTab === 'about' && (
          <AboutScreen
            onNavigateBack={() => setActiveTab('home')}
          />
        )}

        {/* 2. MAPA 3D VECTORIAL CON CATASTRO ARBÓREO 3D */}
        {activeTab === 'map3d' && (
          <Map3DView
            trees={allMapTrees}
            userCoords={coords}
            detectedLocation={detectedLocation}
            onLocationUpdate={handleMapLocationUpdate}
          />
        )}

        {/* 3. CAPTURA DE CAMPO CON AUTOCOMPLETADO DEL CATÁLOGO Y COMUNIDADES REALES */}
        {activeTab === 'capture' && (
          <CaptureScreen
            coords={coords}
            gpsAccuracy={gpsAccuracy}
            isLocating={isLocating}
            detectedLocation={detectedLocation}
            fetchCurrentLocation={fetchCurrentLocation}
            saveSuccessBanner={saveSuccessBanner}
            saveErrorBanner={saveErrorBanner}
            speciesName={speciesName}
            setSpeciesName={setSpeciesName}
            selectedSpeciesId={selectedSpeciesId}
            setSelectedSpeciesId={setSelectedSpeciesId}
            displaySpeciesCatalog={displaySpeciesCatalog}
            apiCommunities={apiCommunities}
            selectedCommunityId={selectedCommunityId}
            setSelectedCommunityId={setSelectedCommunityId}
            municipio={municipio}
            setMunicipio={setMunicipio}
            treeHeight={treeHeight}
            setTreeHeight={setTreeHeight}
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

        {/* 4. CATÁLOGO CONECTADO A /api/species, /api/categories Y /api/species/{id} */}
        {activeTab === 'catalog' && (
          <CatalogScreen
            displaySpeciesCatalog={displaySpeciesCatalog}
            apiCategories={apiCategories}
            selectedCategoryFilter={selectedCategoryFilter}
            setSelectedCategoryFilter={setSelectedCategoryFilter}
            catalogLoading={catalogLoading}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            selectedSpeciesDetail={selectedSpeciesDetail}
            setSelectedSpeciesDetail={setSelectedSpeciesDetail}
            serverUrl={serverUrl}
            onSelectSpeciesForCapture={(sp) => {
              setSpeciesName(sp.name);
              setSelectedSpeciesId(sp.id);
              setActiveTab('capture');
            }}
          />
        )}

        {/* 5. COMUNIDADES CONECTADAS A /api/communities */}
        {activeTab === 'communities' && (
          <CommunitiesScreen
            communities={apiCommunities}
            communitiesLoading={communitiesLoading}
            onRefreshCommunities={() => fetchRemoteCommunities()}
            localAssets={LOCAL_COMMUNITY_ASSETS}
            serverUrl={serverUrl}
            token={token}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {/* 6. PERFIL, MIS ÁRBOLES, MEDALLAS Y COLA DE SINCRONIZACIÓN */}
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

      {/* Barra de Navegación Inferior */}
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
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    gap: 8
  },
  syncBannerSuccess: {
    backgroundColor: '#065f46'
  },
  syncBannerError: {
    backgroundColor: '#b91c1c'
  },
  syncBannerText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700'
  },
  syncBannerClose: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 4
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  }
});
