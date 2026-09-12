#!/bin/sh
# Entrypoint de producción de EcoRaíces.
# 1) Espera a que PostgreSQL esté disponible.
# 2) Aplica las migraciones de Prisma (schema public).
# 3) Inicia el servidor SSR standalone.
set -e

echo "⏳ Esperando a PostgreSQL..."
node /app/docker/wait-for-db.mjs

echo "✅ Iniciando EcoRaíces..."
exec node --dns-result-order=ipv4first /app/dist/server/entry.mjs
