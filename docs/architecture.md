# NexusAI Architecture

## System Overview

```
Internet
    │
    ▼
[Cloudflare CDN / DDoS Protection]
    │
    ▼
[Nginx Load Balancer] ── SSL termination, rate limiting
    │
    ├──▶ [Frontend x2]    Next.js 14, React, React Flow
    │
    └──▶ [Backend x2]     FastAPI, Python 3.12
              │
              ├──▶ [PostgreSQL + pgvector]   Primary data store
              ├──▶ [Redis]                   Cache, sessions, queues
              ├──▶ [Celery Workers x2]       Background tasks
              └──▶ [LLM Gateway]             NVIDIA, OpenAI, Groq...
```

## Component Responsibilities

| Component | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 | Dashboard, visual workflow builder, chat |
| Backend API | FastAPI + Python | REST API, agent orchestration, RAG |
| Worker | Celery + Redis | Async tasks: doc ingestion, long runs |
| Database | PostgreSQL 16 + pgvector | Users, agents, workflows, embeddings |
| Cache | Redis 7 | Rate limiting, session cache, queue broker |
| Reverse Proxy | Nginx | SSL, load balancing, static file serving |
| Monitoring | Prometheus + Grafana | Metrics, dashboards, alerting |
| Tracing | OpenTelemetry + Jaeger | Distributed request tracing |
| Error Tracking | Sentry | Exception monitoring |

## Data Flow: Agent Execution

```
User → POST /api/v1/agents/{id}/run
     → BruteForceMiddleware (check IP)
     → RateLimiterMiddleware (check quota)
     → InputValidationMiddleware (sanitize)
     → JWT auth (verify token)
     → AgentExecutor.run(task)
     → CircuitBreaker.call(llm_provider)
     → NVIDIA API (openai/gpt-oss-120b)
     → Stream tokens back to user
     → AuditLog.append(action)
     → Metrics.record(tokens, latency, cost)
```

## Data Flow: RAG Query

```
User → POST /api/v1/rag/kb/{id}/query
     → cache.get(namespace, params)       ← L1/L2 cache hit?
     → embed(question) via NVIDIA
     → VectorStore.search(embedding, k=5)
     → chat(context + question)
     → cache.set(result, ttl=3600)
     → return {answer, sources}
```

## Security Architecture

```
[WAF / Cloudflare]
    │
[Nginx] ── TLS 1.3, HSTS, CSP headers
    │
[RateLimiter] ── 100 req/min per IP
[BruteForce]  ── 5 failed logins → backoff
[Validator]   ── SQL injection, XSS blocking
[Auth]        ── JWT + RBAC (admin/dev/viewer)
    │
[Business Logic]
    │
[AuditLog]    ── Immutable append-only log
[Secrets]     ── Fernet encrypted, env-based
```

## Scaling Strategy

| Load | Action |
|---|---|
| CPU > 70% | Scale backend to 4 instances |
| Queue depth > 100 | Scale workers to 4 |
| DB connections > 80% | Add read replica |
| > 10k users | Add Redis cluster |
| > 100k users | Migrate to Kubernetes |
