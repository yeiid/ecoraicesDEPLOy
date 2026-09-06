// Fase 3 — Fotos con licencia para las especies (iNaturalist + Wikimedia como respaldo).
// Guarda en SpeciesPhoto: url, thumbnailUrl, license, attribution, source.
// Solo licencias reutilizables (cc0, cc-by, cc-by-sa). Idempotente.
//
// Uso: pnpm etl:photos [--dry-run] [--limit N] [--species "Ceiba pentandra"]
import { loadEnv, getPrisma, closePrisma, rateLimit, parseArgs, licenseLabel } from './lib/etl-helpers.mjs';
import { getSpeciesPhotos } from '../src/lib/external/inaturalist.js';
import { searchCommonsImages } from '../src/lib/external/wikimedia.js';

loadEnv();

const prisma = getPrisma();
const opts = parseArgs();
const RATE_MS = 1500; // iNaturalist ~60 req/min

async function upsertPhotos(speciesId, photos) {
  let added = 0;
  for (const photo of photos) {
    if (!photo.url) continue;
    const exists = await prisma.speciesPhoto.findFirst({ where: { url: photo.url } });
    if (!exists) {
      if (opts.dryRun) {
        console.log(`   · (dry-run) foto: ${photo.url.slice(0, 80)}… (${licenseLabel(photo.license)})`);
        added++;
        continue;
      }
      await prisma.speciesPhoto.create({
        data: {
          speciesId,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl || photo.url,
          license: photo.license || null,
          attribution: photo.attribution || null,
          source: photo.source || 'INATURALIST',
          rank: 0,
        },
      });
      added++;
    }
  }
  return added;
}

// Elige la mejor foto: prioriza iNaturalist, luego Wikimedia, luego GBIF
function pickBestPhoto(photos) {
  const order = { INATURALIST: 0, WIKIMEDIA: 1, GBIF: 2 };
  const sorted = [...photos].sort((a, b) => {
    const sa = order[a.source] ?? 9;
    const sb = order[b.source] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.rank - b.rank;
  });
  return sorted[0] || null;
}

async function main() {
  const where = opts.species
    ? { scientificName: { contains: opts.species, mode: 'insensitive' } }
    : {};
  const species = await prisma.species.findMany({
    where,
    orderBy: { name: 'asc' },
    take: opts.limit === Infinity ? undefined : opts.limit,
  });

  console.log(`Fotos para ${species.length} especies (${opts.dryRun ? 'DRY-RUN' : 'escritura real'})`);
  let totalPhotos = 0;

  for (const sp of species) {
    process.stdout.write(`\n▶ ${sp.scientificName}`);
    try {
      const inat = await getSpeciesPhotos(sp.scientificName, { perPage: 5 });
      await rateLimit(RATE_MS);

      let photos = inat;
      if (inat.length < 3) {
        const wiki = await searchCommonsImages(sp.scientificName, { limit: 5 });
        await rateLimit(RATE_MS);
        photos = [...inat, ...wiki];
      }

      if (!photos.length) {
        console.log(' → sin fotos disponibles');
        continue;
      }

      const added = await upsertPhotos(sp.id, photos);
      totalPhotos += added;
      console.log(` → ${photos.length} fotos encontradas, ${added} nuevas`);

      // Imagen principal: preferir fotos reales (iNaturalist > Wikimedia > GBIF)
      const saved = await prisma.speciesPhoto.findMany({
        where: { speciesId: sp.id },
      });
      const best = pickBestPhoto(saved);
      if (best && !sp.imageUrl?.startsWith('/images/')) {
        const better = best.url !== sp.imageUrl;
        const currentIsFigure = sp.imageUrl?.includes('zenodo.org') || sp.imageUrl?.includes('figure.png');
        if (better || currentIsFigure) {
          if (!opts.dryRun) {
            await prisma.species.update({ where: { id: sp.id }, data: { imageUrl: best.url } });
            console.log(`   · imagen principal actualizada → ${best.source}`);
          }
        }
      } else if (best && !opts.dryRun) {
        await prisma.species.update({ where: { id: sp.id }, data: { imageUrl: best.url } });
      }
    } catch (error) {
      console.log(` → ✗ error: ${error.message}`);
    }
  }

  console.log(`\nListo. ${totalPhotos} fotos nuevas en total.`);
  await closePrisma();
}

main().catch(async (error) => {
  console.error(error);
  await closePrisma();
  process.exit(1);
});
