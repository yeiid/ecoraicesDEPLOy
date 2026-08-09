#!/bin/sh
# Entrypoint de producción de EcoRaíces.
# 1) Espera a que PostgreSQL esté disponible.
# 2) Aplica las migraciones de Prisma (schema public).
# 3) Inicia el servidor SSR standalone.
set -e

echo "⏳ Esperando a PostgreSQL..."
node /app/docker/wait-for-db.mjs

echo "🔄 Aplicando migraciones de Prisma (migrate deploy)..."
npx prisma migrate deploy

echo "✅ Migraciones aplicadas. Iniciando EcoRaíces..."
exec node /app/dist/server/entry.mjs
