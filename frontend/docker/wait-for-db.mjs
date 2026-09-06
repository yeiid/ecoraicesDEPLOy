// Espera a que PostgreSQL responda antes de aplicar migraciones.
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL no está definida.');
  process.exit(1);
}

const { Client } = pg;
const MAX_ATTEMPTS = 60; // ~2 minutos
const RETRY_MS = 2000;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    console.log('PostgreSQL disponible.');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.log(`Intento ${attempt}/${MAX_ATTEMPTS}: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  } finally {
    await client.end().catch(() => {});
  }
}

console.error('No se pudo conectar a PostgreSQL a tiempo.');
process.exit(1);
