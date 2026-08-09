// Cliente de la API de iNaturalist (https://api.inaturalist.org)
import { httpGetJson } from './http.js';

const INAT_API = 'https://api.inaturalist.org/v1';

// Place ID de Colombia (puede variar entre entornos; se resuelve dinámicamente)
let cachedColombiaPlaceId = null;

export async function getColombiaPlaceId() {
  if (cachedColombiaPlaceId) return cachedColombiaPlaceId;
  try {
    const data = await httpGetJson(`${INAT_API}/places/autocomplete?q=Colombia`);
    const places = data.results || [];
    const match = places.find(
      (p) =>
        (p.place_type === 12 || p.place_type === 1) &&
        /^colombia$/i.test(p.name)
    );
    cachedColombiaPlaceId = match ? match.id : null;
  } catch (error) {
    cachedColombiaPlaceId = null;
  }
  return cachedColombiaPlaceId;
}

// Busca observaciones con fotos de una especie en Colombia (solo licencias reutilizables)
export async function getSpeciesPhotos(scientificName, { perPage = 5, license = 'cc0,cc-by,cc-by-sa', placeId = null } = {}) {
  const params = new URLSearchParams({
    taxon_name: scientificName,
    photos: 'true',
    quality_grade: 'research',
    per_page: String(perPage),
    fields: 'id,taxon.id,taxon.name,photos.url,photos.medium_url,photos.original_url,photos.license_code,photos.attribution,photos.user.name',
  });
  if (license) params.set('license', license);
  const resolvedPlaceId = placeId || (await getColombiaPlaceId());
  if (resolvedPlaceId) params.set('place_id', String(resolvedPlaceId));

  const data = await httpGetJson(`${INAT_API}/observations?${params}`);
  const results = data.results || [];
  const photos = [];
  for (const obs of results) {
    if (!obs.photos) continue;
    for (const p of obs.photos) {
      const licenseCode = p.license_code || null;
      if (licenseCode && !isReusableLicense(licenseCode)) continue;
      photos.push({
        url: p.original_url || p.medium_url || p.url || null,
        thumbnailUrl: p.url || p.medium_url || null,
        license: licenseCode ? normalizeLicenseCode(licenseCode) : null,
        attribution: buildAttribution(p.attribution, p.user),
        source: 'INATURALIST',
      });
    }
  }
  return photos.slice(0, perPage);
}

function normalizeLicenseCode(code) {
  return String(code).toLowerCase().replace(/_/g, '-');
}

// Solo licencias libres (sin restricción NC/ND) para uso en producto
function isReusableLicense(code) {
  const c = String(code).toLowerCase();
  return c.includes('cc0') || c.includes('cc-by-sa') || c === 'cc-by';
}

function buildAttribution(attribution, user) {
  if (attribution) return attribution;
  if (user && user.name) return user.name;
  if (user && user.login) return user.login;
  return null;
}
