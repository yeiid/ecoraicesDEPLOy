/**
 * EcoRaíces Campo · Motor de Sincronización Outbox con FastAPI (/api/observations)
 * Sube cada árbol capturado en campo usando idempotencia clientId, resolución real de
 * speciesId/communityId contra el catálogo del servidor y compatibilidad Web + Android/iOS.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getPendingTrees, markTreeStatus } from './db';
import { DEFAULT_API_BASE_URL } from '../constants/guajira';
import AsyncStorage from '@react-native-async-storage/async-storage';

let isSyncing = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Equivalencias entre nombres locales de respaldo (offline) y especies registradas en PostgreSQL
const SPECIES_ALIAS_TO_SCIENTIFIC = {
  'trupillo': 'prosopis juliflora',
  'guayacan de bola': 'bulnesia arborea',
  'cardon guajiro (yotojolo)': 'stenocereus griseus',
  'cardon guajiro': 'stenocereus griseus',
  'melocactus (buche de agua)': 'melocactus curvispinus',
  'melocactus': 'melocactus curvispinus',
  'dividivi (libidibia)': 'caesalpinia coriaria',
  'dividivi': 'caesalpinia coriaria'
};

async function loadServerContext(apiBase, providedContext = {}) {
  let speciesList = Array.isArray(providedContext.species) ? providedContext.species : [];
  let communitiesList = Array.isArray(providedContext.communities) ? providedContext.communities : [];

  if (speciesList.length === 0) {
    try {
      const res = await fetch(`${apiBase}/api/species`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) speciesList = data;
      }
    } catch (_) {
      try {
        const cached = await AsyncStorage.getItem('ecoraices_cached_species');
        if (cached) speciesList = JSON.parse(cached);
      } catch (_) {}
    }
  }

  if (communitiesList.length === 0) {
    try {
      const res = await fetch(`${apiBase}/api/communities`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) communitiesList = data;
      }
    } catch (_) {
      try {
        const cached = await AsyncStorage.getItem('ecoraices_cached_communities');
        if (cached) communitiesList = JSON.parse(cached);
      } catch (_) {}
    }
  }

  return { species: speciesList, communities: communitiesList };
}

function resolveSpeciesPayload(item, serverSpecies) {
  const speciesName = (item.speciesName || item.species_name || 'Árbol Censado').trim();
  const rawSci = (item.scientificName || item.scientific_name || '').trim();
  const rawId = item.speciesId ? String(item.speciesId).trim() : '';

  const list = Array.isArray(serverSpecies) ? serverSpecies : [];
  const normName = normalizeText(speciesName);
  const normSci = normalizeText(rawSci);
  const aliasSci = SPECIES_ALIAS_TO_SCIENTIFIC[normName] || '';

  // 1. Verificar si speciesId existe realmente en la base de datos remota
  let matched = rawId ? list.find((s) => String(s.id) === rawId) : null;

  // 2. Buscar coincidencia por nombre común exacto
  if (!matched && normName) {
    matched = list.find((s) => normalizeText(s.name) === normName);
  }

  // 3. Buscar coincidencia por nombre científico exacto o alias conocido
  if (!matched && (normSci || aliasSci)) {
    matched = list.find((s) => {
      const sSci = normalizeText(s.scientificName || s.scientific_name);
      return (normSci && sSci === normSci) || (aliasSci && sSci === aliasSci);
    });
  }

  if (matched) {
    return {
      speciesId: String(matched.id),
      nombreComunitario: matched.name || speciesName,
      // Siempre enviar nombreCientificoPropuesto no vacío para compatibilidad con el enum ObservationStatus=PENDING en PostgreSQL
      nombreCientificoPropuesto: matched.scientificName || matched.scientific_name || rawSci || 'Especie catalogada'
    };
  }

  // Si la especie no existe aún en el servidor:
  // - NO enviar un speciesId local ficticio (evita ForeignKeyViolation 500)
  // - Evitar colisión UNIQUE en Species.scientificName si rawSci ya pertenece a otra especie
  const sciAlreadyUsed = rawSci && list.some(
    (s) => normalizeText(s.scientificName || s.scientific_name) === normSci
  );
  const shortTag = String(item.clientId || Date.now()).slice(-6);
  const safeScientific = (!rawSci || sciAlreadyUsed)
    ? `Pendiente (${speciesName.slice(0, 18)} - ${shortTag})`
    : rawSci;

  return {
    speciesId: null,
    nombreComunitario: speciesName,
    nombreCientificoPropuesto: safeScientific
  };
}

function resolveCommunityId(rawCommunityId, serverCommunities) {
  if (!rawCommunityId) return null;
  const cleanId = String(rawCommunityId).trim();
  if (!cleanId) return null;
  if (!Array.isArray(serverCommunities) || serverCommunities.length === 0) {
    // Evitar enviar IDs de respaldo locales (como 'eco-riohacha') si no pudimos verificar comunidades
    if (/^(eco-|custodios-|macuira-|manaure-)/.test(cleanId)) return null;
    return cleanId;
  }
  const exists = serverCommunities.some((c) => String(c.id) === cleanId);
  return exists ? cleanId : null;
}

export async function uploadSingleObservation(item, apiBase, authToken, serverContext = null) {
  const cleanBase = (apiBase || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '');
  const ctx = serverContext || (await loadServerContext(cleanBase));

  const lat = Number(item.latitude ?? item.lat);
  const lng = Number(item.longitude ?? item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('La observación no tiene coordenadas GPS válidas.');
  }

  const formData = new FormData();
  const clientId = item.clientId || item.client_uuid;
  const resolvedSp = resolveSpeciesPayload(item, ctx.species);
  const resolvedCommunityId = resolveCommunityId(item.communityId || item.community_id, ctx.communities);
  const municipio = (item.municipio || item.municipality || 'Sin municipio').trim();
  const healthState = (item.healthState || item.health_state || 'Sano y vigoroso').trim();
  const rawDate = String(item.observationDate || new Date().toISOString().split('T')[0]).trim();
  const obsDate = /^\d{4}-\d{2}-\d{2}/.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

  if (clientId) formData.append('clientId', String(clientId));
  if (resolvedSp.speciesId) formData.append('speciesId', resolvedSp.speciesId);
  formData.append('nombreComunitario', resolvedSp.nombreComunitario);
  formData.append('nombreCientificoPropuesto', resolvedSp.nombreCientificoPropuesto);
  if (resolvedCommunityId) formData.append('communityId', resolvedCommunityId);
  formData.append('municipio', municipio);
  formData.append('latitude', String(lat));
  formData.append('longitude', String(lng));

  if (item.altitude !== null && item.altitude !== undefined && Number.isFinite(Number(item.altitude))) {
    formData.append('altitude', String(item.altitude));
  }
  const treeH = item.treeHeight ?? item.heightMeters;
  const hasValidTreeH = treeH !== null && treeH !== undefined && Number.isFinite(Number(treeH)) && Number(treeH) >= 2 && Number(treeH) <= 45;
  if (hasValidTreeH) {
    formData.append('alturaArbol', String(Number(treeH)));
  }
  if (healthState) {
    formData.append('estadoFitosanitario', healthState);
  }
  const baseNotes = item.notes && String(item.notes).trim() ? String(item.notes).trim() : '';
  const heightNote = hasValidTreeH && !/Altura:\s*\d/i.test(baseNotes) ? `Altura: ${Number(treeH)}m.` : '';
  const combinedNotes = [heightNote, baseNotes].filter(Boolean).join(' ').trim();
  if (combinedNotes) {
    formData.append('notes', combinedNotes);
  }
  formData.append('observationDate', obsDate);

  const imgUri = item.localImagePath || item.local_photo_path;
  if (imgUri) {
    if (Platform.OS === 'web') {
      try {
        const blobRes = await fetch(imgUri);
        if (blobRes.ok) {
          const blob = await blobRes.blob();
          if (blob && blob.size > 0) {
            formData.append('image', blob, 'tree_capture.jpg');
          }
        }
      } catch (_) {
        // Si la URI web expiró, continuar sin adjunto binario
      }
    } else {
      try {
        const info = await FileSystem.getInfoAsync(imgUri);
        if (info.exists && (!info.size || info.size > 0)) {
          const fileName = imgUri.split('/').pop() || 'tree_capture.jpg';
          const ext = fileName.split('.').pop()?.toLowerCase();
          const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          formData.append('image', {
            uri: imgUri,
            name: fileName,
            type: mimeType
          });
        }
      } catch (_) {
        // Si el archivo local fue borrado del almacenamiento, subir los datos GPS/botánicos sin fallar
      }
    }
  }

  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${cleanBase}/api/observations`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    let errData = {};
    try {
      errData = rawBody ? JSON.parse(rawBody) : {};
    } catch (_) {}

    const errMsg = Array.isArray(errData.detail)
      ? errData.detail[0]?.msg || `Error HTTP ${response.status}`
      : (errData.detail || errData.message || (rawBody && rawBody.length < 180 ? rawBody : `Error HTTP ${response.status}`));
    throw new Error(errMsg);
  }

  return await response.json();
}

export async function syncOfflineOutbox(optionsOrCallback = null) {
  if (isSyncing) {
    return { success: false, total: 0, synced: 0, failed: 0, message: 'Ya hay una sincronización en curso' };
  }

  const isOptionsObj =
    optionsOrCallback && typeof optionsOrCallback === 'object' && !Array.isArray(optionsOrCallback);
  const onProgress =
    typeof optionsOrCallback === 'function'
      ? optionsOrCallback
      : isOptionsObj && typeof optionsOrCallback.onProgress === 'function'
      ? optionsOrCallback.onProgress
      : null;

  isSyncing = true;
  try {
    const queue = await getPendingTrees();
    if (!queue.length) {
      return { success: true, total: 0, synced: 0, failed: 0, errors: [] };
    }

    const apiBase = ((isOptionsObj && optionsOrCallback.apiBaseUrl) || DEFAULT_API_BASE_URL)
      .trim()
      .replace(/\/+$/, '');
    const authToken =
      (isOptionsObj && optionsOrCallback.token) ||
      (await AsyncStorage.getItem('ecoraices_auth_token'));

    if (!authToken) {
      throw new Error('Debes iniciar sesión en la pestaña Perfil para sincronizar tus árboles con el servidor.');
    }

    // Precargar catálogo real de especies y comunidades una sola vez por lote de sincronización
    const serverContext = await loadServerContext(apiBase, {
      species: isOptionsObj ? optionsOrCallback.species : undefined,
      communities: isOptionsObj ? optionsOrCallback.communities : undefined
    });

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
        await uploadSingleObservation(item, apiBase, authToken, serverContext);
        await markTreeStatus(item.clientId, 'SYNCED', null);
        synced++;
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
