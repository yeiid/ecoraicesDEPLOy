# 📈 Rendimiento y recursos — EcoRaíces

> **Última actualización:** 2026-11-07 (plan de endurecimiento Fase 1-5). Rellenar métricas reales ejecutando `loadtest/` tras desplegar los límites.

## 1. Arquitectura y presupuesto de recursos

| Servicio | CPU limit | RAM limit | Reserva CPU | Reserva RAM |
|---|---|---|---|---|
| frontend (Astro SSR) | `1.0` | `768M` | `0.25` | `256M` |
| backend (FastAPI, 2 workers) | `1.0` | `768M` | `0.25` | `256M` |
| sync-service (Go, GOMEMLIMIT 256MiB) | `0.5` | `512M` | `0.10` | `128M` |
| db (PostGIS 16) | `1.0` | `768M` | `0.25` | `256M` |
| **Total** | **~3.5 CPUs** | **~2.8 GiB** | — | — |

**Host mínimo recomendado:** 4 vCPU + 8 GiB RAM + 20 GB disco libre (datos + regla 20%).
**Disco crítico:** `uploads_data` crece con cada imagen (~100 KB–25 MB). Alerta al 85%.

## 2. Presupuesto de conexiones Postgres

```
backend:  pool_size 5 + overflow 10 = 15/worker × 2 workers = 30
frontend: pg.Pool max 10
sync-service: 0 (no usa BD)
Total ≈ 40 / max_connections 100  (margen 2.5×)
```

Si `SELECT count(*) FROM pg_stat_activity` supera 70 durante las pruebas, bajar `DB_POOL_*` en el backend.

## 3. Cambios anti-caídas (2026-11-07)

- **sync-service**: `http.Server` con timeouts (10s/60s/120s/60s), semáforo `MAX_CONCURRENT_UPLOADS=8`, streaming a disco (sin buffer RAM), `recover()`, `X-Request-ID`, `/metrics`, CORS reforzado, `sanitizeFilename()`.
- **backend**: pool con `pool_timeout=30`, `pool_recycle=300`, `pool_reset_on_return=rollback`; **N+1 corregido** en `GET /observations` (batch-load + `limit/offset` máx 500); upload en streaming con cap 10 MiB; `asyncpg` + `prometheus_client` añadidos a `requirements.txt`; `/metrics`.
- **frontend**: proxy con `AbortSignal` + `PROXY_TIMEOUT_MS=5000`; IP pública hardcodeada tras `ENABLE_LEGACY_BACKEND_FALLBACK=true` (desactivada por defecto); `--max-old-space-size=512`.
- **Docker**: `deploy.resources` + logs rotados `10m×3` en los 4 servicios (ambos compose); `db` con tuning `shared_buffers=256MB, max_connections=100, work_mem=8MB, log_min_duration_statement=1000`; corregido `init-postgis.sql` en `docker-compose.dokploy.yml` (ruta `frontend/scripts/…`).
- **Dokploy**: `CORS_ORIGINS`, `POSTGIS_URL`, `APP_DOMAIN`, `PROXY_TIMEOUT_MS`, `DB_POOL_*` ahora inyectadas (ver `.env.dokploy.example`).

## 4. Resultados de pruebas (completar ejecutando k6)

| Escenario | RPS máx medido | p95 | Error rate | RAM pico | CPU pico | Punto de fallo |
|---|---|---|---|---|---|---|
| smoke (1 VU, 5 checks) | 12 RPS | 69ms | 0% | — | — | — |
| load (30 VUs × 30s) | 51 RPS (317 iter) | 1.12s | 0% (1585 ck) | backend 195M/768M, frontend 45M, db 49M, sync 3M | backend 6%, frontend 0.7%, db 0%, sync 0% | — |
| **stress (rampa 20→200 VUs × 8 min)** | **189 RPS / 94 iter RPS / 90818 req** | 1.68s | **0%** | backend 209M/768M, frontend 35M, db 47M, sync 10.6M | backend 0.6%, db 7.4%, resto ~0% | **No se encontró en 200 VUs** |
| spike (10→150→10 VUs × 100s) | 57 RPS (5688 req) | 1.71s | 0% | — | — | — |
| soak (20 VUs × 60s verificado; 30 min planificado) | 23 iter RPS (1395) | 1.19s | 0% | sin crecimiento observable | — | memory leak: no detectado en ventana corta |
| endurance-disco | upload manual + batch OK | ~ms | 0% | sync 7.4M/512M (límites respetados) | 0% | disco host al 92% (servidor, no contenedor) |

**Lectura:** el stack soportó 200 VUs concurrentes con 0% de error y p95 <2s. Los límites Docker actuales (backend 768M, etc.) tienen margen amplio — el cuello no está en RAM/CPU sino en la latencia de las rutas SSR + `GET /observations`. Recomendación: mantener límites, y si el tráfico real supera 200 VUs, escalar horizontalmente el backend (`--workers` → 4) antes de subir RAM.

> Para rellenar: `k6 run --out json=loadtest/results-<escenario>.json loadtest/<escenario>.js` y `bash scripts/resource-snapshot.sh` durante cada ejecución.

## 5. Checklist anti-caídas

- [ ] `docker compose config` valida y límites aplicados en Dokploy.
- [ ] Alertas Prometheus configuradas (`monitoring/alert_rules.yml`): memoria >80%, error >1%, disco >85%, servicio caído.
- [ ] Rotación de logs activa (`max-size=10m, max-file=3`).
- [ ] Healthchecks verifican disco escribible (sync) y DB (backend/frontend).
- [ ] Backup `pgdata` + `uploads_data` periódico.
- [ ] `services/` commiteado a git (antes no trackeado).

## 6. Comandos útiles

```bash
docker compose up -d
bash scripts/resource-snapshot.sh
k6 run loadtest/load.js
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up prometheus grafana
```
