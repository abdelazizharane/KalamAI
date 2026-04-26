import redis.asyncio as aioredis
from app.core.config import settings


class RedisStreamService:
    def __init__(self):
        self._redis = None

    async def _get(self) -> aioredis.Redis:
        if not self._redis:
            self._redis = await aioredis.from_url(settings.redis_url, decode_responses=False)
        return self._redis

    async def set(self, key: str, value: str, ex: int = None):
        r = await self._get()
        await r.set(key, value, ex=ex)

    async def get(self, key: str) -> str | None:
        r = await self._get()
        val = await r.get(key)
        return val.decode() if val else None

    async def delete(self, key: str):
        r = await self._get()
        await r.delete(key)

    async def expire(self, key: str, seconds: int):
        r = await self._get()
        await r.expire(key, seconds)

    # Atomic hash operations used for participant management (no race condition)
    async def hset(self, key: str, field: str, value: str):
        r = await self._get()
        await r.hset(key, field, value)

    async def hdel(self, key: str, field: str):
        r = await self._get()
        await r.hdel(key, field)

    async def hgetall(self, key: str) -> dict:
        r = await self._get()
        raw = await r.hgetall(key)
        return {k.decode(): v.decode() for k, v in raw.items()}

    async def publish(self, channel: str, data: bytes):
        r = await self._get()
        await r.publish(channel, data)

    async def subscribe(self, channel: str):
        r = await self._get()
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

    async def pubsub_numsub(self, channel: str):
        r = await self._get()
        return await r.pubsub_numsub(channel)

    async def listen(self, pubsub):
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield message["data"]
