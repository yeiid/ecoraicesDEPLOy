// Cliente de Pl@ntNet (identificación de especies por foto, en tiempo real)
const PLANTNET_API = 'https://my-api.plantnet.org/v2';

export function getApiKey() {
  return process.env.PLANTNET_API_KEY || '';
}

// Identifica una o varias imágenes; devuelve las N mejores coincidencias
export async function identify(images, { nbResults = 5 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('PLANTNET_API_KEY no configurada');
  }
  const params = new URLSearchParams({
    'api-key': apiKey,
    'nb-results': String(nbResults),
  });

  const form = new FormData();
  for (const img of images) {
    const blob = new Blob([img.buffer], { type: img.contentType });
    form.append('images', blob, img.filename);
  }

  const res = await fetch(`${PLANTNET_API}/identify/all?${params}`, {
    method: 'POST',
    body: form,
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('API key de Pl@ntNet inválida o sin permisos');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pl@ntNet HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const results = data.results || [];
  return results.slice(0, nbResults).map((r) => ({
    score: r.score ?? null,
    scientificName: r.species?.scientificNameWithoutAuthor || r.species?.scientificName || null,
    commonName: (r.species?.commonNames && r.species.commonNames[0]) || null,
    genus: r.species?.genus?.scientificName || null,
    family: r.species?.family?.scientificName || null,
  }));
}
