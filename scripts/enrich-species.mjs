// Fase 2 — Enriquecer especies existentes en BD con datos de GBIF.
// Rellena gbifKey, familia, sinónimos y nombre común en español.
// Idempotente: vuelve a ejecutarse sin duplicar.
//
// Uso: pnpm etl:enrich [--dry-run] [--limit N]
import { loadEnv, getPrisma, closePrisma, rateLimit, parseArgs } from './lib/etl-helpers.mjs';
import { matchSpecies, getTaxonomy, getVernacularNames } from '../src/lib/external/gbif.js';

loadEnv();

const prisma = getPrisma();
const opts = parseArgs();
const GBIF_RATE_MS = 1300;

async function main() {
  const species = await prisma.species.findMany({
    where: opts.species ? { scientificName: { contains: opts.species, mode: 'insensitive' } } : {},
    orderBy: { name: 'asc' },
    take: opts.limit === Infinity ? undefined : opts.limit,
  });

  console.log(`Enriqueciendo ${species.length} especies (${opts.dryRun ? 'DRY-RUN' : 'escritura real'})`);
  let updated = 0;

  for (const sp of species) {
    process.stdout.write(`\n▶ ${sp.scientificName}`);
  const match = await matchSpecies(sp.scientificName);
  await rateLimit(GBIF_RATE_MS);
  const SPECIES_RANKS = new Set(['SPECIES', 'SUBSPECIES', 'VARIETY', 'FORM']);
  if (!match || !SPECIES_RANKS.has(match.rank)) {
    console.log(' → ⚠ sin match de especie (taxón superior o no encontrado), se mantiene como está');
    continue;
  }

    const taxonomy = await getTaxonomy(match.usageKey);
    await rateLimit(GBIF_RATE_MS);
    const vernaculars = await getVernacularNames(match.usageKey, { language: 'spa' });
    await rateLimit(GBIF_RATE_MS);

    const synonyms = (taxonomy?.synonyms || []).filter(Boolean).slice(0, 10);
    const name = sp.name || vernaculars[0] || sp.scientificName;

    console.log(` → key ${match.usageKey}, familia ${taxonomy?.family || '-'}, ${synonyms.length} sinónimos`);

    if (opts.dryRun) continue;

    const data = {
      gbifKey: match.usageKey,
      family: taxonomy?.family || null,
      synonyms: synonyms.length ? synonyms : undefined,
    };
    if (!sp.name && name !== sp.scientificName) data.name = name;

    const changed = data.family !== sp.family || data.gbifKey !== sp.gbifKey ||
      JSON.stringify(data.synonyms || []) !== JSON.stringify(sp.synonyms || []);
    if (changed) {
      await prisma.species.update({ where: { id: sp.id }, data });
      updated++;
    }
  }

  console.log(`\nListo. ${updated} especies actualizadas de ${species.length}.`);
  await closePrisma();
}

main().catch(async (error) => {
  console.error(error);
  await closePrisma();
  process.exit(1);
});
