# NexusAI — Unified AI Agent Platform

> Build, deploy and orchestrate AI agents, RAG pipelines, workflows, and more. One platform, every AI capability.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/P-r-e-m-i-u-m/NexusAI/actions/workflows/ci.yml/badge.svg)](https://github.com/P-r-e-m-i-u-m/NexusAI/actions)

---

## What is NexusAI?

NexusAI combines the best ideas from 11 open-source AI projects into one self-hosted platform:

| Feature | Inspired By |
|---|---|
| Multi-agent orchestration | CrewAI, AutoGen |
| Graph-based stateful agents | LangGraph |
| AI developer agent | OpenManus, Devin |
| Visual workflow builder | n8n, Langflow |
| RAG pipelines | Dify, Flowise |
| Audio transcription | Whisper |
| Backend platform | Supabase |
| LLM gateway | OpenAI proxy |

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/nexusai.git
cd nexusai
cp .env.example .env
# Edit .env — add your NVIDIA_API_KEY at minimum
```

### 2. Start everything

```bash
docker compose up -d
```

### 3. Open the dashboard

```
http://localhost:3000        # NexusAI UI
http://localhost:8000/docs   # API docs (Swagger)
http://localhost:3001        # Grafana monitoring
http://localhost:9090        # Prometheus metrics
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           NexusAI Dashboard             │
│         Next.js 14 + React Flow         │
├─────────────┬───────────────────────────┤
│  Agents     │  Workflows  │  Chat  │RAG │
├─────────────┴───────────────────────────┤
│         FastAPI Backend (Python)        │
│  Multi-Agent Core │ Dev Agent │ Audio   │
├─────────────────────────────────────────┤
│  PostgreSQL + pgvector │ Redis │ Celery  │
├─────────────────────────────────────────┤
│  NVIDIA │ OpenAI │ Groq │ Mistral │ ... │
└─────────────────────────────────────────┘
```

---

## Configuration

All config lives in `.env`. Key variables:

```dotenv
NVIDIA_API_KEY=nvapi-...          # Your NVIDIA API key
NVIDIA_DEFAULT_MODEL=openai/gpt-oss-120b

# Optional additional providers
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
```

---

## Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run tests

```bash
# Backend
cd backend && pytest tests/ -v

# Load test
cd backend && locust -f tests/load_test.py --host=http://localhost:8000

# Frontend E2E
cd frontend && npx playwright test
```

---

## API Reference

Full Swagger docs at `http://localhost:8000/docs`

Key endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/agents/` | GET/POST | List / create agents |
| `/api/v1/agents/{id}/run` | POST | Run an agent |
| `/api/v1/agents/crew/run` | POST | Run a multi-agent crew |
| `/api/v1/agents/dev/run` | POST | Run AI developer agent |
| `/api/v1/workflows/` | GET/POST | Workflows CRUD |
| `/api/v1/rag/kb` | POST | Create knowledge base |
| `/api/v1/rag/kb/{id}/upload` | POST | Upload document |
| `/api/v1/rag/kb/{id}/query` | POST | RAG query |
| `/api/v1/llm/chat` | POST | Direct LLM chat |
| `/api/v1/audio/transcribe` | POST | Transcribe audio |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome!

---

## License

MIT
