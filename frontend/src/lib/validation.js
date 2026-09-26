/**
 * Validación compartida — Fase 3 errores.
 * Usar antes de cada fetch: email, password, coordenadas, trim.
 */

export function requiredTrim(value, max = 200) {
  const s = (value ?? '').toString().trim();
  if (!s) return { ok: false, error: 'Campo requerido' };
  if (s.length > max) return { ok: false, error: `Máximo ${max} caracteres` };
  return { ok: true, value: s };
}

export function isEmail(value) {
  const s = (value ?? '').toString().trim().toLowerCase();
  if (!s) return { ok: false, error: 'Email requerido' };
  if (s.length > 254) return { ok: false, error: 'Email demasiado largo' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return { ok: false, error: 'Email inválido' };
  return { ok: true, value: s };
}

export function isStrongPassword(value, min = 8) {
  const s = (value ?? '').toString();
  if (s.length < min) return { ok: false, error: `Mínimo ${min} caracteres` };
  if (!/[a-zA-Z]/.test(s) || !/[0-9]/.test(s)) {
    return { ok: false, error: 'Debe incluir letra y número' };
  }
  return { ok: true, value: s };
}

/** Valida lat/lng en rango. Acepta strings de hidden inputs. */
export function parseCoords(latRaw, lngRaw) {
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (latRaw === '' || latRaw == null || lngRaw === '' || lngRaw == null) {
    return { ok: false, error: 'Ubicación requerida: marca el punto en el mapa' };
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, error: 'Coordenadas inválidas' };
  }
  if (lat < -90 || lat > 90) return { ok: false, error: 'Latitud fuera de rango (-90 a 90)' };
  if (lng < -180 || lng > 180) return { ok: false, error: 'Longitud fuera de rango (-180 a 180)' };
  return { ok: true, lat, lng };
}

export function isSafeUrl(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    if (u.protocol === 'javascript:') return false;
    return true;
  } catch {
    return false;
  }
}

/** Sanitiza ?error= OAuth con allowlist + longitud. */
const OAUTH_ERROR_ALLOW = new Set([
  'access_denied',
  'invalid_request',
  'unauthorized_client',
  'server_error',
  'temporarily_unavailable',
]);
export function getSafeOAuthError(value) {
  const s = (value ?? '').toString().slice(0, 200);
  if (!s) return null;
  if (OAUTH_ERROR_ALLOW.has(s)) return s;
  // Mensaje genérico para valores arbitrarios (evita XSS reflejado)
  return 'oauth_error';
}
