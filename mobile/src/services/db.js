/**
 * EcoRaíces Campo · Base de Datos SQLite Nativa Offline
 * Almacenamiento persistente e indestructible que sobrevive semanas sin conexión.
 */

import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('ecoraices_campo.db');

  // Inicializar tabla si no existe
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId TEXT UNIQUE NOT NULL,
      userId TEXT,
      speciesName TEXT NOT NULL,
      municipio TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
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

  return dbInstance;
}

export function generateTreeClientId() {
  return 'tree_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

export async function saveOfflineTree(tree) {
  const db = await getDB();
  const clientId = tree.clientId || generateTreeClientId();
  const now = new Date().toISOString();
  const obsDate = tree.observationDate || now.split('T')[0];

  await db.runAsync(
    `INSERT OR REPLACE INTO offline_trees (
      clientId, userId, speciesName, municipio, latitude, longitude,
      altitude, accuracy, healthState, notes, localImagePath,
      syncStatus, syncError, observationDate, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      clientId,
      tree.userId || null,
      tree.speciesName,
      tree.municipio,
      Number(tree.latitude),
      Number(tree.longitude),
      tree.altitude !== undefined && tree.altitude !== null ? Number(tree.altitude) : null,
      tree.accuracy !== undefined && tree.accuracy !== null ? Number(tree.accuracy) : null,
      tree.healthState || 'Sano y vigoroso',
      tree.notes || null,
      tree.localImagePath || null,
      'PENDING',
      null,
      obsDate,
      now
    ]
  );

  return clientId;
}

export async function getPendingTrees() {
  const db = await getDB();
  return await db.getAllAsync(
    `SELECT * FROM offline_trees WHERE syncStatus = 'PENDING' OR syncStatus = 'ERROR' ORDER BY id ASC;`
  );
}

export async function getAllOfflineTrees() {
  const db = await getDB();
  return await db.getAllAsync(`SELECT * FROM offline_trees ORDER BY id DESC;`);
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

export async function deleteOfflineTree(clientId) {
  const db = await getDB();
  await db.runAsync(`DELETE FROM offline_trees WHERE clientId = ?;`, [clientId]);
}
