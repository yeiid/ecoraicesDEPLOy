// Cliente de la API de Wikimedia Commons (imágenes de respaldo)
import { httpGetJson } from './http.js';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Busca imágenes libres en Commons por nombre de especie
export async function searchCommonsImages(name, { limit = 5 } = {}) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `file:${name}`,
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '800',
    origin: '*',
  });

  const data = await httpGetJson(`${COMMONS_API}?${params}`);
  const pages = data.query?.pages || {};
  const images = [];
  for (const key of Object.keys(pages)) {
    const page = pages[key];
    const info = page.imageinfo && page.imageinfo[0];
    if (!info || !info.url) continue;
    const ext = info.extmetadata || {};
    const license = (ext.LicenseShortName && ext.LicenseShortName.value) || null;
    const artist = (ext.Artist && stripHtml(ext.Artist.value)) || null;
    const descriptionUrl = info.descriptionurl || info.url;
    images.push({
      url: info.thumburl || info.url,
      thumbnailUrl: info.thumburl || info.url,
      license: normalizeLicense(license),
      attribution: artist,
      source: 'WIKIMEDIA',
      pageUrl: descriptionUrl,
    });
  }
  return images.slice(0, limit);
}

function normalizeLicense(license) {
  if (!license) return null;
  const l = String(license).toLowerCase().replace(/_/g, '-');
  if (l.includes('public domain') || l.includes('cc0')) return 'cc0';
  if (l.includes('cc-by-sa')) return 'cc-by-sa';
  if (l.includes('cc-by')) return 'cc-by';
  return l;
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
