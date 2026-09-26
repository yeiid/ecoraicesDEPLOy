/**
 * Cliente API unificado para EcoRaíces.
 * En el servidor (SSR), llama directamente al backend FastAPI.
 * En el cliente (browser), usa las rutas proxy de Astro (/api/...).
 */

// Cache for the working backend URL to avoid probing on every request
let cachedWorkingBackendUrl = null;

// Fase 2 velocidad: memo TTL en memoria para GETs casi-estáticos (categorías,
// hábitats, stats). Evita re-pegar al backend en cada hit SSR.
const responseCache = new Map();
const CACHE_TTL_MS = 60_000;
const CACHEABLE_PREFIXES = ['/categories', '/species/habitats', '/stats'];

function getCachedGet(path) {
  if (!CACHEABLE_PREFIXES.some((p) => path === p || path.startsWith(p + '?') || path.startsWith(p + '/') && p !== '/stats')) return null;
  // /stats con query no se cachea; paths con ID tampoco (solo listas base)
  if (path.includes('/related')) return null;
  const entry = responseCache.get(path);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    responseCache.delete(path);
    return null;
  }
  return entry.data;
}

function setCachedGet(path, data) {
  if (!CACHEABLE_PREFIXES.some((p) => path === p || path.startsWith(p + '?'))) return;
  if (path.includes('/related')) return;
  // Limitar tamaño: solo listas pequeñas
  try {
    const size = JSON.stringify(data)?.length || 0;
    if (size > 200_000) return;
  } catch { /* noop */ }
  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(path, { at: Date.now(), data });
}

import { getCandidateBackendUrls } from '../backendHosts.js';

export async function api(path, options = {}) {
  const isServer = typeof window === 'undefined';

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (!isServer) {
    // Client-side browser request uses Astro proxy (/api/...)
    const url = `/api${path}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error = new Error(err.message || err.detail || `Error ${res.status}`);
      error.status = res.status;
      error.data = err;
      throw error;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  // SSR Server-side request with multi-host fallback
  const isGet = !options.method || options.method === 'GET';
  if (isServer && isGet) {
    const cached = getCachedGet(path);
    if (cached !== null) return cached;
  }

  const candidates = cachedWorkingBackendUrl 
    ? [cachedWorkingBackendUrl, ...getCandidateBackendUrls().filter(u => u !== cachedWorkingBackendUrl)]
    : getCandidateBackendUrls();

  let lastError = null;

  for (const baseUrl of candidates) {
    const url = `${baseUrl}/api${path}`;
    try {
      if (import.meta.env?.DEV) console.log(`[SSR] Fetching: ${url}`);
      // Fase 2: timeout para no colgar el SSR si un host está muerto
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 2500);
      let res;
      try {
        res = await fetch(url, { ...options, headers, signal: ctrl.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      
      // If we got a response (even a 404/401/etc. from FastAPI), connection was successful
      cachedWorkingBackendUrl = baseUrl;
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const error = new Error(err.message || err.detail || `Error ${res.status}`);
        error.status = res.status;
        error.data = err;
        throw error;
      }
      if (res.status === 204) return null;
      const data = await res.json();
      if (isGet) setCachedGet(path, data);
      return data;
    } catch (err) {
      // If it's an HTTP error with status from backend, don't fallback to other hosts, throw it
      if (err.status) {
        throw err;
      }
      // Connection/Network error (ECONNREFUSED, ENOTFOUND, fetch failed)
      console.warn(`[SSR] Connection failed to ${url}: ${err.message}. Trying next candidate...`);
      lastError = err;
      if (cachedWorkingBackendUrl === baseUrl) {
        cachedWorkingBackendUrl = null;
      }
    }
  }

  throw lastError || new Error(`No backend host could be reached for path ${path}`);
}

export function apiGet(path, options = {}) {
  return api(path, { ...options, method: 'GET' });
}

export function apiPost(path, body, options = {}) {
  return api(path, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPatch(path, body, options = {}) {
  return api(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiPut(path, body, options = {}) {
  return api(path, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function apiDelete(path, options = {}) {
  return api(path, { ...options, method: 'DELETE' });
}
