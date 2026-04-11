# NexusAI Runbooks

## Incident Response

### Severity Levels
- **P0** — Complete outage. All users affected. Page on-call immediately.
- **P1** — Major feature broken. >50% users affected. Page within 15 minutes.
- **P2** — Minor feature broken. <50% users affected. Ticket + fix within 24h.
- **P3** — Cosmetic/minor issue. Ticket + fix in next sprint.

### On-Call Escalation
1. Check Grafana dashboard → identify which service is failing
2. Check Sentry → find the error trace
3. Check logs → `docker compose logs backend --tail=100`
4. Escalate if not resolved in 15 minutes

---

## Database Restore

```bash
# 1. Stop the backend
docker compose stop backend worker

# 2. Find the backup to restore
aws s3 ls s3://nexusai-backups/backups/ | sort | tail -20

# 3. Download the backup
aws s3 cp s3://nexusai-backups/backups/nexusai_YYYYMMDD_HHMMSS.sql.gz /tmp/

# 4. Restore
gunzip -c /tmp/nexusai_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i nexusai_postgres_1 psql -U nexusai -d nexusai

# 5. Restart services
docker compose start backend worker

# 6. Verify
curl https://nexusai.com/health/ready
```

---

## Rollback Deployment

```bash
# 1. Find the previous working version
docker images | grep nexusai-backend

# 2. Set the version and redeploy
export VERSION=v1.2.3  # previous good version
docker compose -f docker-compose.production.yml up -d backend frontend

# 3. Verify
curl https://nexusai.com/health
```

---

## Scale Up

```bash
# Add more backend instances
docker compose -f docker-compose.production.yml up -d --scale backend=4 --scale worker=4

# Check
docker compose ps
```

---

## Debug High CPU

```bash
# Check which process is using CPU
docker stats

# Profile the backend
docker exec -it nexusai_backend_1 python -m cProfile -o /tmp/profile.out -m uvicorn app.main:app

# Check slow DB queries
docker exec -it nexusai_postgres_1 psql -U nexusai -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Handle LLM Provider Outage

```bash
# Check circuit breaker status
curl https://nexusai.com/health/ready | jq '.circuits'

# Switch default provider via feature flag
curl -X POST https://nexusai.com/api/v1/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flag": "default_provider", "value": "groq"}'
```

---

## SSL Certificate Renewal

```bash
# Check expiry
openssl s_client -connect nexusai.com:443 -servername nexusai.com 2>/dev/null | \
  openssl x509 -noout -dates

# Force renewal
docker compose exec certbot certbot renew --force-renewal

# Reload nginx
docker compose exec nginx nginx -s reload
```
