/**
 * EcoRaíces · IndexedDB Offline Store
 * Provee almacenamiento persistente e ilimitado para árboles registrados sin conexión celular.
 * Supera la limitación de 5MB de localStorage permitiendo guardar decenas de fotos y metadatos.
 */

const DB_NAME = 'ecoraices_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_trees';

let storagePersistRequested = false;

function requestPersistentStorageOnce() {
  if (storagePersistRequested || typeof navigator === 'undefined') return;
  storagePersistRequested = true;
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().catch(() => {});
  }
}

export function generateClientObservationId() {
  return 'obs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
}

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
 * @param {string|null} customId UUID/clientId pre-generado para idempotencia
 */
export async function saveOfflineObservation(
  treeData,
  imageBlob = null,
  imageName = 'tree.webp',
  customId = null
) {
  requestPersistentStorageOnce();

  let imageBuffer = null;
  let imageType = 'image/webp';
  if (imageBlob && typeof imageBlob.arrayBuffer === 'function') {
    try {
      imageBuffer = await imageBlob.arrayBuffer();
      imageType = imageBlob.type || 'image/webp';
    } catch {
      imageBuffer = null;
    }
  }

  const db = await openDB();
  const recordId = customId || treeData?.clientId || generateClientObservationId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      id: recordId,
      treeData: { ...treeData, clientId: recordId },
      imageBlob,
      imageBuffer,
      imageType,
      imageName: imageName || 'tree.webp',
      createdAt: new Date().toISOString(),
      syncAttempts: 0,
      lastError: null
    };

    const req = store.put(record);
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
 * Registra el intento fallido y el mensaje de error en un registro pendiente
 */
export async function markObservationSyncError(id, errorMessage) {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) return resolve();
        record.syncAttempts = (record.syncAttempts || 0) + 1;
        record.lastError = errorMessage;
        record.lastAttemptAt = new Date().toISOString();
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch {
    // noop
  }
}

/**
 * Reconstruye de forma segura el Blob de imagen aunque el navegador haya hibernado la pestaña
 */
function resolveRecordImageBlob(item) {
  if (item.imageBuffer && item.imageBuffer.byteLength > 0) {
    return new Blob([item.imageBuffer], { type: item.imageType || 'image/webp' });
  }
  if (item.imageBlob && item.imageBlob.size > 0) {
    return item.imageBlob;
  }
  return null;
}

/**
 * Sincronizador único global con candado (Mutex) para evitar condiciones de carrera
 * entre GlobalSyncWidget, NewObservationForm y múltiples eventos 'online'.
 */
export async function syncPendingObservations() {
  if (typeof window === 'undefined') {
    return { total: 0, syncedCount: 0, failedCount: 0, authError: false, lastError: null };
  }

  if (!navigator.onLine) {
    return { total: 0, syncedCount: 0, failedCount: 0, authError: false, lastError: 'Sin conexión a internet' };
  }

  // Si ya hay una sincronización en curso, reutilizar la misma promesa en vez de duplicar envíos
  if (window.__ecoraicesActiveSyncPromise) {
    return window.__ecoraicesActiveSyncPromise;
  }

  window.__ecoraicesActiveSyncPromise = (async () => {
    const queue = await getPendingObservations();
    if (!queue.length) {
      return { total: 0, syncedCount: 0, failedCount: 0, authError: false, lastError: null };
    }

    window.dispatchEvent(new CustomEvent('ecoraices:sync-started', {
      detail: { total: queue.length }
    }));

    let syncedCount = 0;
    let failedCount = 0;
    let authError = false;
    let lastError = null;

    for (const item of queue) {
      if (!navigator.onLine) {
        lastError = 'La señal se perdió durante la sincronización.';
        break;
      }

      try {
        const fd = new FormData();
        const data = item.treeData || {};
        const clientId = item.id || data.clientId || generateClientObservationId();

        fd.append('clientId', String(clientId));

        Object.entries(data).forEach(([k, v]) => {
          if (k === 'clientId' || k === 'imageName') return;
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            fd.append(k, String(v));
          }
        });

        const blob = resolveRecordImageBlob(item);
        if (blob) {
          fd.append('image', blob, item.imageName || data.imageName || 'tree.webp');
        }

        const res = await fetch('/api/observations', {
          method: 'POST',
          body: fd
        });

        if (res.ok) {
          await removePendingObservation(item.id);
          syncedCount++;
        } else {
          const errBody = await res.json().catch(() => ({}));
          const detail = errBody.detail || errBody.message || `Error HTTP ${res.status}`;
          lastError = detail;
          failedCount++;
          await markObservationSyncError(item.id, detail);

          if (res.status === 401) {
            authError = true;
            lastError = 'Tu sesión expiró. Inicia sesión nuevamente para subir los árboles guardados.';
            break;
          }
        }
      } catch (err) {
        const msg = err?.message || 'Error de red al subir árbol';
        lastError = msg;
        failedCount++;
        await markObservationSyncError(item.id, msg);
      }
    }

    const result = {
      total: queue.length,
      syncedCount,
      failedCount,
      authError,
      lastError
    };

    if (syncedCount > 0) {
      window.dispatchEvent(new CustomEvent('ecoraices:sync-completed', {
        detail: { count: syncedCount, ...result }
      }));
    }

    if (failedCount > 0 || authError) {
      window.dispatchEvent(new CustomEvent('ecoraices:sync-error', {
        detail: result
      }));
    }

    notifyQueueChange();
    return result;
  })();

  try {
    return await window.__ecoraicesActiveSyncPromise;
  } finally {
    window.__ecoraicesActiveSyncPromise = null;
  }
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
