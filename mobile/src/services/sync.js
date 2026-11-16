/**
 * EcoRaíces Campo · Motor de Sincronización Outbox
 * Sube secuencialmente cada árbol capturado en campo usando idempotencia clientId.
 */

import { getPendingTrees, markTreeStatus } from './db';
import { DEFAULT_API_BASE_URL } from '../constants/guajira';
import AsyncStorage from '@react-native-async-storage/async-storage';

let isSyncing = false;

export async function syncOfflineOutbox(onProgress = null) {
  if (isSyncing) {
    return { success: false, message: 'Ya hay una sincronización en curso' };
  }

  isSyncing = true;
  try {
    const queue = await getPendingTrees();
    if (!queue.length) {
      return { success: true, total: 0, synced: 0, failed: 0 };
    }

    const savedDomain = await AsyncStorage.getItem('ecoraices_server_url');
    const apiBase = (savedDomain || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    const authToken = await AsyncStorage.getItem('ecoraices_auth_token');

    let synced = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (onProgress) {
        onProgress({ current: i + 1, total: queue.length, tree: item });
      }

      await markTreeStatus(item.clientId, 'SYNCING');

      try {
        const formData = new FormData();
        formData.append('clientId', item.clientId);
        formData.append('nombreComunitario', item.speciesName);
        formData.append('municipio', item.municipio);
        formData.append('latitude', String(item.latitude));
        formData.append('longitude', String(item.longitude));
        if (item.altitude !== null && item.altitude !== undefined) {
          formData.append('altitude', String(item.altitude));
        }
        if (item.healthState) {
          formData.append('estadoFitosanitario', item.healthState);
        }
        if (item.notes) {
          formData.append('notes', item.notes);
        }
        formData.append('observationDate', item.observationDate);

        if (item.localImagePath) {
          const fileName = item.localImagePath.split('/').pop() || 'tree.jpg';
          formData.append('image', {
            uri: item.localImagePath,
            name: fileName,
            type: 'image/jpeg'
          });
        }

        const headers = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${apiBase}/api/observations`, {
          method: 'POST',
          headers,
          body: formData
        });

        if (response.ok) {
          await markTreeStatus(item.clientId, 'SYNCED');
          synced++;
        } else {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.detail || errData.message || `Error HTTP ${response.status}`;
          await markTreeStatus(item.clientId, 'ERROR', errMsg);
          failed++;
          errors.push({ clientId: item.clientId, error: errMsg });
        }
      } catch (uploadErr) {
        const msg = uploadErr?.message || 'Fallo de conexión';
        await markTreeStatus(item.clientId, 'ERROR', msg);
        failed++;
        errors.push({ clientId: item.clientId, error: msg });
      }
    }

    return {
      success: failed === 0,
      total: queue.length,
      synced,
      failed,
      errors
    };
  } finally {
    isSyncing = false;
  }
}
