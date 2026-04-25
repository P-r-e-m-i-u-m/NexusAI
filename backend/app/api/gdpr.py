from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.session import get_db
from app.models.models import User, Agent, Workflow
from app.core.security import decode_token, oauth2_scheme
from app.core.audit_log import audit

router = APIRouter(tags=["GDPR"])


@router.get("/api/users/me/data")
async def export_user_data(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    payload = decode_token(token)
    user_id = payload["sub"]

    user = (
        await db.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    agents = (
        (await db.execute(select(Agent).where(Agent.owner_id == user_id)))
        .scalars()
        .all()
    )
    workflows = (
        (await db.execute(select(Workflow).where(Workflow.owner_id == user_id)))
        .scalars()
        .all()
    )

    await audit(db, "data_export", "user", user_id, user_id=user_id)

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "created_at": str(user.created_at),
        },
        "agents": [{"id": a.id, "name": a.name} for a in agents],
        "workflows": [{"id": w.id, "name": w.name} for w in workflows],
    }


@router.delete("/api/users/me")
async def delete_account(
    token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
):
    payload = decode_token(token)
    user_id = payload["sub"]

    await audit(db, "account_delete", "user", user_id, user_id=user_id)
    await db.execute(delete(Agent).where(Agent.owner_id == user_id))
    await db.execute(delete(Workflow).where(Workflow.owner_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))

    return {"message": "Account and all associated data deleted"}
