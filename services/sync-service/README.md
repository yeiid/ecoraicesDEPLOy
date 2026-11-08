# EcoRaíces Sync Service (Go)

Microservicio HTTP en Go (solo stdlib, cero dependencias) encargado de **recibir y persistir imágenes de observaciones** en el volumen compartido `/data/uploads`, generando miniaturas JPEG 320×320 y calculando SHA-256 en streaming.

> ⚠️ **Estado actual:** el servicio está en `services/` y **debe commitearse a git**. Sus endpoints `/api/sync/*` hoy no tienen un consumidor en el frontend (el flujo offline real usa `POST /api/observations` vía el proxy Astro → FastAPI). `BACKEND_URL` se lee pero aún no se usa para persistir metadatos (funcionalidad pendiente).

## Endpoints

### `GET /api/sync/health`
Healthcheck. Devuelve JSON + valida que `UPLOADS_DIR` sea escribible (503 si no lo es).

```json
{"status":"ok","service":"ecoraices-sync-service","runtime":"go","domain":"ecoraices.neuraljira.tech","uploads_dir":"/data/uploads","timestamp":"…"}
```

### `POST /api/sync/upload`
Multipart, campo `file` o `image`. Límite **25 MB**.

Respuesta:
```json
{"success":true,"url":"/uploads/observations/…","thumbnailUrl":"/uploads/observations/…_thumb.jpg","fileName":"…","size":12345,"sha256":"…"}
```

### `POST /api/sync/batch`
Multipart, campos `image_<uuid>`. Límite **50 MB**.
Respuesta: `{"total":N,"synced":N,"failed":N,"syncedIds":[…],"errors":[…]}`

### `GET /metrics`
Exposición Prometheus sin dependencias: `http_requests_total`, `http_errors_total`, `uploads_total`, `http_requests_in_flight`, `go_mem_alloc_bytes`, `go_goroutines`.

## Variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `8080` | Puerto de escucha |
| `UPLOADS_DIR` | `/data/uploads` | Raíz de guardado (`observations/` dentro) |
| `BACKEND_URL` | `http://backend:8000` | Reservada (metadatos pendientes) |
| `APP_DOMAIN` | `ecoraices.neuraljira.tech` | Dominio para CORS |
| `MAX_CONCURRENT_UPLOADS` | `8` | Semáforo de concurrencia (503 si se supera) |
| `GOMEMLIMIT` | — | Recomendado `256MiB` en compose |

## Recursos y límites (anti-caídas)

- `http.Server` con `ReadHeaderTimeout=10s`, `ReadTimeout=60s`, `WriteTimeout=120s`, `IdleTimeout=60s`, `MaxHeaderBytes=1MB` (anti-Slowloris).
- Escritura **en streaming a disco** con SHA-256 inline — el archivo ya no se carga entero en RAM (antes sí vía `bytes.Buffer`).
- `recover()` global + `X-Request-ID` por request.
- CORS solo refleja orígenes del dominio/localhost (antes reflejaba cualquier `Origin`).
- `sanitizeFilename()` + validación de path traversal en batch.
- Compose: límites Docker `0.5 CPU / 512M` (+ reservas) y logs rotados `10m×3`.

## Setup local

```bash
cd services/sync-service
go run .            # escucha en :8080, uploads en /data/uploads (ajusta UPLOADS_DIR)
docker build -t ecoraices-sync .
docker run -p 48085:8080 -v uploads:/data/uploads ecoraices-sync
```

## Runbook

- **Logs:** `docker compose logs sync-service -f`
- **Dano disco:** `docker compose exec db df -h /data/uploads || docker volume inspect uploads_data`
- **Limpieza:** borrar huérfanos en `/data/uploads/observations/*_thumb.jpg` sin original.
- **Reinicio:** `docker compose restart sync-service`.

## Tests de rendimiento (k6)

Ver `loadtest/` en la raíz del repo: escenarios `smoke`, `load`, `stress`, `spike`, `soak`, `endurance-disco`.
