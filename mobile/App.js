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
  Switch,
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  GUAJIRA_MUNICIPIOS,
  GUAJIRA_ESPECIES_NATIVAS,
  ESTADOS_FITOSANITARIOS,
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

export default function App() {
  const [activeTab, setActiveTab] = useState('capture'); // 'capture' | 'outbox' | 'catalog' | 'settings'

  // GPS State
  const [coords, setCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Form State
  const [speciesName, setSpeciesName] = useState('Trupillo');
  const [municipio, setMunicipio] = useState('Riohacha');
  const [healthState, setHealthState] = useState('Sano y vigoroso');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [continuousMode, setContinuousMode] = useState(true);

  // Outbox / Sync State
  const [stats, setStats] = useState({ total: 0, pending: 0, synced: 0 });
  const [outboxTrees, setOutboxTrees] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  // Settings State
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_BASE_URL);
  const [userLocation, setUserLocation] = useState('Riohacha');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Inicializar SQLite
    getDB().then(() => {
      refreshStats();
    });

    // Cargar configuraciones guardadas
    AsyncStorage.getItem('ecoraices_server_url').then((val) => {
      if (val) setServerUrl(val);
    });
    AsyncStorage.getItem('ecoraices_user_territory').then((val) => {
      if (val) {
        setUserLocation(val);
        setMunicipio(val);
      }
    });
    AsyncStorage.getItem('ecoraices_auth_token').then((val) => {
      if (val) setToken(val);
    });

    // Iniciar GPS
    fetchCurrentLocation(true);
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

  const handleSaveTree = async () => {
    if (!speciesName.trim()) {
      Alert.alert('Falta especie', 'Indica el nombre de la especie o nombre común.');
      return;
    }
    if (!municipio.trim()) {
      Alert.alert('Falta municipio', 'Selecciona el municipio o sector.');
      return;
    }
    if (!coords) {
      Alert.alert('GPS Requerido', 'Obtén la ubicación actual con el botón GPS antes de guardar.');
      return;
    }

    try {
      let permanentPhotoUri = null;
      if (photoUri) {
        permanentPhotoUri = await persistTreePhoto(photoUri);
      }

      const clientId = await saveOfflineTree({
        speciesName: speciesName.trim(),
        municipio: municipio.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude,
        accuracy: gpsAccuracy,
        healthState,
        notes: notes.trim(),
        localImagePath: permanentPhotoUri
      });

      await refreshStats();

      if (continuousMode) {
        Alert.alert(
          '🌲 Árbol Guardado',
          `"${speciesName}" registrado en SQLite local (${municipio}). ¡Listo para el siguiente!`,
          [{ text: 'Continuar' }]
        );
        // Limpiar para siguiente árbol manteniendo GPS y municipio
        setPhotoUri(null);
        setNotes('');
        fetchCurrentLocation(true);
      } else {
        Alert.alert('✓ Guardado', 'Árbol guardado con éxito en la cola de campo.', [
          { text: 'Ver cola', onPress: () => setActiveTab('outbox') }
        ]);
        setPhotoUri(null);
        setNotes('');
      }
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncProgress('Iniciando sincronización con EcoRaíces...');

    const result = await syncOfflineOutbox((prog) => {
      setSyncProgress(`Subiendo árbol ${prog.current} de ${prog.total} (${prog.tree.speciesName})...`);
    });

    setIsSyncing(false);
    setSyncProgress(null);
    await refreshStats();

    if (result.success) {
      Alert.alert('🎉 Sincronización Exitosa', `Se han sincronizado ${result.synced} árboles con el servidor.`);
    } else {
      Alert.alert(
        '⚠️ Sincronización Parcial',
        `Subidos: ${result.synced} | Fallidos: ${result.failed}\nLos árboles fallidos permanecen guardados en tu teléfono para el próximo intento.`
      );
    }
  };

  const handleSaveSettings = async () => {
    await AsyncStorage.setItem('ecoraices_server_url', serverUrl.trim());
    await AsyncStorage.setItem('ecoraices_user_territory', userLocation.trim());
    if (token) {
      await AsyncStorage.setItem('ecoraices_auth_token', token.trim());
    } else {
      await AsyncStorage.removeItem('ecoraices_auth_token');
    }
    setMunicipio(userLocation);
    Alert.alert('Ajustes guardados', 'Configuración de servidor y territorio actualizada.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1a472a" />

      {/* Header Principal */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Text style={styles.headerIcon}>🌿</Text>
          <View>
            <Text style={styles.headerTitle}>EcoRaíces Campo</Text>
            <Text style={styles.headerSubtitle}>La Guajira · 100% Offline</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.syncPill, stats.pending > 0 ? styles.syncPillPending : styles.syncPillOnline]}
          onPress={() => setActiveTab('outbox')}
        >
          <View style={[styles.syncDot, stats.pending > 0 ? styles.syncDotPending : styles.syncDotOnline]} />
          <Text style={styles.syncPillText}>
            {stats.pending > 0 ? `${stats.pending} en espera` : 'Al día'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Barra de pestañas */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'capture' && styles.tabItemActive]}
          onPress={() => setActiveTab('capture')}
        >
          <Text style={[styles.tabText, activeTab === 'capture' && styles.tabTextActive]}>📸 Captura</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'outbox' && styles.tabItemActive]}
          onPress={() => setActiveTab('outbox')}
        >
          <Text style={[styles.tabText, activeTab === 'outbox' && styles.tabTextActive]}>
            📦 Cola ({stats.pending})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'catalog' && styles.tabItemActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>🌿 Catálogo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.tabItemActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>⚙️ Ajustes</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido según pestaña */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'capture' && (
          <View style={styles.sectionContainer}>
            {/* Tarjeta GPS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📍 Posición GNSS / Satelital</Text>
                <TouchableOpacity
                  style={styles.btnSmallGps}
                  onPress={() => fetchCurrentLocation(false)}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnSmallGpsText}>Actualizar</Text>
                  )}
                </TouchableOpacity>
              </View>

              {coords ? (
                <View style={styles.coordsRow}>
                  <View style={styles.coordBox}>
                    <Text style={styles.coordLabel}>Latitud:</Text>
                    <Text style={styles.coordVal}>{coords.latitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordBox}>
                    <Text style={styles.coordLabel}>Longitud:</Text>
                    <Text style={styles.coordVal}>{coords.longitude.toFixed(6)}</Text>
                  </View>
                  {gpsAccuracy !== null && (
                    <Text style={styles.accuracyTag}>Precisión: ±{Math.round(gpsAccuracy)}m</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noCoordsText}>
                  {isLocating ? 'Conectando con satélites GPS...' : 'Sin coordenadas GPS'}
                </Text>
              )}
            </View>

            {/* Tarjeta Especie de La Guajira */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌱 Especie o Nombre Común</Text>
              <TextInput
                style={styles.input}
                value={speciesName}
                onChangeText={setSpeciesName}
                placeholder="Ej. Trupillo, Neem, Melocactus, Dividivi..."
              />

              <Text style={styles.subLabel}>Presets nativos de La Guajira:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {GUAJIRA_ESPECIES_NATIVAS.map((sp) => (
                  <TouchableOpacity
                    key={sp.name}
                    style={[styles.chip, speciesName === sp.name && styles.chipActive]}
                    onPress={() => setSpeciesName(sp.name)}
                  >
                    <Text style={[styles.chipText, speciesName === sp.name && styles.chipTextActive]}>
                      {sp.icon} {sp.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tarjeta Municipio / Territorio */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Municipio / Territorio</Text>
              <TextInput
                style={styles.input}
                value={municipio}
                onChangeText={setMunicipio}
                placeholder="Ej. Riohacha, Dibulla, Uribia..."
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                {GUAJIRA_MUNICIPIOS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, municipio === m && styles.chipActive]}
                    onPress={() => setMunicipio(m)}
                  >
                    <Text style={[styles.chipText, municipio === m && styles.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Condición de Salud */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌿 Estado Fitosanitario</Text>
              <View style={styles.healthGrid}>
                {ESTADOS_FITOSANITARIOS.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[
                      styles.healthChip,
                      healthState === h.id && { backgroundColor: h.color, borderColor: h.color }
                    ]}
                    onPress={() => setHealthState(h.id)}
                  >
                    <Text
                      style={[
                        styles.healthChipText,
                        healthState === h.id && { color: '#ffffff', fontWeight: 'bold' }
                      ]}
                    >
                      {h.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cámara y Fotografía */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📷 Fotografía del Árbol</Text>
              {photoUri ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.btnRemovePhoto} onPress={() => setPhotoUri(null)}>
                    <Text style={styles.btnRemovePhotoText}>✕ Cambiar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.btnCamera} onPress={takePhoto}>
                  <Text style={styles.btnCameraIcon}>📸</Text>
                  <Text style={styles.btnCameraText}>Tomar foto de campo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notas opcionales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📝 Notas de Campo</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej. Árbol de 6m, cerca de arroyo seco, floración abundante..."
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Modo Ráfaga */}
            <View style={styles.continuousModeRow}>
              <Switch
                value={continuousMode}
                onValueChange={setContinuousMode}
                trackColor={{ false: '#767577', true: '#16a34a' }}
              />
              <Text style={styles.continuousModeText}>
                ⚡ Modo Ráfaga (guardar y pasar al siguiente árbol)
              </Text>
            </View>

            {/* Botón Principal Guardar */}
            <TouchableOpacity style={styles.btnSave} onPress={handleSaveTree}>
              <Text style={styles.btnSaveText}>💾 Guardar en Teléfono (Offline)</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'outbox' && (
          <View style={styles.sectionContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statLabel}>Registrados</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: '#ea580c' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pendientes</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={[styles.statNum, { color: '#16a34a' }]}>{stats.synced}</Text>
                <Text style={styles.statLabel}>Subidos</Text>
              </View>
            </View>

            {/* Botón Sincronizar */}
            <TouchableOpacity
              style={[styles.btnSync, (isSyncing || stats.pending === 0) && styles.btnSyncDisabled]}
              onPress={handleSyncNow}
              disabled={isSyncing || stats.pending === 0}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSyncText}>
                  🚀 Sincronizar {stats.pending} árboles con EcoRaíces
                </Text>
              )}
            </TouchableOpacity>

            {syncProgress && <Text style={styles.syncProgressText}>{syncProgress}</Text>}

            <Text style={styles.sectionSubtitle}>Lista de árboles en almacenamiento local:</Text>

            {outboxTrees.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hay árboles registrados aún.</Text>
                <TouchableOpacity onPress={() => setActiveTab('capture')}>
                  <Text style={styles.emptyActionText}>Ir a registrar el primero →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              outboxTrees.map((item) => (
                <View key={item.clientId} style={styles.treeCard}>
                  {item.localImagePath ? (
                    <Image source={{ uri: item.localImagePath }} style={styles.treeThumb} />
                  ) : (
                    <View style={[styles.treeThumb, styles.treeThumbPlaceholder]}>
                      <Text style={{ fontSize: 24 }}>🌳</Text>
                    </View>
                  )}

                  <View style={styles.treeInfo}>
                    <Text style={styles.treeSpecies}>{item.speciesName}</Text>
                    <Text style={styles.treeLocation}>
                      📍 {item.municipio} ({item.latitude.toFixed(4)}, {item.longitude.toFixed(4)})
                    </Text>
                    <Text style={styles.treeDate}>
                      {item.observationDate} · {item.healthState}
                    </Text>
                    {item.syncError && <Text style={styles.treeError}>{item.syncError}</Text>}
                  </View>

                  <View style={styles.treeStatusBadge}>
                    <Text
                      style={[
                        styles.treeStatusText,
                        item.syncStatus === 'SYNCED' ? styles.statusSynced : styles.statusPending
                      ]}
                    >
                      {item.syncStatus === 'SYNCED' ? '✓ Subido' : '⏳ Pendiente'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Especies Nativas de La Guajira</Text>
            <Text style={styles.sectionDescription}>
              Catálogo precargado para identificación rápida en zonas sin conectividad celular.
            </Text>

            {GUAJIRA_ESPECIES_NATIVAS.map((sp) => (
              <TouchableOpacity
                key={sp.name}
                style={styles.catalogCard}
                onPress={() => {
                  setSpeciesName(sp.name);
                  setActiveTab('capture');
                }}
              >
                <Text style={styles.catalogIcon}>{sp.icon}</Text>
                <View style={styles.catalogBody}>
                  <Text style={styles.catalogName}>{sp.name}</Text>
                  <Text style={styles.catalogScientific}>{sp.scientific}</Text>
                  <Text style={styles.catalogTag}>{sp.tag}</Text>
                </View>
                <Text style={styles.catalogSelectText}>Seleccionar →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === 'settings' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Configuración de Enlace</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌐 Servidor EcoRaíces</Text>
              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="https://ecoraices.neuraljira.tech"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Mi Territorio / Municipio Habitual</Text>
              <TextInput
                style={styles.input}
                value={userLocation}
                onChangeText={setUserLocation}
                placeholder="Ej. Riohacha, Dibulla, Uribia..."
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🔑 Token JWT de Sesión (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={token}
                onChangeText={setToken}
                placeholder="Pega el token para asociar observaciones a tu cuenta"
                multiline
              />
            </View>

            <TouchableOpacity style={styles.btnSave} onPress={handleSaveSettings}>
              <Text style={styles.btnSaveText}>Guardar Configuración</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a472a'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a472a'
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  headerIcon: {
    fontSize: 26
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a7f3d0'
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6
  },
  syncPillOnline: {
    backgroundColor: '#064e3b'
  },
  syncPillPending: {
    backgroundColor: '#7c2d12'
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  syncDotOnline: {
    backgroundColor: '#34d399'
  },
  syncDotPending: {
    backgroundColor: '#fb923c'
  },
  syncPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#143820',
    borderBottomWidth: 1,
    borderBottomColor: '#245937'
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center'
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#34d399'
  },
  tabText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  sectionContainer: {
    padding: 14,
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6
  },
  subLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb'
  },
  inputMultiline: {
    minHeight: 50,
    textAlignVertical: 'top'
  },
  btnSmallGps: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  btnSmallGpsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  coordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center'
  },
  coordBox: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  coordLabel: {
    fontSize: 10,
    color: '#15803d',
    fontWeight: 'bold'
  },
  coordVal: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600'
  },
  accuracyTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 4
  },
  noCoordsText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 4
  },
  chip: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6
  },
  chipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a'
  },
  chipText: {
    fontSize: 12,
    color: '#4b5563'
  },
  chipTextActive: {
    color: '#15803d',
    fontWeight: 'bold'
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  healthChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb'
  },
  healthChipText: {
    fontSize: 12,
    color: '#374151'
  },
  btnCamera: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb'
  },
  btnCameraIcon: {
    fontSize: 32,
    marginBottom: 4
  },
  btnCameraText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600'
  },
  photoPreviewContainer: {
    position: 'relative'
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8
  },
  btnRemovePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  btnRemovePhotoText: {
    color: '#fff',
    fontSize: 11
  },
  continuousModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8
  },
  continuousModeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    flex: 1
  },
  btnSave: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    elevation: 3
  },
  btnSaveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    justifyContent: 'space-around',
    elevation: 2
  },
  statCol: {
    alignItems: 'center'
  },
  statNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2
  },
  btnSync: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  btnSyncDisabled: {
    backgroundColor: '#9ca3af'
  },
  btnSyncText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  syncProgressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#0284c7',
    marginBottom: 8,
    fontWeight: '600'
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6
  },
  emptyActionText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: 'bold'
  },
  treeCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
    elevation: 1
  },
  treeThumb: {
    width: 50,
    height: 50,
    borderRadius: 6
  },
  treeThumbPlaceholder: {
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  treeInfo: {
    flex: 1,
    marginLeft: 10
  },
  treeSpecies: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827'
  },
  treeLocation: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 1
  },
  treeDate: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 1
  },
  treeError: {
    fontSize: 10,
    color: '#dc2626',
    marginTop: 2
  },
  treeStatusBadge: {
    paddingLeft: 6
  },
  treeStatusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  statusSynced: {
    color: '#16a34a'
  },
  statusPending: {
    color: '#ea580c'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  sectionDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12
  },
  catalogCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    elevation: 1
  },
  catalogIcon: {
    fontSize: 28,
    marginRight: 10
  },
  catalogBody: {
    flex: 1
  },
  catalogName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  catalogScientific: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#6b7280'
  },
  catalogTag: {
    fontSize: 10,
    color: '#059669',
    backgroundColor: '#ecfdf5',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    fontWeight: '600'
  },
  catalogSelectText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: 'bold'
  }
});
