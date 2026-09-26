/**
 * Hosts candidatos del backend — Fase 0 limpieza.
 * Única fuente para client.js, [...path].js y debug.js.
 * NOTA: la IP pública solo se usa en servidor, nunca exponer al cliente.
 */
export function getCandidateBackendUrls() {
  const list = [];
  if (typeof process !== 'undefined' && process.env.BACKEND_URL) {
    list.push(process.env.BACKEND_URL);
  }
  list.push('http://backend:8000');
  list.push('http://host.docker.internal:48000');
  list.push('http://172.17.0.1:48000');
  // IP pública legacy — mantener solo como fallback servidor
  list.push('http://187.124.64.184:48000');
  list.push('http://localhost:48000');
  list.push('http://127.0.0.1:48000');
  return [...new Set(list)];
}
