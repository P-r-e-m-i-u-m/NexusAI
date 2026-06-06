from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
import uuid

from app.db.session import get_db
from app.models.models import User, UserRole
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/register", status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
        api_key=str(uuid.uuid4()).replace("-", ""),
        role=UserRole.developer,
    )
    db.add(user)
    await db.flush()
    return {"id": user.id, "email": user.email, "username": user.username}


@router.post("/login", response_model=TokenResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role}
    )
    return {"access_token": token}


@router.get("/me")
async def me(db: AsyncSession = Depends(get_db), token: str = Depends(lambda: None)):
    return {"message": "Profile endpoint"}
