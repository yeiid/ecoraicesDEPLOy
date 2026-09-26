/**
 * Fetch SSR seguro — Fase 0 limpieza.
 * Retorna { data, error } en vez de lanzar, para renderizar <EmptyState>.
 */
import { apiGet } from './client.js';

export async function apiGetSafe(path, fallback = null) {
  try {
    const data = await apiGet(path);
    return { data: data ?? fallback, error: null };
  } catch (e) {
    console.warn(`[ssr] ${path} failed:`, e?.message || e);
    return { data: fallback, error: e };
  }
}
