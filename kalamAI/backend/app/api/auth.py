import json
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
import bcrypt
from jose import jwt
from app.core.config import settings
from app.services.redis_stream import RedisStreamService

logger = logging.getLogger(__name__)
router = APIRouter()
_redis = RedisStreamService()


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


def _make_token(user_id: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "name": name, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


@router.post("/register")
async def register(req: RegisterRequest):
    key = f"user:{req.email.lower()}"
    existing = await _redis.get(key)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = {
        "id": req.email.lower(),
        "name": req.name,
        "email": req.email.lower(),
        "password_hash": _hash(req.password),
    }
    await _redis.set(key, json.dumps(user))
    logger.info("User registered: %s", req.email)
    token = _make_token(user["id"], user["name"])
    return {"access_token": token, "token_type": "bearer", "name": user["name"]}


@router.post("/login")
async def login(req: LoginRequest):
    key = f"user:{req.email.lower()}"
    data = await _redis.get(key)
    if not data:
        logger.warning("Login failed — user not found: %s", req.email.lower())
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = json.loads(data)
    if not _verify(req.password, user["password_hash"]):
        logger.warning("Login failed — wrong password for: %s", req.email.lower())
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info("User logged in: %s", req.email)
    token = _make_token(user["id"], user["name"])
    return {"access_token": token, "token_type": "bearer", "name": user["name"]}
