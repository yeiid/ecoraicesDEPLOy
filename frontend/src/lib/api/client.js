/**
 * Cliente API unificado para EcoRaíces.
 * En el servidor (SSR), llama directamente al backend FastAPI.
 * En el cliente (browser), usa las rutas proxy de Astro (/api/...).
 */

export async function api(path, options = {}) {
  const isServer = typeof window === 'undefined';
  
  // En SSR, leemos la variable de entorno en RUNTIME (process.env) en lugar de BUILD TIME (import.meta.env).
  // Si no existe, asume que el servicio de docker-compose se llama 'backend' y usa el puerto 8000.
  let backendUrl = 'http://backend:8000';
  if (isServer && typeof process !== 'undefined' && process.env.BACKEND_URL) {
    backendUrl = process.env.BACKEND_URL;
  } else if (!isServer) {
    backendUrl = import.meta.env.PUBLIC_API_URL || 'http://backend:8000';
  }

  const url = isServer
    ? `${backendUrl}/api${path}`
    : `/api${path}`;

  if (isServer) {
    console.log(`[SSR] Fetching: ${url}`);
  }

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
