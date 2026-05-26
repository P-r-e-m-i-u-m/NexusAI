from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import User
from app.core.security import require_permission

router = APIRouter()


@router.get("/")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_permission("manage_users")),
):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [
        {"id": u.id, "email": u.email, "username": u.username, "role": u.role}
        for u in users
    ]
