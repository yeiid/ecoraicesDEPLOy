/**
 * Proxy Catch-All para redirigir peticiones de Astro hacia FastAPI.
 * Incluye timeout por candidato (5s) para evitar cuelgues indefinidos
 * cuando el backend está caído o bajo carga extrema.
 */
let cachedWorkingBackendUrl = null;

import { getCandidateBackendUrls } from '../../lib/backendHosts.js';

const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 5000);

export async function ALL({ request, params }) {
  const path = params.path;
  const url = new URL(request.url);
  const search = url.search;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: bodyBuffer,
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
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
