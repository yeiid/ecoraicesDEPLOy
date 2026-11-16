/**
 * EcoRaíces Campo · Almacenamiento Web (Fallback para navegador en localhost:8081)
 * Utiliza AsyncStorage en el navegador web para emular la base de datos SQLite nativa.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ecoraices_offline_trees_web';

export async function getDB() {
  return true;
}

export function generateTreeClientId() {
  return 'tree_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export async function saveOfflineTree(tree) {
  const clientId = tree.client_uuid || tree.clientId || generateTreeClientId();
  const now = new Date().toISOString();
  const obsDate = tree.observationDate || now.split('T')[0];

  const newTree = {
    id: Date.now(),
    clientId,
    species_name: tree.species_name || tree.speciesName,
    scientific_name: tree.scientific_name || tree.scientificName,
    municipality: tree.municipality || tree.municipio,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    altitude: tree.altitude ? Number(tree.altitude) : null,
    accuracy: tree.accuracy_meters || tree.accuracy || 10,
    height_meters: tree.height_meters || null,
    diameter_cm: tree.diameter_cm || null,
    health_state: tree.health_state || tree.healthState || 'Sano y vigoroso',
    notes: tree.notes || '',
    local_photo_path: tree.local_photo_path || tree.localImagePath || null,
    sync_status: 'PENDING',
    sync_error: null,
    observationDate: obsDate,
    createdAt: now
  };

  const list = await getAllOfflineTrees();
  list.unshift(newTree);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

  return clientId;
}

export async function getPendingTrees() {
  const list = await getAllOfflineTrees();
  return list.filter((t) => t.sync_status === 'PENDING' || t.sync_status === 'ERROR');
}

export async function getAllOfflineTrees() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getOfflineStats() {
  const list = await getAllOfflineTrees();
  const pending = list.filter((t) => t.sync_status === 'PENDING' || t.sync_status === 'ERROR').length;
  const synced = list.filter((t) => t.sync_status === 'SYNCED').length;
  return {
    total: list.length,
    pending,
    synced
  };
}

export async function updateTreeSyncStatus(clientId, status, errorMsg = null) {
  const list = await getAllOfflineTrees();
  const updated = list.map((t) => {
    if (t.clientId === clientId) {
      return {
        ...t,
        sync_status: status,
        sync_error: errorMsg
      };
    }
    return t;
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteOfflineTree(clientId) {
  const list = await getAllOfflineTrees();
  const filtered = list.filter((t) => t.clientId !== clientId && t.id !== clientId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
