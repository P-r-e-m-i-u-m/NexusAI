.PHONY: help dev prod stop test lint migrate backup ssl

help:
	@echo "NexusAI Development Commands"
	@echo "----------------------------"
	@echo "  make dev        Start local development stack"
	@echo "  make prod       Start production stack"
	@echo "  make stop       Stop all containers"
	@echo "  make test       Run all backend tests"
	@echo "  make lint       Run linters (black, ruff, mypy)"
	@echo "  make migrate    Run database migrations"
	@echo "  make backup     Backup database to S3"
	@echo "  make ssl        Setup SSL certificates"
	@echo "  make logs       Tail backend logs"

dev:
	docker compose up -d --build
	@echo "Dashboard: http://localhost:3000"
	@echo "API Docs:  http://localhost:8000/docs"
	@echo "Grafana:   http://localhost:3001"

prod:
	docker compose -f docker-compose.production.yml up -d

stop:
	docker compose down

test:
	cd backend && pytest tests/unit tests/security -v

test-integration:
	cd backend && pytest tests/integration -v

test-all:
	cd backend && pytest tests/ -v

test-e2e:
	cd frontend && npx cypress run

lint:
	cd backend && black app/ && ruff check app/ --fix && mypy app/ --ignore-missing-imports
	cd frontend && npm run lint

migrate:
	docker compose exec backend alembic upgrade head

migrate-down:
	docker compose exec backend alembic downgrade -1

migrate-history:
	docker compose exec backend alembic history

backup:
	docker compose exec postgres bash /scripts/backup-db.sh

ssl:
	bash infra/ssl/certbot-setup.sh

logs:
	docker compose logs -f backend

shell:
	docker compose exec backend python

reset-db:
	docker compose exec backend alembic downgrade base
	docker compose exec backend alembic upgrade head
