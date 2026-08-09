# 🚀 Despliegue en Dokploy — EcoRaíces

Dominio: **https://ecoraices.neuraljira.tech**
API del mapa: **https://map.neuraljira.tech** (integrada vía `style.json` + capa `geo2`)

---

## 1. DNS

En tu proveedor de DNS, crea un registro **A**:

| Tipo | Host | Valor |
|---|---|---|
| A | `ecoraices` | IP pública del servidor donde corre Dokploy |

> Espera a que el registro propague antes de emitir el certificado HTTPS (Let's Encrypt).

## 2. En Dokploy

1. Entra a tu panel Dokploy → crea un **Proyecto** (ej. `EcoRaices`).
2. Dentro del proyecto, crea un despliegue tipo **Compose** (botón "Compose").
3. Pega el contenido de **`docker-compose.dokploy.yml`** de este repo (o conéctalo al repo en la rama de producción y Dokploy leerá el compose).
4. En la pestaña **Environment**, copia las variables de **`.env.dokploy.example`** y rellena los valores reales (sobre todo `JWT_SECRET` y `POSTGRES_PASSWORD`).
5. En el servicio **`app`**, configura el dominio: `https://ecoraices.neuraljira.tech` (Dokploy añade las etiquetas de Traefik y el certificado automáticamente).
6. En el servicio **`db`**, deja el dominio vacío (no expuesto al exterior).
7. Pulsa **Deploy**.

## 3. PostGIS compartido con el mapa (capa geo2)

EcoRaíces sincroniza los árboles a `gis.geo2` de su PostGIS, y tu mapa (`map.neuraljira.tech`) sirve esa capa desde el **mismo** PostGIS (Martin apunta a la misma base).

- Si el mapa ya lee una base existente, configura en Dokploy:
  - `DATABASE_URL` y `POSTGIS_URL` → la cadena de esa base compartida, y elimina el servicio `db` del compose (o usa PostGIS externo).
- Si quieres que el PostGIS de Dokploy sea esa base compartida:
  - Mantén el servicio `db`, despliega una vez para provisionar PostGIS (`gis.geo2`), y apunta el Martin de tu mapa a este PostGIS.

## 4. Variables obligatorias

| Variable | Por qué |
|---|---|
| `JWT_SECRET` | Firma de sesiones (obligatoria, si falta el contenedor no arranca) |
| `APP_URL` | Debe ser `https://ecoraices.neuraljira.tech` (cookies seguras + links de correo) |
| `DATABASE_URL` / `POSTGIS_URL` | Prisma (`public`) y sincronización geoespacial (`gis.geo2`) |
| `PUBLIC_MAP_API_URL` | API del mapa (default `https://map.neuraljira.tech`). ⚠️ Se inlinea en el bundle en el **build**: si la cambias, recompila la imagen |
| `PLANTNET_API_KEY` | Identificación por foto (opcional) |
| `CONTACT_EMAIL` | Destinatario del formulario de contacto |

## 5. Verificación post-despliegue

```bash
curl -I https://ecoraices.neuraljira.tech
curl https://ecoraices.neuraljira.tech/api/observations   # → []
curl -X POST https://ecoraices.neuraljira.tech/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ecoraices.com","password":"password123"}'
```

- Login de admin → accede a `/admin` (gestión de comunidades y observaciones).
- `/perfil` → editar datos + cambiar contraseña.
- Mapa: al abrir `/observaciones`, el navegador debe pedir `https://map.neuraljira.tech/api/v1/style.json` (200) y los tiles `/tiles/...`.

## 6. Datos iniciales

La base del contenedor arranca con **solo el esquema** (migraciones vía entrypoint). Para llevarte los datos reales de tu entorno de dev:

```bash
# Con la app detenida, recrear la base y restaurar un dump
docker compose -f docker-compose.dokploy.yml exec db psql -U ecoraices -d postgres \
  -c 'DROP DATABASE IF EXISTS ecoraices; CREATE DATABASE ecoraices OWNER ecoraices;'
pg_dump "postgresql://ecoraices:TU_PASS@localhost:5434/ecoraices" --no-owner --no-acl \
  | docker compose -f docker-compose.dokploy.yml exec -T db psql -U ecoraices -d ecoraices
```

## 7. Actualizaciones

- En Dokploy: edita el despliegue → cambia de rama/commit o reconstruye → **Deploy**.
- Los volúmenes `pgdata` y `uploads_data` persisten entre despliegues.
- No regenerar la base con `prisma migrate reset` en producción (borra datos).
