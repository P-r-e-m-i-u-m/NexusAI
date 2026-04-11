#!/bin/bash
set -euo pipefail

DOMAIN=${DOMAIN:-nexusai.com}
EMAIL=${SSL_EMAIL:-admin@nexusai.com}

echo "[SSL] Installing certbot..."
apt-get update -qq && apt-get install -y -qq certbot python3-certbot-nginx

echo "[SSL] Obtaining certificate for $DOMAIN..."
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

echo "[SSL] Certificate obtained. Reloading nginx..."
nginx -s reload || systemctl reload nginx

echo "[SSL] Setting up auto-renewal cron..."
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/nexusai/infra/ssl/certbot-renew.sh >> /var/log/certbot-renew.log 2>&1") | crontab -

echo "[SSL] Done. Certificate will auto-renew every Sunday at 3am."
