# Pruebas de carga — EcoRaíces (k6)

> Requiere: `docker compose up -d` con el stack local (backend :48000, frontend :48080, sync :48085).
> Instalar k6: https://grafana.com/docs/k6/latest/installation/

## Comandos

```bash
# smoke/load (carga esperada)
k6 run loadtest/load.js

# stress (hasta el punto de quiebre)
k6 run loadtest/stress.js

# spike (pico abrupto)
k6 run loadtest/spike.js

# soak (30-60 min, detecta memory leaks)
k6 run loadtest/soak.js

# endurance de disco (subidas masivas)
k6 run --out json=loadtest/results-endurance.json loadtest/endurance-disco.js

# contra producción (sin puertos: pasar por Traefik)
BASE_URL=https://ecoraices.neuraljira.tech API_URL=https://ecoraices.neuraljira.tech k6 run loadtest/load.js
```

## Umbrales definidos

- `http_req_duration p(95) < 800ms` (load) / `< 2000ms` (stress)
- `http_req_failed < 1%` (load/soak) / `< 5%` (stress/spike)

## Recursos recomendados

| Escenario | Carga sugerida |
|---|---|
| smoke | 1 VU |
| load | 30 VUs sostenidos |
| stress | rampa 20 → 200 VUs |
| spike | 10 → 150 VUs en 10s → vuelta a 10 |
| soak | 30 VUs × 30 min |
| endurance-disco | 5 VUs × 2 min subiendo 1x1.png |

> Durante cada prueba, captura con `bash scripts/resource-snapshot.sh`.
> Los resultados alimentan `docs/RENDIMIENTO-RECURSOS.md`.
