import json
import redis.asyncio as aioredis
from typing import Any, Optional
from app.core.config import settings
from app.core.logging import logger

FLAGS_KEY = "nexusai:feature_flags"

DEFAULT_FLAGS = {
    "enable_new_workflow_ui": True,
    "enable_advanced_rag": False,
    "enable_gpt4": True,
    "enable_audio": True,
    "enable_dev_agent": True,
}


class FeatureFlags:
    def __init__(self):
        self._redis = None
        self._local = DEFAULT_FLAGS.copy()

    async def _get_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def is_enabled(self, flag: str, user_id: Optional[str] = None) -> bool:
        try:
            r = await self._get_redis()
            raw = await r.hget(FLAGS_KEY, flag)
            if raw is not None:
                return json.loads(raw)
        except Exception:
            pass
        return self._local.get(flag, False)

    async def set_flag(self, flag: str, value: bool) -> None:
        self._local[flag] = value
        try:
            r = await self._get_redis()
            await r.hset(FLAGS_KEY, flag, json.dumps(value))
            logger.info("feature_flag_set", flag=flag, value=value)
        except Exception as e:
            logger.warning("feature_flag_redis_failed", error=str(e))

    async def all_flags(self) -> dict:
        try:
            r = await self._get_redis()
            raw = await r.hgetall(FLAGS_KEY)
            return {k: json.loads(v) for k, v in raw.items()} if raw else self._local
        except Exception:
            return self._local


flags = FeatureFlags()
