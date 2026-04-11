from fastapi import APIRouter

from app.api.v1 import auth, agents, workflows, rag, audio, llm, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(workflows.router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG"])
api_router.include_router(audio.router, prefix="/audio", tags=["Audio"])
api_router.include_router(llm.router, prefix="/llm", tags=["LLM"])
