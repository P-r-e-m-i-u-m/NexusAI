import json
import time
import hashlib
from typing import Any, Optional
from collections import OrderedDict
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.logging import logger


class LRUCache:
    """L1 in-memory LRU cache."""
    def __init__(self, max_size: int = 1000, ttl: int = 300):
        self.max_size = max_size
        self.ttl = ttl
        self._cache: OrderedDict = OrderedDict()
        self._expiry: dict = {}

    def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        if time.time() > self._expiry.get(key, 0):
            del self._cache[key]
            del self._expiry[key]
            return None
        self._cache.move_to_end(key)
        return self._cache[key]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        self._expiry[key] = time.time() + (ttl or self.ttl)
        if len(self._cache) > self.max_size:
            oldest = next(iter(self._cache))
            del self._cache[oldest]
            self._expiry.pop(oldest, None)

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)
        self._expiry.pop(key, None)

    def stats(self) -> dict:
        return {"size": len(self._cache), "max_size": self.max_size}


class CacheManager:
    def __init__(self):
        self.l1 = LRUCache(max_size=1000, ttl=300)
        self._redis = None
        self._hits = 0
        self._misses = 0

    async def _get_redis(self):
        if not self._redis:
            self._redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    def _make_key(self, namespace: str, params: Any) -> str:
        raw = f"{namespace}:{json.dumps(params, sort_keys=True, default=str)}"
        return hashlib.md5(raw.encode()).hexdigest()

    async def get(self, namespace: str, params: Any) -> Optional[Any]:
        key = self._make_key(namespace, params)
        val = self.l1.get(key)
        if val is not None:
            self._hits += 1
            return val
        try:
            r = await self._get_redis()
            raw = await r.get(f"cache:{key}")
            if raw:
                self._hits += 1
                data = json.loads(raw)
                self.l1.set(key, data)
                return data
        except Exception:
            pass
        self._misses += 1
        return None

    async def set(self, namespace: str, params: Any, value: Any, ttl: int = 3600) -> None:
        key = self._make_key(namespace, params)
        self.l1.set(key, value, ttl=min(ttl, 300))
        try:
            r = await self._get_redis()
            await r.setex(f"cache:{key}", ttl, json.dumps(value, default=str))
        except Exception as e:
            logger.warning("cache_redis_set_failed", error=str(e))

    async def invalidate(self, namespace: str, params: Any) -> None:
        key = self._make_key(namespace, params)
        self.l1.delete(key)
        try:
            r = await self._get_redis()
            await r.delete(f"cache:{key}")
        except Exception:
            pass

    @property
    def hit_ratio(self) -> float:
        total = self._hits + self._misses
        return self._hits / total if total > 0 else 0.0

    def stats(self) -> dict:
        return {
            "hit_ratio": round(self.hit_ratio, 3),
            "hits": self._hits,
            "misses": self._misses,
            "l1": self.l1.stats(),
        }


cache = CacheManager()
