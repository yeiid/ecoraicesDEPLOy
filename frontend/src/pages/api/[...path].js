/**
 * Proxy Catch-All para redirigir peticiones de Astro hacia FastAPI.
 * Esto atrapa todas las llamadas al cliente a /api/* que no tengan 
 * un archivo físico correspondiente en src/pages/api/
 */
// Cache for the working backend URL to avoid probing on every request
let cachedWorkingBackendUrl = null;

import { getCandidateBackendUrls } from '../../lib/backendHosts.js';

export async function ALL({ request, params }) {
  const path = params.path;
  const url = new URL(request.url);
  const search = url.search;

  // Clone headers avoiding problematic proxy headers
  const headers = new Headers(request.headers);
  headers.delete("host");

  const bodyBuffer = request.method !== 'GET' && request.method !== 'HEAD' 
    ? await request.arrayBuffer() 
    : undefined;

  const candidates = cachedWorkingBackendUrl
    ? [cachedWorkingBackendUrl, ...getCandidateBackendUrls().filter(u => u !== cachedWorkingBackendUrl)]
    : getCandidateBackendUrls();

  let lastError = null;
  let lastTargetUrl = '';

  for (const baseUrl of candidates) {
    const targetUrl = `${baseUrl}/api/${path}${search}`;
    lastTargetUrl = targetUrl;

    try {
      console.log(`[Proxy] ${request.method} ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: bodyBuffer,
        redirect: 'follow'
      });

      console.log(`[Proxy] Response: ${response.status} from ${targetUrl}`);
      cachedWorkingBackendUrl = baseUrl;

      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete('content-encoding');
      responseHeaders.delete('content-length');
      responseHeaders.delete('transfer-encoding');

      const buffer = await response.arrayBuffer();

      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.warn(`[Proxy] Failed ${request.method} ${targetUrl}: ${error.message}. Trying next candidate...`);
      lastError = error;
      if (cachedWorkingBackendUrl === baseUrl) {
        cachedWorkingBackendUrl = null;
      }
    }
  }

  console.error(`[Proxy] ALL CANDIDATES FAILED for ${request.method} /api/${path}:`, lastError?.message);
  return new Response(JSON.stringify({
    error: "Backend proxy error",
    detail: `No se pudo conectar al backend en ninguna dirección candidata (última intentada: ${lastTargetUrl})`
  }), {
    status: 502,
    headers: { "Content-Type": "application/json" }
  });
}
