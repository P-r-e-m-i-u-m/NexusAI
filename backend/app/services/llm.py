from openai import AsyncOpenAI
from typing import AsyncIterator, Optional, List, Dict
from app.core.config import settings
from app.core.logging import logger

PROVIDERS = {
    "nvidia": {
        "base_url": settings.NVIDIA_BASE_URL,
        "api_key": settings.NVIDIA_API_KEY,
        "default_model": settings.NVIDIA_DEFAULT_MODEL,
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "api_key": settings.OPENAI_API_KEY,
        "default_model": "gpt-4o",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key": settings.GROQ_API_KEY,
        "default_model": "llama-3.1-70b-versatile",
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "api_key": settings.MISTRAL_API_KEY,
        "default_model": "mistral-large-latest",
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "api_key": settings.TOGETHER_API_KEY,
        "default_model": "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    },
}


def get_client(provider: str = "nvidia") -> AsyncOpenAI:
    cfg = PROVIDERS.get(provider, PROVIDERS["nvidia"])
    return AsyncOpenAI(api_key=cfg["api_key"] or "sk-no-key", base_url=cfg["base_url"])


async def chat(
    messages: List[Dict],
    model: Optional[str] = None,
    provider: str = "nvidia",
    temperature: float = 0.7,
    max_tokens: int = 2048,
    stream: bool = False,
) -> str | AsyncIterator:
    client = get_client(provider)
    cfg = PROVIDERS.get(provider, PROVIDERS["nvidia"])
    chosen_model = model or cfg["default_model"]

    logger.info("llm_request", provider=provider, model=chosen_model)

    if stream:
        return client.chat.completions.create(
            model=chosen_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

    response = await client.chat.completions.create(
        model=chosen_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def embed(text: str, provider: str = "nvidia") -> List[float]:
    client = get_client(provider)
    response = await client.embeddings.create(
        model=(
            "nvidia/nv-embedqa-e5-v5"
            if provider == "nvidia"
            else "text-embedding-3-small"
        ),
        input=text,
    )
    return response.data[0].embedding


def list_providers() -> List[Dict]:
    result = []
    for name, cfg in PROVIDERS.items():
        result.append(
            {
                "name": name,
                "available": bool(cfg["api_key"]),
                "default_model": cfg["default_model"],
            }
        )
    return result
