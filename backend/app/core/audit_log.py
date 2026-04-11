import json
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import Column, String, Text, JSON
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import BaseModel
from app.core.logging import logger


class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id = Column(String, nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String, nullable=True)
    changes = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    trace_id = Column(String(64), nullable=True)


async def audit(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[str] = None,
    changes: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        changes=changes,
        ip_address=ip_address,
    )
    db.add(entry)
    logger.info(
        "audit",
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
    )
