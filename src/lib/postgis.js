import pg from 'pg';

const { Pool } = pg;

// PostgreSQL / PostGIS Connection String
const connectionString = process.env.POSTGIS_URL || "postgresql://mapengine:mapengine123@localhost:5433/mapdb";

export const postgisPool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Sincroniza una observación botánica al mapa de PostGIS (tabla geo2)
 * @param {Object} observation - El objeto de observación creado en SQLite
 * @param {string} speciesName - El nombre de la especie
 */
export async function syncObservationToPostGIS(observation, speciesName) {
  const query = `
    INSERT INTO geo2 (geom, height, name, type)
    VALUES (
      ST_SetSRID(ST_Point($1, $2), 4326),
      $3,
      $4,
      $5
    )
    RETURNING id;
  `;

  const height = 12; // Altura estándar para renderizado 3D de árboles jóvenes
  const type = 'arbol';

  const values = [
    parseFloat(observation.longitude),
    parseFloat(observation.latitude),
    height,
    speciesName || 'Árbol Registrado',
    type
  ];

  try {
    const res = await postgisPool.query(query, values);
    console.log(`[PostGIS Sync] Sincronización exitosa. Creado registro ID ${res.rows[0]?.id} en tabla 'geo2'.`);
    return res.rows[0];
  } catch (error) {
    console.error('[PostGIS Sync] Error al sincronizar con PostGIS:', error);
    // Silenciamos el error para que fallos de red en el mapa no crash-en el registro básico SQLite
  }
}
