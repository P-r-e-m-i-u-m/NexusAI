from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import os
import shutil

from app.db.session import get_db
from app.models.models import KnowledgeBase, Document
from app.rag.pipeline import ingest_document, query_rag
from app.core.config import settings

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    provider: str = "nvidia"
    model: Optional[str] = None
    top_k: int = 5


@router.post("/kb", status_code=201)
async def create_kb(data: dict, db: AsyncSession = Depends(get_db)):
    kb = KnowledgeBase(
        name=data["name"], description=data.get("description", ""), owner_id="system"
    )
    db.add(kb)
    await db.flush()
    return {"id": kb.id, "name": kb.name}


@router.post("/kb/{kb_id}/upload")
async def upload_document(
    kb_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    upload_dir = os.path.join(settings.UPLOAD_DIR, kb_id)
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, file.filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    result = await ingest_document(kb_id, filepath, file.filename)

    doc = Document(
        kb_id=kb_id,
        filename=file.filename,
        file_path=filepath,
        chunk_count=result["chunks"],
        status="indexed",
    )
    db.add(doc)
    await db.flush()

    return {"filename": file.filename, "chunks": result["chunks"], "status": "indexed"}


@router.post("/kb/{kb_id}/query")
async def query_kb(kb_id: str, request: QueryRequest):
    return await query_rag(
        kb_id,
        request.question,
        provider=request.provider,
        model=request.model,
        top_k=request.top_k,
    )


@router.get("/kb/{kb_id}/documents")
async def list_documents(kb_id: str, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select

    result = await db.execute(select(Document).where(Document.kb_id == kb_id))
    docs = result.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "chunks": d.chunk_count,
            "status": d.status,
        }
        for d in docs
    ]
