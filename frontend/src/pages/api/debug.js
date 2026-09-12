/**
 * Endpoint de diagnóstico — accesible desde el navegador.
 * Visita: https://ecoraices.neuraljira.tech/api/debug
 * Muestra si el frontend puede conectarse al backend.
 */
export async function GET() {
  const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
  const results = {
    timestamp: new Date().toISOString(),
    backendUrl,
    nodeVersion: process.version,
    env: {
      NODE_OPTIONS: process.env.NODE_OPTIONS || '(not set)',
      BACKEND_URL: process.env.BACKEND_URL || '(not set)',
    },
    tests: {}
  };

  // Test 1: DNS resolution
  try {
    const dns = await import('node:dns');
    const { resolve4 } = dns.promises;
    const addresses = await resolve4('backend');
    results.tests.dns = { ok: true, addresses };
  } catch (e) {
    results.tests.dns = { ok: false, error: e.message };
  }

  // Test 2: fetch /api/health
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${backendUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    const body = await res.text();
    results.tests.health = { ok: true, status: res.status, body };
  } catch (e) {
    results.tests.health = { ok: false, error: e.message, cause: e.cause?.message || '' };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
