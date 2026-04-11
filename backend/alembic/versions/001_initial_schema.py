"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), server_default="developer"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("api_key", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_api_key", "users", ["api_key"], unique=True)

    # agents
    op.create_table(
        "agents",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("role", sa.String(100)),
        sa.Column("goal", sa.Text()),
        sa.Column("backstory", sa.Text()),
        sa.Column("model", sa.String(100), server_default="openai/gpt-oss-120b"),
        sa.Column("provider", sa.String(50), server_default="nvidia"),
        sa.Column("tools", JSONB, server_default="[]"),
        sa.Column("config", JSONB, server_default="{}"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_agents_owner_id", "agents", ["owner_id"])
    op.create_index("ix_agents_is_active", "agents", ["is_active"])
    op.create_index("ix_agents_owner_active", "agents", ["owner_id", "is_active"])

    # workflows
    op.create_table(
        "workflows",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("graph", JSONB, server_default="{}"),
        sa.Column("status", sa.String(20), server_default="draft"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflows_owner_id", "workflows", ["owner_id"])
    op.create_index("ix_workflows_created_at", "workflows", ["created_at"])
    op.create_index("ix_workflows_owner_created", "workflows", ["owner_id", "created_at"])
    op.execute("CREATE INDEX ix_workflows_graph_gin ON workflows USING GIN (graph)")

    # workflow_runs
    op.create_table(
        "workflow_runs",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("workflow_id", sa.String(), sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("input_data", JSONB, server_default="{}"),
        sa.Column("output_data", JSONB, server_default="{}"),
        sa.Column("error", sa.Text()),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("tokens_used", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workflow_runs_workflow_id", "workflow_runs", ["workflow_id"])
    op.create_index("ix_workflow_runs_status", "workflow_runs", ["status"])

    # tasks
    op.create_table(
        "tasks",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("agent_id", sa.String(), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("expected_output", sa.Text()),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("result", sa.Text()),
        sa.Column("tokens_used", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_tasks_agent_id", "tasks", ["agent_id"])
    op.create_index("ix_tasks_status", "tasks", ["status"])

    # knowledge_bases
    op.create_table(
        "knowledge_bases",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_knowledge_bases_owner_id", "knowledge_bases", ["owner_id"])

    # documents
    op.create_table(
        "documents",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("kb_id", sa.String(), sa.ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500)),
        sa.Column("content", sa.Text()),
        sa.Column("chunk_count", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_documents_kb_id", "documents", ["kb_id"])
    op.create_index("ix_documents_status", "documents", ["status"])

    # embeddings table with pgvector
    op.create_table(
        "embeddings",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("document_id", sa.String(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kb_id", sa.String(), nullable=False, index=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.Text()),  # stored as JSON string; pgvector type added below
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    # Use raw SQL to add vector column (pgvector type not in SA core)
    op.execute("ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_vec vector(1536)")
    op.execute("CREATE INDEX ix_embeddings_vec ON embeddings USING ivfflat (embedding_vec vector_cosine_ops) WITH (lists = 100)")
    op.create_index("ix_embeddings_kb_id", "embeddings", ["kb_id"])

    # api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("last_used_at", sa.String()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("permissions", JSONB, server_default="[]"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_api_keys_user_id", "api_keys", ["user_id"])
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"])

    # audit_logs (immutable — no updated_at)
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(), primary_key=True, server_default=sa.text("uuid_generate_v4()::text")),
        sa.Column("user_id", sa.String(), index=True),
        sa.Column("action", sa.String(50), nullable=False, index=True),
        sa.Column("resource_type", sa.String(50), nullable=False, index=True),
        sa.Column("resource_id", sa.String()),
        sa.Column("changes", JSONB),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("trace_id", sa.String(64)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_user_created", "audit_logs", ["user_id", "created_at"])
    op.create_index("ix_audit_logs_resource", "audit_logs", ["resource_type", "resource_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("api_keys")
    op.drop_table("embeddings")
    op.drop_table("documents")
    op.drop_table("knowledge_bases")
    op.drop_table("tasks")
    op.drop_table("workflow_runs")
    op.drop_table("workflows")
    op.drop_table("agents")
    op.drop_table("users")
