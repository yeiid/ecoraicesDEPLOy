// Carga el catálogo (Species, SpeciesPhoto, Category) desde scripts/data/catalog-dump.sql.
// Uso (dentro del contenedor app): node scripts/load-catalog.mjs
// Requiere DATABASE_URL apuntando a la BD de producción.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUMP_PATH = join(__dirname, 'data', 'catalog-dump.sql');
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGIS_URL;

if (!DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL. Ejecuta dentro del contenedor app con las env cargadas.');
  process.exit(1);
}

const sql = readFileSync(DUMP_PATH, 'utf8');
const statements = sql
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('--'));

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// Sube la resolución de imágenes ya cargadas (idempotente).
// iNaturalist: square (250px) -> large (1024px). Wikimedia: 960px -> 1280px.
const UPGRADES = [
  `UPDATE "Species" SET "imageUrl" = regexp_replace("imageUrl",
     'photos/[0-9]+/square\\.(jpe?g|png)', 'photos/large.\\1', 'g')`,
  `UPDATE "Species" SET "imageUrl" = regexp_replace("imageUrl", 'page1-960px-', 'page1-1280px-', 'g')`,
  `UPDATE "Species" SET "imageUrl" = regexp_replace("imageUrl", '/960px-', '/1280px-', 'g')`,
  `UPDATE "SpeciesPhoto" SET url = regexp_replace(url,
     'photos/[0-9]+/square\\.(jpe?g|png)', 'photos/large.\\1', 'g'),
     "thumbnailUrl" = regexp_replace("thumbnailUrl",
     'photos/[0-9]+/square\\.(jpe?g|png)', 'photos/large.\\1', 'g')`,
  `UPDATE "SpeciesPhoto" SET url = regexp_replace(url, 'page1-960px-', 'page1-1280px-', 'g'),
     "thumbnailUrl" = regexp_replace("thumbnailUrl", 'page1-960px-', 'page1-1280px-', 'g')`,
  `UPDATE "SpeciesPhoto" SET url = regexp_replace(url, '/960px-', '/1280px-', 'g'),
     "thumbnailUrl" = regexp_replace("thumbnailUrl", '/960px-', '/1280px-', 'g')`,
];
for (const q of UPGRADES) {
  const res = await client.query(q);
  if (res.rowCount > 0) console.log(`↑ URLs mejoradas: ${res.rowCount}`);
}

let ok = 0;
for (const stmt of statements) {
  try {
    await client.query(stmt);
    ok++;
  } catch (error) {
    if (error.code === '42P07' || error.code === '23505') continue;
    if (/already exists/.test(error.message)) continue;
    console.error(`✗ ${stmt.slice(0, 90)}…`);
    console.error(`  → ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(`Listo: ${ok}/${statements.length} sentencias ejecutadas.`);
await client.end();
