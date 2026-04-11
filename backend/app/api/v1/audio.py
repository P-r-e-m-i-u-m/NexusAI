from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from typing import Optional

from app.audio.transcription import transcribe_from_bytes

router = APIRouter()


class TranscribeRequest(BaseModel):
    model_size: str = "base"
    language: Optional[str] = None
    translate: bool = False


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    model_size: str = "base",
    language: Optional[str] = None,
    translate: bool = False,
):
    audio_bytes = await file.read()
    result = await transcribe_from_bytes(
        audio_bytes, file.filename,
        model_size=model_size, language=language, translate=translate,
    )
    return result


@router.get("/models")
async def list_models():
    return {"models": ["tiny", "base", "small", "medium", "large"],
            "note": "larger = slower but more accurate"}
