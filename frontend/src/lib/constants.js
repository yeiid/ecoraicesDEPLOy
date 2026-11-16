/**
 * Constantes compartidas — Fase 0 limpieza.
 * Centraliza fallbacks de imagen, mapas y backend para evitar magic strings x9.
 */

export const IMAGE_FALLBACK_WIDE = '/guajira-banner.webp';
export const IMAGE_FALLBACK_CARD = '/guajira-paisaje.webp';
export const IMAGE_FALLBACK_SMALL = '/guajira-flora.webp';
export const IMAGE_FALLBACK_FOREST = '/guajira-banner.webp';
export const IMAGE_FALLBACK_BANNER = '/guajira-banner.webp';
export const IMAGE_FALLBACK_DETAIL = '/guajira-banner.webp';

/** Handler inline único para <img onerror>. Uso: onerror={IMG_ONERROR_WIDE} */
export const IMG_ONERROR_WIDE = `this.onerror=null; this.src='${IMAGE_FALLBACK_WIDE}';`;
export const IMG_ONERROR_CARD = `this.onerror=null; this.src='${IMAGE_FALLBACK_CARD}';`;

export const MAP_API_URL = 'https://map.neuraljira.tech';
export const MAP_STYLE_URL = `${MAP_API_URL}/api/v1/style.json`;
export const MAPLIBRE_CSS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
export const MAPLIBRE_JS = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
