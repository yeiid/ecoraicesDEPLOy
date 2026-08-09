# syntax=docker/dockerfile:1

########################
# STAGE 1 — Dependencias y build
########################
FROM node:22-alpine AS build
WORKDIR /app

# pnpm (misma versión mayor que el entorno local)
RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

# Dependencias (capa cacheada)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Fuentes, generación del cliente Prisma y build SSR standalone
COPY . .
RUN pnpm prisma generate \
    && pnpm build

########################
# STAGE 2 — Runtime (SSR standalone)
########################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

# Artefactos de build + dependencias + migraciones + scripts
COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts

# Utilidades de arranque
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY docker/wait-for-db.mjs /app/docker/wait-for-db.mjs
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Uploads: el código escribe en <cwd>/public/uploads y el server sirve
# dist/client. Ambos apuntan al volumen /data/uploads (montado en compose).
RUN mkdir -p /data/uploads /app/public \
    && ln -s /data/uploads /app/dist/client/uploads \
    && ln -s /data/uploads /app/public/uploads

# El server (adapter standalone) escucha en HOST/PORT
EXPOSE 8080

ENTRYPOINT ["docker-entrypoint.sh"]
