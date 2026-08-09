# 📋 Reporte Completo — EcoRaíces · Producción y Móvil

> Documento vivo del proyecto. Actualizado al sprint: **Despliegue en producción con Docker (SSR standalone + PostgreSQL/PostGIS)**.
> Fecha: 2026-08-08

---

## 1. Resumen Ejecutivo

| Categoría | Estado | Riesgo producción |
|---|---|---|
| Stack y build | 🟢 Sólido | `pnpm build` OK, SSR standalone |
| Base de datos | 🟢 PostgreSQL/PostGIS | Prisma `multiSchema` gestiona solo `public`; `geo2` aislada en schema `gis` |
| Autenticación | 🟢 Endurecida | JWT + zod + reset de contraseña + OAuth (Google/Facebook) |
| Sesión | 🟢 Ampliada | "Recordar mi cuenta" (30d vs 7d) + redirect post-login |
| API | 🟢 Parcial → Enriquecida | `/api/species` con búsqueda/paginación + detalle con fotos; ETL de GBIF/iNaturalist/Wikimedia |
| Catálogo externo | 🟢 Funcional | 61 especies con familia/sinónimos/fotos licenciadas + identificación Pl@ntNet (key activa, tier free) |
| Mapas neuraljira | 🟢 Implementado | MapLibre unificado (detalle incluido) |
| Comunidades | 🟢 Funcionales | CRUD + unirse/abandonar autoservicio + mapa en formulario |
| Super admin | 🟢 Panel `/admin` | Gestión de comunidades (eliminar) y observaciones (aprobar/rechazar/eliminar); acceso por `isAdmin` |
| Perfil de usuario | 🟢 Activado | Página `/perfil`: editar nombre/usuario/email/bio/avatar + cambio de contraseña + ver mis observaciones/comunidades |
| Sistema móvil | 🔴 No funcional | `sync.js` falla con usuarios anónimos (Fase 4) |
| Verificación científica | 🟢 Curaduría por admin | `PATCH /api/admin/observations/[id]` (APPROVED/REJECTED con notas); `DELETE` también limpia `geo2` |

---

## 2. Inventario Categórico

### 🛠️ Stack técnico (`package.json`)
- **Framework**: Astro 4.5 (SSR, `output: "server"`) + adapter Node standalone + React 18 (`client:only` para mapas).
- **DB**: Prisma 6.5 + PostgreSQL/PostGIS. Prisma gestiona únicamente el schema `public` (`previewFeatures = ["multiSchema"]`, `@@schema("public")` en modelos y enums); la tabla PostGIS `geo2` vive en el schema `gis`, fuera del alcance de Prisma.
- **Mapas**: MapLibre GL (único stack) con base OSM + tiles vectoriales `map.neuraljira.tech/tiles/geo2/...`.
- **Auth**: JWT manual (`jsonwebtoken`) + `bcryptjs`, validación `zod`, `nodemailer` (SMTP opcional).
- **Provision**: `scripts/init-postgis.sql` crea la extensión y la tabla `gis.geo2` (infra fuera de Prisma).

### 🗃️ Modelo de datos (`prisma/schema.prisma`)
Modelos: `User`, `Species`, `SpeciesPhoto`, `Category`, `Community`, `CommunityMember`, `Observation`, `Comment`.
- `User` ampliado: `provider` (`local|google|facebook`), `providerId` (único, hash), `resetTokenHash`, `resetTokenExpiresAt`.
- `Species` ampliado: `gbifKey`, `inaturalistTaxonId`, `family`, `synonyms` (JSONB) para datos enriquecidos desde GBIF.
- `SpeciesPhoto`: galería por especie con `url`, `thumbnailUrl`, `license` (CC0/CC-BY/CC-BY-SA…), `attribution` (autor), `source` (`INATURALIST|GBIF|WIKIMEDIA`), `rank`.
- `Observation` ampliado: `municipio`, `estadoConservacion` (campos reales, ya no concatenados en `notes`).
- Enums: `UserRole` (COLLECTOR/COMMUNITY), `MemberRole`, `ObservationStatus`, `Role`, `ConservationStatus`.
- Migraciones: `20260808170000_init_public` (baseline `public`, incluye columnas auth), `20260808180000_add_observation_location` y `20260808200000_external_species_data`. Sin drift (`migrate status` limpio).
- ⚠️ `Species.status` es `String?` → desajuste con `ConservationStatus` (textos humanos en seed vs claves enum).

### 🔐 Autenticación
| Endpoint | Protegido | Nota |
|---|---|---|
| `POST /api/auth/login` | — | Cookie `httpOnly`, `secure` en prod, 7d (o 30d con "recordar mi cuenta"), zod |
| `POST /api/auth/register` | — | Crea comunidad si `userType=community` |
| `GET /api/auth/session` | — | Devuelve `user:null` si no hay sesión |
| `POST /api/auth/logout` | — | — |
| `POST /api/auth/forgot-password` | — | Token aleatorio, hash SHA-256 en `resetTokenHash`, TTL 1h; email vía `sendMail`; en dev el enlace se muestra en la respuesta |
| `POST /api/auth/reset-password` | — | Valida token no expirado y actualiza `passwordHash` |
| `GET /api/auth/oauth/{provider}` | — | Redirige a Google/Facebook (503 si no configurado). Estado firmado en cookie |
| `GET /api/auth/oauth/callback/{provider}` | — | Intercambia code, upsert por `providerId` o email, crea sesión |
| `POST /api/observations` | ✅ | `userId` desde token autenticado |
| `PATCH /api/admin/observations/[id]` | ✅ (super admin) | Verificar (APPROVED/REJECTED) con `verifiedById`/`verifiedAt`/notas |
| `DELETE /api/admin/observations/[id]` | ✅ (super admin) | Elimina comentarios + observación y limpia `geo2` |
| `GET/PATCH /api/perfil` | ✅ | Consultar/actualizar datos propios (username/email únicos) |
| `PUT /api/perfil/password` | ✅ | Cambio de contraseña verificando la actual (bcrypt) |
| `POST /api/contact` | — | Envía a `CONTACT_EMAIL` vía `sendMail` (zod) |
| `POST /api/mobile/sync` | ❌ | Pendiente Fase 4 |
| `POST /api/tree/register` | ❌ | Pendiente (hardcodeado + no persiste) |

### 🗺️ Mapas / neuraljira.tech
- `MapComponent.jsx`: integrado con la **API del mapa** (`https://map.neuraljira.tech/api/v1/style.json`, configurable con `PUBLIC_MAP_API_URL`): carga el estilo oficial (OSM + ciudad 3D: `r_/u_construccion`, `u_terreno`, `u_sector`, `u_nomenclatura_vial`) y añade encima la capa de árboles `geo2` (vector tiles `/tiles/geo2/{z}/{x}/{y}`, `fill-extrusion` verde). Fallback al estilo embebido si la API no responde ✅ (verificado en navegador: style.json 200, sin errores).
- `postgis.js`: sincroniza a `gis.geo2` vía `POSTGIS_URL` (env). `height` = altitud medida de la observación (fallback 12) y `type` = categoría de la especie. **La capa `geo2` del mapa se alimenta del MISMO PostGIS que EcoRaíces** (BD compartida, sin cambios en el flujo de datos).
- Stack unificado: `[id].astro` usa el mismo `MapComponent` (sin Leaflet); `NewObservationForm` sin `TILE_URL` muertas.
- `CommunityLocationPicker.jsx`: selector de mapa para crear/editar comunidades.

### 👥 Comunidades
- Listado SSR con cards + búsqueda, detalle con miembros y observaciones, crear/editar/eliminar (solo owner/admin), unirse/abandonar autoservicio (`members.js` con `{self:true}`, 400 si ya miembro / 404 si no lo eres).

### 📄 Frontend (páginas)
`index`, `nosotros`, `contacto`, `comunidades`, `observaciones/{index, nueva, [id]}`, `plantas/{index, [id]}`, `auth/{login, register, logout, forgot-password, reset-password/[token]}`.
- Sistema de diseño `src/styles/global.css`: tokens (paleta bosque `#1b5e20` + esmeralda `#10b981`), `.btn` con variantes, formularios `.input/.select/.textarea/.form-control`, `.alert-box`, `.badge-*`, `.status-badge`, `.card`, utilidades, `:focus-visible`.
- Barrido de tokens: logo `logo.png`, rutas `/plantas/*`, breadcrumbs accesibles, contact form funcional, filtros sticky con focus, opciones enum de conservación completas, alt descriptivos.
- Botones sociales ahora son enlaces funcionales a `/api/auth/oauth/{provider}`.
- Rutas rotas restantes (pendiente): `/terminos`, `/privacidad`, `/categorias/*`.

---

## 3. 🧭 Mapa de Estructura — Cómo fluye la información

```
USUARIO WEB                     USUARIO MÓVIL
   │  Astro SSR                     │
   ▼                               ▼
┌────────────────────────┐   ┌───────────────────────┐
│ Páginas .astro          │   │ /api/mobile/sync      │ (sin auth)
│ Login/Register → cookie │   └─────────┬─────────────┘
│ ecoraices_token (JWT)    │             │ userId:'anonymous' ❌ FK
└──────┬─────────────────┘             ▼
       │                      ┌──────────────────┐
       ▼                      │ PostgreSQL (Prisma)│
┌────────────────────┐        │ User/Species/     │
│ React client:only   │◄──────►│ Category/Community│
│ ObservationsMap     │        │ Observation/Comment│
│ NewObservationForm  │        └────────┬─────────┘
└────────┬───────────┘                   │ POST observación
         │ fetch /api/observations       ▼
         ▼                        ┌──────────────────┐
┌────────────────────┐        │ PostGIS (geo2)   │
│ MapLibre (style.json│        │ map.neuraljira.tech│
│ de la API + capa    │        │ (env POSTGIS_URL)  │
│ geo2) /tiles/geo2/  │        └──────────────────┘
└────────────────────┘
        │
        ▼ (detalle)
   MapComponent (MapLibre) ✅ stack único (estilo vía /api/v1/style.json)
```

**Flujo real**: las páginas SSR consultan Prisma directo → los componentes React consultan la API → la API debe delegar en los servicios.

---

## 4. 🔍 Elementos sin lógica definida (deuda técnica)

| # | Elemento | Estado |
|---|---|---|
| 1 | `src/lib/services/observation|species|category.service.js` | 🔄 Por conectar a la API (la API usa prisma inline) |
| 2 | Verificación de observaciones (curaduría) | ✅ Panel `/admin` + `PATCH/DELETE /api/admin/observations/[id]` |
| 3 | `POST /api/tree/register` | ⏳ Pendiente (hardcodeado + no persiste) |
| 4 | `prisma/seed.ts` (modelos e-commerce inexistentes) | ✅ Eliminado |
| 5 | `pnpm-workspace.yaml` (placeholder allowBuilds) | ✅ Corregido |
| 6 | Env vars: `JWT_SECRET`, `POSTGIS_URL`, `DATABASE_URL` | ✅ Definidas en `.env` |
| 7 | Enums `Role`/`ConservationStatus` sin uso; `withAdmin` con rol `ADMIN` inexistente | ✅ Corregido `withAdmin` |
| 8 | Credenciales hardcodeadas en `postgis.js` | ✅ Movido a `POSTGIS_URL` (env) |
| 9 | Dependencias muertas: svelte, supabase, @auth/core, react-leaflet, leaflet | ✅ Limpiadas |
| 10 | Datos de prueba creados por el asistente | ✅ Eliminados (usuarios/obs/comunidades/geo2 temporales) |
| 11 | `geo2` dentro del schema gestionado por Prisma (drift/reset) | ✅ Aislada en schema `gis`; Prisma gestiona solo `public` |
| 12 | Formulario de contacto solo con `alert`/console | ✅ Endpoint real `POST /api/contact` con `sendMail` |
| 13 | Botones Google/Facebook decorativos; "recordar mi cuenta" inerte | ✅ OAuth real + recordar 30d |
| 14 | Municipio/estado concatenados en `notes` | ✅ Columnas `municipio`/`estadoConservacion` en `Observation` |
| 15 | Rutas fantasma (legal, categorías) | ⏳ Pendiente (Fase 3) |

---

## 5. 🚀 Hoja de Ruta

### ✅ Fase 0 — Fundamentos (completada)
- [x] Corregir `pnpm-workspace.yaml`.
- [x] Migrar esquema Prisma SQLite → PostgreSQL + regenerar client.
- [x] Ajustar queries `mode: 'insensitive'` para PostgreSQL.
- [x] Definir `.env` de producción.
- [x] Eliminar deps/código muerto: svelte, supabase, @auth/core, react-leaflet, `seed.ts`, `header.js/css` legacy, `supabase.ts`.

### ✅ Fase 1 — Autenticación validada (completada)
- [x] `JWT_SECRET` obligatorio en producción + validación `zod` en login/register/session.
- [x] `POST /api/observations` protegido (userId del token).
- [x] `withAuth`/`withAdmin` activados y `withAdmin` corregido.

### ✅ Fase 2 — maps.neuraljira.tech (completada)
- [x] `POSTGIS_URL` por env (sin credenciales hardcodeadas); pool opcional si falta.
- [x] Unificar mapas en MapLibre + neuraljira (quitar Leaflet de `[id].astro` y `register.astro`).
- [x] `height`/`type` reales por observación (altitud medida + categoría de la especie).
- [ ] Campo `height` dedicado en el formulario de observación (medición real del árbol, no altitud).

### ✅ Bloc A — Limpieza de datos de prueba (completado)
- [x] Eliminados usuarios/observaciones/comunidades/filas geo2 de prueba creados por el asistente.
- [x] Conservadas las cuentas reales (admin, luis_guajiro, maria_verde, yeifranhernandez16@gmail.com) y la fila geo2 "Ceiba Bonga".

### ✅ Bloc B — Comunidades funcionales (completado)
- [x] `members.js` con join/leave autoservicio (`{self:true}`).
- [x] Páginas: listado SSR, detalle `[id]`, crear `nueva`, editar `[id]/editar` (solo owner/admin).
- [x] `CommunityLocationPicker.jsx` (mapa en el formulario).
- [x] Verificado: list/detail/join/leave/create/edit/delete y guardas de permisos.

### ✅ Bloc C — Sistema de diseño y barrido (completado)
- [x] `src/styles/global.css` con tokens bosque+esmeralda y componentes `.btn/.form/.badge/.card`.
- [x] Tokens aplicados en home, nosotros, contacto, auth, plantas (colores hardcodeados eliminados).
- [x] `logo.svg` → `logo.png`; `/especies/*` → `/plantas/*`; breadcrumbs accesibles; `alt` en imágenes.
- [x] Contacto funcional (`POST /api/contact`); filtros sticky con focus; opciones de conservación completas.
- [x] `municipio`/`estadoConservacion` como columnas reales (migración aplicada).

### ✅ Bloc D — Sesión ampliada (completado)
- [x] "Recordar mi cuenta": cookie 30 días (7 por defecto) + redirect post-login seguro.
- [x] Forgot/reset password: endpoints + páginas + `nodemailer` (devLink en respuesta en dev).
- [x] OAuth Google/Facebook: redirect, callback con upsert por `providerId`/email, botones funcionales, env documentado.
- [x] Arquitectura de migraciones: baseline `public` + `geo2` aislada en `gis`; sin drift; `scripts/init-postgis.sql`.

### ✅ Bloc E — Catálogo enriquecido con APIs externas (completado)
- [x] Migración `20260808200000_external_species_data`: `Species.gbifKey`, `inaturalistTaxonId`, `family`, `synonyms` (JSONB) + modelo `SpeciesPhoto` (url, thumbnailUrl, license, attribution, source, rank).
- [x] Servicios en `src/lib/external/`: `gbif.js` (match/taxonomía/nombres comunes/media), `inaturalist.js` (fotos CC reutilizables en Colombia, place_id resuelto dinámicamente), `wikimedia.js` (fallback Commons), `plantnet.js` (identificación en vivo), `http.js` (retry/backoff).
- [x] ETL en `scripts/` (Node + fetch nativo, idempotentes): `seed-catalog.mjs` (67 especies curadas), `enrich-species.mjs` (re-match), `fetch-photos.mjs` (iNaturalist + Wikimedia). Alias: `pnpm etl:seed|enrich|photos|all`. Flags `--dry-run`, `--limit N`, `--species "..."`.
- [x] Catálogo sembrado: **61 especies** con familia/sinónimos/nombres comunes y **~300 fotos con licencia y atribución** (iNaturalist > Wikimedia > GBIF como imagen principal). Solo se aceptan matches GBIF a nivel `SPECIES` (los taxones superiores se registran con datos curados).
- [x] API: `GET /api/species?q=&page=&pageSize=` (búsqueda/paginación vía `species.service.getSpecies`, compat sin params), `GET /api/species/[id]` (incluye `photos`), `POST /api/species` (crear especie nueva, con auth), `POST /api/plantnet/identify` (multipart, con auth, 503 sin key).
- [x] UI: detalle de especie con **galería de fotos** (miniaturas intercambiables + crédito "Foto: <autor> · Licencia"), sección Familia/Sinónimos; formulario de observación con **autocompletado** de especie + opción "especie nueva" + botón **"Identificar con IA (Pl@ntNet)"** que sugiere especies y las selecciona/registra.
- [x] Legal: toda foto guarda `license` + `attribution` y se muestra; iNaturalist solo consulta licencias CC0/CC-BY/CC-BY-SA (reutilizables en producto comercial).
- [x] `PLANTNET_API_KEY` configurada en `.env` (identificación por foto activa; verificado end-to-end).

### ⏳ Fase 3 — Visión/Misión enlazadas
- [ ] Footer global con Misión/Visión + páginas legales (`/terminos`, `/privacidad`).
- [ ] Resolver rutas rotas restantes (`/categorias/*`), mensaje misión/visión en home/registro.

### ⏳ Fase 4 — Móvil
- [ ] `mobile/sync` autenticado, resolución segura de usuario/especie, respetar `PENDING`.
- [x] Endpoint de verificación admin (curaduría): panel `/admin` + APIs `PATCH/DELETE /api/admin/observations/[id]`.

---

## 6. 🐳 Despliegue con Docker

> **Producción**: despliegue en **Dokploy** en el dominio **`https://ecoraices.neuraljira.tech`**.
> Sigue la guía paso a paso en **`docs/DEPLOY-DOKPLOY.md`** (usa `docker-compose.dokploy.yml` + `.env.dokploy.example`).

### Imagen y stack
- `Dockerfile` multi-stage sobre `node:22-alpine` con **pnpm 11.20.0** (corepack) en ambos stages: install frozen-lockfile → `prisma generate` + `pnpm build` → runtime slim.
- Runtime: `node /app/dist/server/entry.mjs` (adapter `@astrojs/node` standalone; escucha `PORT`/`HOST`).
- `docker-compose.yml` con dos servicios:
  - `db`: `postgis/postgis:16-3.4`, volúmenes `pgdata` y `uploads_data` (este último también montado en la app como `/data/uploads`), healthcheck `pg_isready`.
  - `app`: build local, depende de `db` *healthy*, variables `DATABASE_URL`/`POSTGIS_URL` apuntando a `db:5432`, `JWT_SECRET:?` obligatoria, `APP_URL` y `APP_PORT` configurables, healthcheck HTTP.
- `.dockerignore` excluye `.env*`, `node_modules`, `dist`, `.astro`, `public/uploads`, `docs/` y artefactos de build.
- `docker/docker-entrypoint.sh`: espera a PostgreSQL (`wait-for-db.mjs` con `pg`), ejecuta `npx prisma migrate deploy` (idempotente: no-op si ya aplicadas) y arranca el servidor.
- Uploads: la app escribe en `public/uploads/observations`; con symlinks `dist/client/uploads` y `public/uploads` → `/data/uploads` el server SSR sirve las fotos desde el volumen.

### Provisionamiento inicial de datos
- `scripts/init-postgis.sql` se monta en `/docker-entrypoint-initdb.d/` (primer arranque): crea extensión y `gis.geo2`.
- La DB del contenedor arranca **vacía** (solo migraciones). Para replicar el entorno real de dev:
  `pg_dump "postgresql://<user>:<pass>@localhost:5434/ecoraices" --no-owner --no-acl | docker exec -i ecoraices-db psql -U ecoraices -d ecoraices`
  (recrear antes la DB con `DROP DATABASE`/`CREATE DATABASE` con la app detenida).

### Comandos
| Comando | Descripción |
|---|---|
| `docker build -t ecoraices:prod .` | Construir la imagen |
| `docker compose up -d --build` | Levantar stack (db + app) |
| `docker compose ps` / `docker logs -f ecoraices-app` | Estado y logs |
| `docker compose restart app` | Reiniciar solo la app (volumen `uploads_data` persiste) |
| `docker compose down` | Bajar (mantiene volúmenes) |
| `docker compose down -v` | Bajar **y borrar** volúmenes (DB + uploads) |

### Verificado (smoke test 2026-08-08)
- Build OK; migraciones aplicadas (3) en primer arranque; PostGIS `gis.geo2` creada.
- `/`, `/plantas`, `/observaciones`, `/auth/login`, `/contacto` → 200 con datos reales (61 especies / 326 fotos / 4 usuarios).
- Login `maria@ecoraices.com` → cookie JWT; `POST /api/observations` con foto → 201; foto servida en `/uploads/observations/...` (200); persiste tras `docker compose restart app`.
- Pl@ntNet configurado (`PLANTNET_API_KEY` en `.env`, gitignored): `POST /api/plantnet/identify` → 401 sin auth, 200 con auth (identificó *Guaiacum officinale* 0.77). Cuota free ≈ 500 identificaciones/día.

## 7. Comandos útiles

| Comando | Descripción |
|---|---|
| `pnpm install` | Instalar dependencias (re-ejecutar `pnpm prisma generate` tras cada install) |
| `pnpm prisma migrate deploy` | Aplicar migraciones (en entorno no interactivo usar `migrate diff --from-url ...` para generar SQL) |
| `pnpm prisma generate` | Regenerar cliente Prisma |
| `pnpm db:seed` | Sembrar BD (usa `seed.js`) |
| `pnpm dev` | Desarrollo (puerto 4121) |
| `pnpm build` | Build producción |
| `pnpm etl:seed` | Sembrar/enriquecer catálogo desde GBIF (lista curada de `scripts/data/native-species.mjs`) |
| `pnpm etl:enrich` | Re-matchear especies existentes contra GBIF (familia/sinónimos/nombres comunes) |
| `pnpm etl:photos` | Descargar fotos licenciadas (iNaturalist + Wikimedia) a `SpeciesPhoto` |
| `pnpm etl:all` | Seed + fotos (secuencial) |
| `psql "$DATABASE_URL" -f scripts/init-postgis.sql` | Provisionar PostGIS en entorno nuevo (schema `gis.geo2`) |

## 8. Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | ✅ | Prisma (schema `public`) |
| `POSTGIS_URL` | ✅ | Sincronización a `gis.geo2` |
| `JWT_SECRET` | ✅ (prod) | Firma de tokens |
| `APP_URL` | ✅ | Links de correo y redirects OAuth |
| `MAIL_HOST/PORT/USER/PASS/FROM/SECURE` | ❌ | SMTP; sin ellos, dev imprime el correo |
| `CONTACT_EMAIL` | ❌ | Destinatario del formulario de contacto |
| `GOOGLE_CLIENT_ID/SECRET` | ❌ | OAuth Google (callback `/api/auth/oauth/callback/google`) |
| `FACEBOOK_CLIENT_ID/SECRET` | ❌ | OAuth Facebook (callback `/api/auth/oauth/callback/facebook`) |
| `PLANTNET_API_KEY` | ✅ | Identificación de especies por foto (Pl@ntNet). Gratis ~500 id/día tier free en https://my.plantnet.org/. Sin ella, `/api/plantnet/identify` responde 503 |
