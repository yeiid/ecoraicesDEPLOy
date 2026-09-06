// Helper HTTP con reintentos y backoff para APIs externas
const MIN_TIMEOUT = 15000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// fetch con reintentos ante errores 429/5xx y timeout
export async function httpGet(url, { headers = {}, retries = 3, timeout = MIN_TIMEOUT, userAgent = 'EcoRaices/1.0 (contact: ecoraices@example.org)' } = {}) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      const backoff = 1000 * Math.pow(2, attempt);
      await sleep(backoff);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} en ${url}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} en ${url}`);
      }
      return res;
    } catch (error) {
      lastError = error;
      if (error.name === 'AbortError') {
        lastError = new Error(`Timeout en ${url}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function httpGetJson(url, options) {
  const res = await httpGet(url, options);
  return res.json();
}

export { sleep };
