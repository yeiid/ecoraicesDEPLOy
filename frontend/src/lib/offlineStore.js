/**
 * EcoRaíces · IndexedDB Offline Store
 * Provee almacenamiento persistente e ilimitado para árboles registrados sin conexión celular.
 * Supera la limitación de 5MB de localStorage permitiendo guardar decenas de fotos y metadatos.
 */

const DB_NAME = 'ecoraices_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_trees';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está soportado en este entorno.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Guarda una nueva observación offline en IndexedDB
 * @param {Object} treeData Metadatos de la observación
 * @param {Blob|null} imageBlob Archivo binario comprimido
 * @param {string} imageName Nombre del archivo
 */
export async function saveOfflineObservation(treeData, imageBlob = null, imageName = 'tree.webp') {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      treeData,
      imageBlob,
      imageName,
      createdAt: new Date().toISOString(),
      syncAttempts: 0,
      lastError: null
    };

    const req = store.add(record);
    req.onsuccess = () => {
      notifyQueueChange();
      resolve(record.id);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene todas las observaciones pendientes por sincronizar
 */
export async function getPendingObservations() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Elimina un registro una vez sincronizado exitosamente con el servidor
 */
export async function removePendingObservation(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => {
      notifyQueueChange();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Cuenta cuántos árboles están esperando conexión
 */
export async function getPendingCount() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();

      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Dispara un evento global en window para que el widget de la navbar y el formulario
 * se actualicen reactivamente en tiempo real.
 */
function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    getPendingCount().then((count) => {
      window.dispatchEvent(new CustomEvent('ecoraices:sync-count-changed', {
        detail: { count }
      }));
    });
  }
}
