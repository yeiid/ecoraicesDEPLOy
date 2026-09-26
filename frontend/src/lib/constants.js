/**
 * Constantes compartidas — Fase 0 limpieza.
 * Centraliza fallbacks de imagen, mapas y backend para evitar magic strings x9.
 */

export const IMAGE_FALLBACK_WIDE =
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=800&q=80';
export const IMAGE_FALLBACK_CARD =
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80';
export const IMAGE_FALLBACK_SMALL =
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80';
export const IMAGE_FALLBACK_FOREST =
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=600&q=80';
export const IMAGE_FALLBACK_BANNER =
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80';
export const IMAGE_FALLBACK_DETAIL =
  'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=1200&q=80';

/** Handler inline único para <img onerror>. Uso: onerror={IMG_ONERROR_WIDE} */
export const IMG_ONERROR_WIDE = `this.onerror=null; this.src='${IMAGE_FALLBACK_WIDE}';`;
export const IMG_ONERROR_CARD = `this.onerror=null; this.src='${IMAGE_FALLBACK_CARD}';`;

export const MAP_API_URL = 'https://map.neuraljira.tech';
export const MAP_STYLE_URL = `${MAP_API_URL}/api/v1/style.json`;
export const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
export const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
