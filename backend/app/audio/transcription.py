import os
import tempfile
from typing import Optional, Dict
from app.core.logging import logger


WHISPER_MODELS = ["tiny", "base", "small", "medium", "large"]

_model_cache: Dict = {}


def load_model(model_size: str = "base"):
    if model_size not in _model_cache:
        import whisper
        logger.info("loading_whisper", model=model_size)
        _model_cache[model_size] = whisper.load_model(model_size)
    return _model_cache[model_size]


async def transcribe(
    filepath: str,
    model_size: str = "base",
    language: Optional[str] = None,
    translate: bool = False,
) -> Dict:
    logger.info("transcribe_start", file=filepath, model=model_size)
    model = load_model(model_size)

    options = {}
    if language:
        options["language"] = language
    if translate:
        options["task"] = "translate"

    result = model.transcribe(filepath, **options)

    return {
        "text": result["text"],
        "language": result.get("language", "unknown"),
        "segments": [
            {"start": s["start"], "end": s["end"], "text": s["text"]}
            for s in result.get("segments", [])
        ],
        "model": model_size,
    }


async def transcribe_from_bytes(
    audio_bytes: bytes,
    filename: str,
    model_size: str = "base",
    language: Optional[str] = None,
    translate: bool = False,
) -> Dict:
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        return await transcribe(tmp_path, model_size=model_size, language=language, translate=translate)
    finally:
        os.unlink(tmp_path)
