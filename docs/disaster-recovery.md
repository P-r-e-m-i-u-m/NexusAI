# NexusAI Disaster Recovery Plan

## Objectives
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour (hourly backups)

## Backup Locations
| Type | Location | Retention |
|---|---|---|
| Database | S3 us-east-1 | 30 days |
| Database (geo-redundant) | S3 eu-west-1 | 30 days |
| WAL archives | S3 us-east-1 | 30 days |
| Docker images | GHCR | indefinite |
| Config/secrets | AWS Secrets Manager | versioned |

## Failover Steps

### 1. Assess the situation (0–15 min)
- Check Grafana/status page
- Identify affected components
- Notify team on Slack #incidents

### 2. Activate DR environment (15–60 min)
```bash
# Point DNS to backup region
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://dns-failover.json

# Start DR stack
ssh deploy@dr.nexusai.com
cd /opt/nexusai && docker compose -f docker-compose.production.yml up -d
```

### 3. Restore database (60–120 min)
```bash
# Get latest backup
aws s3 ls s3://nexusai-backups-eu/backups/ | sort | tail -1

# Restore
aws s3 cp s3://nexusai-backups-eu/backups/latest.sql.gz /tmp/
gunzip -c /tmp/latest.sql.gz | psql $DATABASE_URL
```

### 4. Verify & communicate (120–240 min)
- Run smoke tests
- Update status page
- Send email to users

## Monthly DR Test Checklist
- [ ] Restore database from backup to test environment
- [ ] Verify restored data integrity
- [ ] Test failover DNS switch
- [ ] Measure actual RTO vs target
- [ ] Update this document with findings
