-- Provición PostGIS para EcoRaíces (infraestructura, fuera del alcance de Prisma).
-- Uso en entorno nuevo: psql "$DATABASE_URL" -f scripts/init-postgis.sql
-- La tabla geo2 vive en el schema `gis`, ajeno al schema `public` que gestiona Prisma.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS gis;

CREATE SEQUENCE IF NOT EXISTS gis.geo2_id_seq;

CREATE TABLE IF NOT EXISTS gis.geo2 (
  id     integer NOT NULL DEFAULT nextval('gis.geo2_id_seq'),
  geom   geometry(Point,4326),
  height numeric,
  name   text,
  type   text
);

ALTER SEQUENCE gis.geo2_id_seq OWNED BY gis.geo2.id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'gis' AND c.relname = 'geo2_pkey') THEN
    ALTER TABLE gis.geo2 ADD CONSTRAINT geo2_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS geo2_geom_gist ON gis.geo2 USING gist (geom);
