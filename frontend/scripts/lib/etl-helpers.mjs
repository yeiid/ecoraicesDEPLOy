// Helpers compartidos para los scripts ETL de APIs externas
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga las variables de entorno desde .env (sin dependencias extra)
export function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      let key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env opcional en algunos entornos
  }
}

let prisma;
export function getPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export async function closePrisma() {
  if (prisma) await prisma.$disconnect();
}

// Espera amigable para respetar rate limits de las APIs
export function rateLimit(ms = 1200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parsea args CLI comunes: --dry-run, --limit N, --species "Nombre"
export function parseArgs(argv = process.argv.slice(2)) {
  const opts = { dryRun: false, limit: Infinity, species: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--limit') opts.limit = parseInt(argv[++i], 10) || Infinity;
    else if (arg === '--species') opts.species = argv[++i];
  }
  return opts;
}

// Sumario amigable de licencias
export function licenseLabel(license) {
  if (!license) return 'Licencia no indicada';
  const map = {
    'cc0': 'CC0 (Dominio público)',
    'cc-by': 'CC BY (Atribución)',
    'cc-by-sa': 'CC BY-SA (Atribución-CompartirIgual)',
    'cc-by-nc': 'CC BY-NC (No comercial)',
    'cc-by-nc-sa': 'CC BY-NC-SA',
    'public-domain': 'Dominio público',
  };
  return map[String(license).toLowerCase()] || `Licencia ${license}`;
}
