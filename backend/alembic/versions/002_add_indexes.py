"""add performance indexes

Revision ID: 002
Revises: 001
Create Date: 2025-01-02 00:00:00
"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite indexes for common query patterns
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_workflows_owner_status
        ON workflows (owner_id, status)
        WHERE is_active = true
    """)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_agents_owner_provider
        ON agents (owner_id, provider)
        WHERE is_active = true
    """)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_workflow_runs_workflow_status
        ON workflow_runs (workflow_id, status, created_at DESC)
    """)
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_audit_logs_action_created
        ON audit_logs (action, created_at DESC)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_workflows_owner_status")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_agents_owner_provider")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_workflow_runs_workflow_status")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_audit_logs_action_created")
