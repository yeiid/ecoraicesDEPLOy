// Cliente de la API de GBIF (https://www.gbif.org/developer/summary)
import { httpGetJson, sleep } from './http.js';

const GBIF_API = 'https://api.gbif.org/v1';

// Busca el taxón canónico de una especie (name_backbone de GBIF)
export async function matchSpecies(scientificName, { kingdom = 'Plantae' } = {}) {
  const params = new URLSearchParams({ name: scientificName });
  if (kingdom) params.set('kingdom', kingdom);
  const data = await httpGetJson(`${GBIF_API}/species/match?${params}`);
  if (!data || data.status !== 'ACCEPTED' || !data.usageKey) {
    return null;
  }
  return {
    usageKey: data.usageKey,
    canonicalName: data.canonicalName || data.scientificName || scientificName,
    family: data.family || null,
    rank: data.rank || null,
    confidence: data.confidence ?? null,
    matchType: data.matchType || null,
    status: data.status,
  };
}

// Detalle taxonómico completo de un usageKey
export async function getTaxonomy(usageKey) {
  try {
    const data = await httpGetJson(`${GBIF_API}/species/${usageKey}`);
    return {
      scientificName: data.scientificName || null,
      canonicalName: data.canonicalName || null,
      rank: data.rank || null,
      kingdom: data.kingdom || null,
      phylum: data.phylum || null,
      order: data.order || null,
      family: data.family || null,
      genus: data.genus || null,
      synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
      taxonKey: data.key || null,
    };
  } catch (error) {
    return null;
  }
}

// Nombres comunes (vernáculos) de un usageKey, filtrados por idioma
export async function getVernacularNames(usageKey, { language = 'spa' } = {}) {
  try {
    const data = await httpGetJson(
      `${GBIF_API}/species/${usageKey}/vernacularNames?language=${language}`
    );
    const results = data.results || [];
    return results
      .map((v) => v.vernacularName)
      .filter(Boolean)
      .slice(0, 10);
  } catch (error) {
    return [];
  }
}

// Media (imágenes) de un usageKey con licencia y autor
export async function getMedia(usageKey, { limit = 20 } = {}) {
  try {
    const data = await httpGetJson(`${GBIF_API}/species/${usageKey}/media`);
    const results = data.results || [];
    return results
      .filter((m) => m.type === 'StillImage' && m.identifier)
      .slice(0, limit)
      .map((m) => ({
        url: m.identifier,
        license: normalizeLicense(m.license),
        attribution: m.rightsHolder || m.creator || null,
        source: 'GBIF',
      }));
  } catch (error) {
    return [];
  }
}

// Normaliza códigos de licencia GBIF a etiquetas cortas
function normalizeLicense(license) {
  if (!license) return null;
  if (typeof license === 'string') return license.toLowerCase();
  if (license.license) return license.license.toLowerCase();
  return null;
}

// Espera amigable entre llamadas (rate limit)
export { sleep };
