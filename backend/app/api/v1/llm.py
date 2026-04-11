from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import json

from app.services.llm import chat, list_providers

router = APIRouter()


class ChatRequest(BaseModel):
    messages: List[Dict]
    model: Optional[str] = None
    provider: str = "nvidia"
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False


@router.post("/chat")
async def llm_chat(request: ChatRequest):
    if request.stream:
        async def event_gen():
            stream = await chat(
                messages=request.messages, model=request.model,
                provider=request.provider, temperature=request.temperature,
                max_tokens=request.max_tokens, stream=True,
            )
            async for chunk in await stream:
                content = chunk.choices[0].delta.content or ""
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(event_gen(), media_type="text/event-stream")

    result = await chat(
        messages=request.messages, model=request.model,
        provider=request.provider, temperature=request.temperature,
        max_tokens=request.max_tokens,
    )
    return {"content": result, "provider": request.provider}


@router.get("/providers")
async def get_providers():
    return {"providers": list_providers()}
