/**
 * Cliente API unificado para EcoRaíces.
 * En el servidor (SSR), llama directamente al backend FastAPI.
 * En el cliente (browser), usa las rutas proxy de Astro (/api/...).
 */

// Cache for the working backend URL to avoid probing on every request
let cachedWorkingBackendUrl = null;

function getCandidateBackendUrls() {
  const list = [];
  if (typeof process !== 'undefined' && process.env.BACKEND_URL) {
    list.push(process.env.BACKEND_URL);
  }
  list.push('http://backend:8000');
  list.push('http://host.docker.internal:48000');
  list.push('http://172.17.0.1:48000');
  list.push('http://187.124.64.184:48000');
  list.push('http://localhost:48000');
  list.push('http://127.0.0.1:48000');
  // Remove duplicates while preserving order
  return [...new Set(list)];
}

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
  const candidates = cachedWorkingBackendUrl 
    ? [cachedWorkingBackendUrl, ...getCandidateBackendUrls().filter(u => u !== cachedWorkingBackendUrl)]
    : getCandidateBackendUrls();

  let lastError = null;

  for (const baseUrl of candidates) {
    const url = `${baseUrl}/api${path}`;
    try {
      console.log(`[SSR] Fetching: ${url}`);
      const res = await fetch(url, { ...options, headers });
      
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
      return await res.json();
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

export function apiGet(path) {
  return api(path, { method: 'GET' });
}

export function apiPost(path, body) {
  return api(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function apiPatch(path, body) {
  return api(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function apiPut(path, body) {
  return api(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function apiDelete(path) {
  return api(path, { method: 'DELETE' });
}
