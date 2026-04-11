from prometheus_client import Counter, Histogram, Gauge

# LLM usage
llm_tokens = Counter(
    "nexusai_llm_tokens_total",
    "Total LLM tokens used",
    ["provider", "model", "token_type"],
)
llm_latency = Histogram(
    "nexusai_llm_latency_seconds",
    "LLM call latency",
    ["provider", "model"],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30],
)

# Workflows
workflow_duration = Histogram(
    "nexusai_workflow_duration_seconds",
    "Workflow execution duration",
    ["workflow_id", "status"],
    buckets=[0.5, 1, 5, 10, 30, 60, 300],
)
workflow_runs = Counter(
    "nexusai_workflow_runs_total",
    "Total workflow runs",
    ["status"],
)

# RAG
rag_latency = Histogram(
    "nexusai_rag_query_latency_seconds",
    "RAG query latency",
    ["kb_id"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1, 2],
)

# Agents
agent_success_rate = Gauge(
    "nexusai_agent_success_rate",
    "Agent task success rate",
    ["agent_type"],
)

# Active users
active_users = Gauge("nexusai_active_users", "Currently active users")

# Cache
cache_hit_ratio = Gauge(
    "nexusai_cache_hit_ratio",
    "Cache hit ratio",
    ["cache_type"],
)

# Cost tracking
cost_per_request = Counter(
    "nexusai_cost_usd_total",
    "Estimated USD cost",
    ["endpoint", "provider"],
)

# DB
db_query_duration = Histogram(
    "nexusai_db_query_duration_seconds",
    "Database query duration",
    ["table", "operation"],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
)


def record_llm_call(provider: str, model: str, prompt_tokens: int, completion_tokens: int, latency: float):
    llm_tokens.labels(provider=provider, model=model, token_type="prompt").inc(prompt_tokens)
    llm_tokens.labels(provider=provider, model=model, token_type="completion").inc(completion_tokens)
    llm_latency.labels(provider=provider, model=model).observe(latency)


def record_workflow(workflow_id: str, status: str, duration: float):
    workflow_duration.labels(workflow_id=workflow_id, status=status).observe(duration)
    workflow_runs.labels(status=status).inc()
