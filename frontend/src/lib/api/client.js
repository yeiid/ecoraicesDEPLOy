/**
 * Cliente API unificado para EcoRaíces.
 * En el servidor (SSR), llama directamente al backend FastAPI.
 * En el cliente (browser), usa las rutas proxy de Astro (/api/...).
 */
const BACKEND_URL = import.meta.env.PUBLIC_API_URL || 'http://backend:8000';

export async function api(path, options = {}) {
  const isServer = typeof window === 'undefined';
  const url = isServer
    ? `${BACKEND_URL}/api${path}`
    : `/api${path}`;

  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || err.detail || `Error ${res.status}`);
    error.status = res.status;
    error.data = err;
    throw error;
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return res.json();
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
