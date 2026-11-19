/**
 * EcoRaíces Campo · Almacenamiento Web (Fallback para navegador en localhost:8081)
 * Paridad 100% con db.js (SQLite nativo) y compatible con sync.js y FastAPI.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ecoraices_offline_trees_web';

function normalizeRow(row) {
  if (!row) return row;
  const clientId = row.clientId || row.client_uuid || ('tree_' + (row.id || Date.now()));
  const speciesName = row.speciesName || row.species_name || 'Árbol Censado';
  const scientificName = row.scientificName || row.scientific_name || '';
  const municipio = row.municipio || row.municipality || 'Riohacha';
  const healthState = row.healthState || row.health_state || 'Sano y vigoroso';
  const localImagePath = row.localImagePath || row.local_photo_path || null;
  const syncStatus = row.syncStatus || row.sync_status || 'PENDING';
  const syncError = row.syncError || row.sync_error || null;

  const treeHeight = row.treeHeight ?? row.heightMeters ?? null;

  return {
    ...row,
    clientId,
    client_uuid: clientId,
    speciesId: row.speciesId || row.species_id || null,
    communityId: row.communityId || row.community_id || null,
    speciesName,
    species_name: speciesName,
    scientificName,
    scientific_name: scientificName,
    municipio,
    municipality: municipio,
    healthState,
    health_state: healthState,
    treeHeight,
    heightMeters: treeHeight,
    localImagePath,
    local_photo_path: localImagePath,
    syncStatus,
    sync_status: syncStatus,
    syncError,
    sync_error: syncError
  };
}

export async function getDB() {
  return true;
}

export function generateTreeClientId() {
  return 'tree_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export async function saveOfflineTree(tree) {
  const clientId = tree.clientId || tree.client_uuid || generateTreeClientId();
  const now = new Date().toISOString();
  const obsDate = tree.observationDate || now.split('T')[0];

  const speciesName = (tree.speciesName || tree.species_name || 'Árbol Censado').trim();
  const scientificName = (tree.scientificName || tree.scientific_name || '').trim();
  const municipio = (tree.municipio || tree.municipality || 'Riohacha').trim();
  const healthState = tree.healthState || tree.health_state || 'Sano y vigoroso';
  const localImagePath = tree.localImagePath || tree.local_photo_path || null;
  const syncStatus = tree.syncStatus || tree.sync_status || 'PENDING';
  const rawHeight = tree.treeHeight ?? tree.heightMeters ?? null;
  const treeHeight = rawHeight !== null && rawHeight !== undefined && !isNaN(Number(rawHeight))
    ? Number(rawHeight)
    : null;

  const newTree = normalizeRow({
    id: Date.now(),
    clientId,
    speciesId: tree.speciesId || tree.species_id || null,
    communityId: tree.communityId || tree.community_id || null,
    speciesName,
    scientificName,
    municipio,
    latitude: Number(tree.latitude),
    longitude: Number(tree.longitude),
    altitude: tree.altitude !== undefined && tree.altitude !== null ? Number(tree.altitude) : null,
    treeHeight,
    accuracy: tree.accuracy_meters || tree.accuracy || 10,
    healthState,
    notes: tree.notes || '',
    localImagePath,
    syncStatus,
    syncError: null,
    observationDate: obsDate,
    createdAt: now
  });

  const list = await getAllOfflineTrees();
  const filtered = list.filter((t) => t.clientId !== clientId);
  filtered.unshift(newTree);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  return clientId;
}

export async function getPendingTrees() {
  const list = await getAllOfflineTrees();
  return list.filter((t) => t.syncStatus === 'PENDING' || t.syncStatus === 'ERROR');
}

export async function getAllOfflineTrees() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeRow) : [];
  } catch {
    return [];
  }
}

export async function getOfflineStats() {
  const list = await getAllOfflineTrees();
  const pending = list.filter((t) => t.syncStatus === 'PENDING' || t.syncStatus === 'ERROR').length;
  const synced = list.filter((t) => t.syncStatus === 'SYNCED').length;
  return {
    total: list.length,
    pending,
    synced
  };
}

export async function markTreeStatus(clientId, status, errorMsg = null) {
  const list = await getAllOfflineTrees();
  const updated = list.map((t) => {
    if (t.clientId === clientId || t.id === clientId) {
      return normalizeRow({
        ...t,
        syncStatus: status,
        sync_status: status,
        syncError: errorMsg,
        sync_error: errorMsg
      });
    }
    return t;
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export const updateTreeSyncStatus = markTreeStatus;

export async function deleteOfflineTree(clientId) {
  const list = await getAllOfflineTrees();
  const filtered = list.filter((t) => t.clientId !== clientId && t.id !== clientId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
