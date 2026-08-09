import pg from 'pg';

const { Pool } = pg;

// PostgreSQL / PostGIS Connection String (obligatorio en producción)
const connectionString = process.env.POSTGIS_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('POSTGIS_URL no está configurado en las variables de entorno');
  }
  console.warn('POSTGIS_URL no definido. La sincronización geoespacial estará desactivada.');
}

export const postgisPool = connectionString
  ? new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  : null;

/**
 * Sincroniza una observación botánica al mapa de PostGIS (tabla geo2)
 * @param {Object} species - La especie (incluyendo su categoría) asociada a la observación
 * @param {Object} observation - El objeto de observación creado en la base principal
 */
export async function syncObservationToPostGIS(species, observation) {
  if (!postgisPool) {
    return null;
  }

  const query = `
    INSERT INTO gis.geo2 (geom, height, name, type)
    VALUES (
      ST_SetSRID(ST_Point($1, $2), 4326),
      $3,
      $4,
      $5
    )
    RETURNING id;
  `;

  // Valores reales por observación: altura medida en el registro y tipo = categoría de la especie.
  // Si no hay medición de altura, se usa un valor por defecto para el renderizado 3D.
  const measuredHeight = parseFloat(observation.altitude);
  const height = Number.isFinite(measuredHeight) && measuredHeight > 0 ? measuredHeight : 12;
  const speciesName = species?.name || species?.commonName || 'Árbol Registrado';
  const type = species?.category?.name || 'arbol';

  const values = [
    parseFloat(observation.longitude),
    parseFloat(observation.latitude),
    height,
    speciesName,
    type,
  ];

  try {
    const res = await postgisPool.query(query, values);
    console.log(`[PostGIS Sync] Sincronización exitosa. Creado registro ID ${res.rows[0]?.id} en tabla 'geo2'.`);
    return res.rows[0];
  } catch (error) {
    // No bloqueamos el registro principal si falla la sincronización del mapa
    console.error('[PostGIS Sync] Error al sincronizar con PostGIS:', error);
    return null;
  }
}
