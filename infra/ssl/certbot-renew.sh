#!/bin/bash
set -euo pipefail
echo "[$(date)] Renewing SSL certificates..."
certbot renew --quiet --no-self-upgrade
echo "[$(date)] Reloading nginx..."
docker exec nexusai_nginx_1 nginx -s reload 2>/dev/null || nginx -s reload 2>/dev/null || true
echo "[$(date)] Renewal complete."
