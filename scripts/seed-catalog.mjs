// Fase 1 — Semilla del catálogo desde GBIF.
// Trae taxonomía (familia, sinónimos), nombres comunes en español y media
// (imagen principal con licencia) para la lista curada de especies nativas.
//
// Uso: pnpm etl:seed [--dry-run] [--limit N] [--species "Cavanillesia platanifolia"]
import { loadEnv, getPrisma, closePrisma, rateLimit, parseArgs, licenseLabel } from './lib/etl-helpers.mjs';
import { matchSpecies, getTaxonomy, getVernacularNames, getMedia } from '../src/lib/external/gbif.js';
import { NATIVE_SPECIES, CATEGORIES } from './data/native-species.mjs';

loadEnv();

const prisma = getPrisma();
const opts = parseArgs();

const GBIF_RATE_MS = 1300; // ~45 req/min, amigable con GBIF

async function resolveCategory(name) {
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return existing;
  if (opts.dryRun) return { id: `dry-run:${name}` };
  return prisma.category.create({
    data: { name, description: CATEGORIES.find((c) => c.name === name)?.description || null },
  });
}

async function processSpecies(entry) {
  const label = entry.scientificName;
  process.stdout.write(`\n▶ ${label} (${entry.commonName})`);
  const category = await resolveCategory(entry.category);
  if (opts.dryRun) {
    console.log(` → categoría [${entry.category}] (dry-run)`);
  }

  const match = await matchSpecies(entry.scientificName);
  await rateLimit(GBIF_RATE_MS);

  const SPECIES_RANKS = new Set(['SPECIES', 'SUBSPECIES', 'VARIETY', 'FORM']);
  if (!match || !SPECIES_RANKS.has(match.rank)) {
    const reason = match ? `match a nivel ${match.rank} (${match.matchType})` : 'sin match';
    console.log(`\n   ⚠ ${reason} — se registra con datos curados (sin GBIF)`);
  } else {
    const taxonomy = await getTaxonomy(match.usageKey);
    await rateLimit(GBIF_RATE_MS);

    const vernaculars = await getVernacularNames(match.usageKey, { language: 'spa' });
    await rateLimit(GBIF_RATE_MS);

    const media = await getMedia(match.usageKey, { limit: 10 });
    await rateLimit(GBIF_RATE_MS);

    const synonyms = (taxonomy?.synonyms || []).filter(Boolean).slice(0, 10);
    const name = entry.commonName || vernaculars[0] || match.canonicalName || entry.scientificName;
    const bestPhoto = media.find((m) => m.license === 'cc0' || m.license === 'cc-by' || m.license === 'cc-by-sa') || media[0];

    console.log(`\n   · GBIF key ${match.usageKey} (${match.status}, conf. ${match.confidence ?? '-'})`);
    console.log(`   · familia: ${taxonomy?.family || '-'} | sinónimos: ${synonyms.length || 0} | nombres comunes: ${vernaculars.length || 0}`);
    if (bestPhoto) console.log(`   · foto: ${bestPhoto.url.slice(0, 80)}… (${licenseLabel(bestPhoto.license)})`);

    if (opts.dryRun) {
      console.log('   · (dry-run) no se escribe en BD');
      return;
    }

    const data = {
      name,
      scientificName: match.canonicalName || entry.scientificName,
      description: entry.description || undefined,
      habitat: entry.habitat || undefined,
      imageUrl: bestPhoto?.url || undefined,
      status: entry.status || undefined,
      gbifKey: match.usageKey,
      family: taxonomy?.family || null,
      synonyms: synonyms.length ? synonyms : undefined,
      category: { connect: { id: category.id } },
    };

    const existing = await prisma.species.findUnique({
      where: { scientificName: data.scientificName },
    });

    let speciesId;
    if (existing) {
      await prisma.species.update({ where: { id: existing.id }, data });
      speciesId = existing.id;
      console.log('   · actualizada (upsert)');
    } else {
      const created = await prisma.species.create({ data });
      speciesId = created.id;
      console.log('   · creada');
    }

    if (bestPhoto) {
      const already = await prisma.speciesPhoto.findFirst({
        where: { url: bestPhoto.url },
      });
      if (!already) {
        await prisma.speciesPhoto.create({
          data: {
            speciesId,
            url: bestPhoto.url,
            thumbnailUrl: bestPhoto.url,
            license: bestPhoto.license,
            attribution: bestPhoto.attribution,
            source: 'GBIF',
            rank: 0,
          },
        });
      }
    }
    return;
  }

  // Match de taxón superior o sin match: crear con los datos curados
  if (opts.dryRun) {
    console.log('   · (dry-run) no se escribe en BD');
    return;
  }
  const curatedData = {
    name: entry.commonName,
    scientificName: entry.scientificName,
    description: entry.description || undefined,
    habitat: entry.habitat || undefined,
    status: entry.status || undefined,
    gbifKey: null,
    family: null,
    synonyms: undefined,
    category: { connect: { id: category.id } },
  };
  const existing = await prisma.species.findUnique({
    where: { scientificName: curatedData.scientificName },
  });
  if (existing) {
    await prisma.species.update({ where: { id: existing.id }, data: curatedData });
    console.log('   · actualizada con datos curados');
  } else {
    await prisma.species.create({ data: curatedData });
    console.log('   · creada con datos curados');
  }
}

async function main() {
  let list = NATIVE_SPECIES;
  if (opts.species) {
    const needle = opts.species.toLowerCase();
    list = list.filter((s) => s.scientificName.toLowerCase().includes(needle) || (s.commonName || '').toLowerCase().includes(needle));
    if (!list.length) {
      console.error(`No se encontró "${opts.species}" en la lista curada.`);
      process.exit(1);
    }
  }
  list = list.slice(0, opts.limit);

  console.log(`Seed del catálogo: ${list.length} especies (${opts.dryRun ? 'DRY-RUN' : 'escritura real'})`);
  let ok = 0;
  for (const entry of list) {
    try {
      await processSpecies(entry);
      ok++;
    } catch (error) {
      console.error(`\n   ✗ error en ${entry.scientificName}: ${error.message}`);
    }
  }
  console.log(`\nListo. Procesadas ${ok}/${list.length}.`);
  await closePrisma();
}

main().catch(async (error) => {
  console.error(error);
  await closePrisma();
  process.exit(1);
});
