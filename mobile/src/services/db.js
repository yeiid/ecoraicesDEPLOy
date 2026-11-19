/**
 * EcoRaíces Campo · Base de Datos SQLite Nativa Offline
 * Almacenamiento persistente con normalización bidireccional (camelCase / snake_case)
 * compatible con el backend FastAPI de EcoRaíces Web.
 */

import * as SQLite from 'expo-sqlite';

let dbInstance = null;

function normalizeRow(row) {
  if (!row) return row;
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
    clientId: row.clientId,
    client_uuid: row.clientId,
    speciesId: row.speciesId || null,
    communityId: row.communityId || null,
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
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('ecoraices_campo.db');

  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId TEXT UNIQUE NOT NULL,
      userId TEXT,
      speciesId TEXT,
      communityId TEXT,
      speciesName TEXT NOT NULL,
      scientificName TEXT,
      municipio TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
      treeHeight REAL,
      accuracy REAL,
      healthState TEXT,
      notes TEXT,
      localImagePath TEXT,
      syncStatus TEXT DEFAULT 'PENDING',
      syncError TEXT,
      observationDate TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_status ON offline_trees(syncStatus);
  `);

  // Migración suave para tablas creadas en versiones previas
  const extraCols = ['speciesId TEXT', 'communityId TEXT', 'scientificName TEXT', 'treeHeight REAL'];
  for (const colDef of extraCols) {
    try {
      await dbInstance.execAsync(`ALTER TABLE offline_trees ADD COLUMN ${colDef};`);
    } catch (_) {
      // La columna ya existe
    }
  }

  return dbInstance;
}

export function generateTreeClientId() {
  return 'tree_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export async function saveOfflineTree(tree) {
  const db = await getDB();
  const clientId = tree.clientId || tree.client_uuid || generateTreeClientId();
  const now = new Date().toISOString();
  const obsDate = tree.observationDate || now.split('T')[0];

  const speciesName = (tree.speciesName || tree.species_name || 'Árbol Censado').trim();
  const scientificName = (tree.scientificName || tree.scientific_name || '').trim();
  const municipio = (tree.municipio || tree.municipality || 'Riohacha').trim();
  const healthState = tree.healthState || tree.health_state || 'Sano y vigoroso';
  const localImagePath = tree.localImagePath || tree.local_photo_path || null;
  const accuracy = tree.accuracy ?? tree.accuracy_meters ?? null;
  const rawHeight = tree.treeHeight ?? tree.heightMeters ?? null;
  const treeHeight = rawHeight !== null && rawHeight !== undefined && !isNaN(Number(rawHeight))
    ? Number(rawHeight)
    : null;

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_trees (
      clientId, userId, speciesId, communityId, speciesName, scientificName, municipio,
      latitude, longitude, altitude, treeHeight, accuracy, healthState, notes, localImagePath,
      syncStatus, syncError, observationDate, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      clientId,
      tree.userId || null,
      tree.speciesId || tree.species_id || null,
      tree.communityId || tree.community_id || null,
      speciesName,
      scientificName || null,
      municipio,
      Number(tree.latitude),
      Number(tree.longitude),
      tree.altitude !== undefined && tree.altitude !== null ? Number(tree.altitude) : null,
      treeHeight,
      accuracy !== undefined && accuracy !== null ? Number(accuracy) : null,
      healthState,
      tree.notes || null,
      localImagePath,
      tree.syncStatus || 'PENDING',
      null,
      obsDate,
      now
    ]
  );

  return clientId;
}

export async function getPendingTrees() {
  const db = await getDB();
  const rows = await db.getAllAsync(
    `SELECT * FROM offline_trees WHERE syncStatus = 'PENDING' OR syncStatus = 'ERROR' ORDER BY id ASC;`
  );
  return rows.map(normalizeRow);
}

export async function getAllOfflineTrees() {
  const db = await getDB();
  const rows = await db.getAllAsync(`SELECT * FROM offline_trees ORDER BY id DESC;`);
  return rows.map(normalizeRow);
}

export async function getOfflineStats() {
  const db = await getDB();
  const totalRow = await db.getFirstAsync(`SELECT COUNT(*) as count FROM offline_trees;`);
  const pendingRow = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM offline_trees WHERE syncStatus = 'PENDING' OR syncStatus = 'ERROR';`
  );
  const syncedRow = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM offline_trees WHERE syncStatus = 'SYNCED';`
  );

  return {
    total: totalRow?.count || 0,
    pending: pendingRow?.count || 0,
    synced: syncedRow?.count || 0
  };
}

export async function markTreeStatus(clientId, status, errorMsg = null) {
  const db = await getDB();
  await db.runAsync(
    `UPDATE offline_trees SET syncStatus = ?, syncError = ? WHERE clientId = ?;`,
    [status, errorMsg, clientId]
  );
}

export const updateTreeSyncStatus = markTreeStatus;

export async function deleteOfflineTree(clientId) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM offline_trees WHERE clientId = ? OR id = ?;`, [clientId, clientId]);
}
