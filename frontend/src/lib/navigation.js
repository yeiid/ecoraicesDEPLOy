/**
 * Navegación segura — Fase 0 limpieza.
 * Centraliza getSafeRedirect (antes solo en LoginForm) + login redirect.
 */

export function getSafeRedirect(value, fallback = '/') {
  if (typeof value !== 'string') return fallback;
  // Solo rutas internas absolutas, sin // (open redirect)
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}

export function getSafeRedirectFromUrl(search, fallback = '/') {
  try {
    const params = new URLSearchParams(search || '');
    return getSafeRedirect(params.get('redirect'), fallback);
  } catch {
    return fallback;
  }
}

export function buildLoginRedirect(pathname) {
  const safe = /^\/[a-z0-9/_\-.]*$/i.test(pathname || '') ? pathname : '/';
  return `/auth/login?redirect=${encodeURIComponent(safe)}`;
}
