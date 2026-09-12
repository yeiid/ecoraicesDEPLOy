/**
 * Endpoint de diagnóstico v2 — accesible desde el navegador.
 * Visita: https://ecoraices.neuraljira.tech/api/debug
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

  // Test 1: DNS resolution (IPv4)
  try {
    const dns = await import('node:dns');
    const { resolve4 } = dns.promises;
    const addresses = await resolve4('backend');
    results.tests.dns_ipv4 = { ok: true, addresses };
  } catch (e) {
    results.tests.dns_ipv4 = { ok: false, error: e.message };
  }

  // Test 2: DNS resolution (IPv6)
  try {
    const dns = await import('node:dns');
    const { resolve6 } = dns.promises;
    const addresses = await resolve6('backend');
    results.tests.dns_ipv6 = { ok: true, addresses };
  } catch (e) {
    results.tests.dns_ipv6 = { ok: false, error: e.message };
  }

  // Test 3: DNS lookup (what Node actually uses)
  try {
    const dns = await import('node:dns');
    const { lookup } = dns.promises;
    const result = await lookup('backend', { all: true });
    results.tests.dns_lookup = { ok: true, result };
  } catch (e) {
    results.tests.dns_lookup = { ok: false, error: e.message };
  }

  // Test 4: Try fetch to backend via service name
  results.tests.fetch_service = await testFetch(`${backendUrl}/api/health`, 'service name');

  // Test 5: Try each resolved IP directly
  if (results.tests.dns_ipv4?.addresses) {
    for (const ip of results.tests.dns_ipv4.addresses) {
      results.tests[`fetch_ip_${ip}`] = await testFetch(`http://${ip}:8000/api/health`, ip);
    }
  }

  // Test 6: Try raw TCP connection using net module
  if (results.tests.dns_ipv4?.addresses) {
    for (const ip of results.tests.dns_ipv4.addresses) {
      results.tests[`tcp_${ip}`] = await testTcp(ip, 8000);
    }
  }

  // Test 7: Try TCP to "backend" hostname directly
  results.tests.tcp_backend = await testTcp('backend', 8000);

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}

async function testFetch(url, label) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const body = await res.text();
    return { ok: true, status: res.status, body: body.substring(0, 200) };
  } catch (e) {
    return { 
      ok: false, 
      error: e.message, 
      code: e.cause?.code || '',
      cause: e.cause?.message || '',
      errors: e.cause?.errors?.map(err => ({ message: err.message, code: err.code, address: err.address, port: err.port })) || []
    };
  }
}

async function testTcp(host, port) {
  const net = await import('node:net');
  return new Promise((resolve) => {
    const socket = new net.default.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, error: 'timeout after 5s' });
    }, 5000);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true, message: `TCP connection to ${host}:${port} succeeded` });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: false, error: err.message, code: err.code, address: err.address, port: err.port });
    });
  });
}
