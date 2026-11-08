# Snapshot de recursos (uso con docker stats + PG + disco)
#!/usr/bin/env bash
set -euo pipefail
echo "===== $(date -Is) docker stats ====="
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
echo
echo "===== uploads volume ====="
docker run --rm -v "$(docker volume inspect -f '{{.Mountpoint}}' ecoraices_uploads_data 2>/dev/null || echo /var/lib/docker/volumes/ecoraices_uploads_data/_data)":/data alpine df -h /data 2>/dev/null || df -h || true
echo
echo "===== PG conexiones ====="
docker compose -f docker-compose.yml exec -T db psql -U "${POSTGRES_USER:-ecoraices}" -d "${POSTGRES_DB:-ecoraices}" -c "SELECT count(*) AS conexiones, state FROM pg_stat_activity GROUP BY state;" 2>/dev/null || echo "db no disponible"
echo
echo "===== sync health + metrics ====="
curl -s http://localhost:48085/api/sync/health || true; echo
curl -s http://localhost:48085/metrics | head -20 || true
echo
echo "===== backend metrics (tail) ====="
curl -s http://localhost:48000/metrics | tail -20 || true
