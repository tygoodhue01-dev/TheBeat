from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, BackgroundTasks, UploadFile, File
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import pathlib
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt
import secrets
import urllib.request
import asyncio
import base64
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

JWT_ALGORITHM = "HS256"
logger = logging.getLogger(__name__)


def _is_production() -> bool:
    return os.environ.get("ENVIRONMENT", os.environ.get("APP_ENV", "")).lower() in ("production", "prod", "live")


def _cors_middleware_kwargs() -> dict:
    """
    CORS for browser + Authorization header. When CORS_ORIGINS is unset:
    - Development: localhost / 127.0.0.1 / ::1 on any port (regex).
    - Production: set CORS_ORIGINS (comma-separated) or FRONTEND_URL (single origin).
    """
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    frontend_url = os.environ.get("FRONTEND_URL", "").strip().rstrip("/")
    if raw:
        origins = [o.strip() for o in raw.split(",") if o.strip() and o.strip() != "*"]
        if any(o.strip() == "*" for o in raw.split(",")):
            logger.warning("CORS_ORIGINS contains * — wildcard is ignored (use explicit origins with credentials).")
        return {"allow_origins": origins, "allow_origin_regex": None}
    if not _is_production():
        logger.warning(
            "CORS_ORIGINS is not set (development). Allowing http(s)://localhost, 127.0.0.1, and ::1 on any port."
        )
        return {
            "allow_origins": ["http://127.0.0.1:3000", "http://localhost:3000"],
            "allow_origin_regex": r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
        }
    if frontend_url:
        return {"allow_origins": [frontend_url], "allow_origin_regex": None}
    logger.warning(
        "CORS_ORIGINS and FRONTEND_URL are not set in production. Cross-origin API calls from your frontend "
        "will fail until you set CORS_ORIGINS (comma-separated) or FRONTEND_URL."
    )
    return {"allow_origins": [], "allow_origin_regex": None}


def _coerce_bool_setting(value, default: bool = False) -> bool:
    if value is True or value is False:
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    if isinstance(value, (int, float)):
        return value != 0
    return default


def _validate_new_password(password: str) -> None:
    if len(password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")
    if len(password) > 256:
        raise HTTPException(status_code=400, detail="Password is too long")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must include at least one letter and one number")


def _verify_image_magic_bytes(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return len(content) >= 3 and content[:3] == b"\xff\xd8\xff"
    if content_type == "image/png":
        return len(content) >= 8 and content[:8] == b"\x89PNG\r\n\x1a\n"
    if content_type == "image/gif":
        return len(content) >= 6 and content[:6] in (b"GIF87a", b"GIF89a")
    if content_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    return False


def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def normalize_roles(primary_role: Optional[str], roles_list: Optional[List[str]] = None) -> tuple[str, List[str]]:
    allowed = {"admin", "dj", "editor", "listener"}
    cleaned: List[str] = []
    for r in (roles_list or []):
        if isinstance(r, str):
            rv = r.strip().lower()
            if rv in allowed and rv not in cleaned:
                cleaned.append(rv)
    p = (primary_role or "").strip().lower() if isinstance(primary_role, str) else ""
    if p in allowed and p not in cleaned:
        cleaned.insert(0, p)
    if not cleaned:
        cleaned = ["listener"]
    return cleaned[0], cleaned

def normalize_avatar_url(value: Optional[str]) -> str:
    if not value or not isinstance(value, str):
        return ""
    raw = value.strip().replace("\\", "/")
    uploads_idx = raw.find("/uploads/")
    if uploads_idx != -1:
        return raw[uploads_idx:]
    if raw.startswith("uploads/"):
        return f"/{raw}"
    if raw.startswith("/"):
        return raw
    return raw

def create_song_key(song_title: str = "", artist: str = "") -> str:
    raw = f"{(song_title or '').strip().lower()}::{(artist or '').strip().lower()}"
    chars = []
    prev_dash = False
    for ch in raw:
        if ch.isalnum():
            chars.append(ch)
            prev_dash = False
        else:
            if not prev_dash:
                chars.append("-")
                prev_dash = True
    key = "".join(chars).strip("-")
    return key or "song"

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        primary_role, roles = normalize_roles(user.get("role"), user.get("roles"))
        user["role"] = primary_role
        user["roles"] = roles
        user["avatar_url"] = normalize_avatar_url(user.get("avatar_url"))
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(*roles):
    async def checker(request: Request):
        user = await get_current_user(request)
        user_roles = set(user.get("roles") or [])
        if user.get("role"):
            user_roles.add(user["role"])
        if not any(r in user_roles for r in roles):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker

# Pydantic Models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    location: Optional[str] = None
    favorite_genre: Optional[str] = None

class SongRatingRequest(BaseModel):
    song_id: str
    song_title: str
    artist: str
    rating: int  # 1-5 stars

class SongCommentRequest(BaseModel):
    song_id: str
    comment: str

class PollCreate(BaseModel):
    question: str
    options: List[str]
    ends_at: Optional[str] = None

class PollVote(BaseModel):
    option_index: int

class CommentCreate(BaseModel):
    content: str
    post_type: str  # 'news', 'show', 'event'
    post_id: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    roles: Optional[List[str]] = None
    bio: Optional[str] = None

class NewsCreate(BaseModel):
    title: str
    content: str
    summary: str = ""
    image_url: str = ""
    category: str = "general"

class NewsUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    published: Optional[bool] = None

class SongRequestCreate(BaseModel):
    song_title: str
    artist: str = ""
    message: str = ""

class ChatMessageCreate(BaseModel):
    message: str

class ShowCreate(BaseModel):
    name: str
    description: str = ""
    dj_id: str = ""
    schedule: str = ""
    image_url: str = ""

class ShowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dj_id: Optional[str] = None
    dj_name: Optional[str] = None
    schedule: Optional[str] = None
    image_url: Optional[str] = None

class NowPlayingUpdate(BaseModel):
    song_title: str
    artist: str = ""
    album: str = ""

class UserRoleUpdate(BaseModel):
    role: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class RewardRedeemRequest(BaseModel):
    reward_id: str

class EventCreate(BaseModel):
    title: str
    description: str = ""
    venue: str = ""
    date: str = ""
    time: str = ""
    image_url: str = ""
    ticket_url: str = ""

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    venue: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    image_url: Optional[str] = None
    ticket_url: Optional[str] = None
    active: Optional[bool] = None

class ContestCreate(BaseModel):
    title: str
    description: str = ""
    prize: str = ""
    end_date: str = ""
    how_to_enter: str = ""
    image_url: str = ""

class ContestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    prize: Optional[str] = None
    end_date: Optional[str] = None
    how_to_enter: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

class PodcastCreate(BaseModel):
    title: str
    description: str = ""
    show_name: str = ""
    dj_name: str = ""
    duration: str = ""
    audio_url: str = ""
    image_url: str = ""

class PodcastUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    show_name: Optional[str] = None
    dj_name: Optional[str] = None
    duration: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None

class ScheduleSlot(BaseModel):
    day_of_week: str  # Monday, Tuesday, etc.
    time_slot: str    # e.g., "6:00 AM - 9:00 AM"
    show_name: str
    dj_name: str
    description: Optional[str] = None

class JobApplication(BaseModel):
    position: str
    name: str
    email: str
    phone: str
    cover_letter: str
    resume_data: Optional[str] = None  # base64 encoded

class JobApplicationUpdate(BaseModel):
    status: str  # pending, approved, rejected

class EmailRequest(BaseModel):
    subject: str
    message: str

class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    display_name: str
    color: str = "#00f0ff"
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[List[str]] = None

# Default permissions available in the system
DEFAULT_PERMISSIONS = [
    {"key": "manage_users", "label": "Manage Users", "description": "View, edit, and delete users"},
    {"key": "manage_roles", "label": "Manage Roles", "description": "Create, edit, and delete roles"},
    {"key": "manage_content", "label": "Manage Content", "description": "Create/edit news, events, contests"},
    {"key": "manage_requests", "label": "Manage Song Requests", "description": "View and manage song requests"},
    {"key": "manage_comments", "label": "Manage Comments", "description": "Approve and delete comments"},
    {"key": "manage_shows", "label": "Manage Shows", "description": "Create and edit shows/schedule"},
    {"key": "update_now_playing", "label": "Update Now Playing", "description": "Change currently playing song"},
    {"key": "view_analytics", "label": "View Analytics", "description": "Access analytics dashboard"},
    {"key": "manage_applications", "label": "Manage Job Applications", "description": "Review job applications"},
    {"key": "manage_polls", "label": "Manage Polls", "description": "Create and manage polls"},
    {"key": "manage_podcasts", "label": "Manage Podcasts", "description": "Create and edit podcasts"},
]

# Default roles with their permissions
DEFAULT_ROLES = {
    "admin": {
        "display_name": "Administrator",
        "color": "#ff007f",
        "permissions": ["manage_users", "manage_roles", "manage_content", "manage_requests", 
                       "manage_comments", "manage_shows", "update_now_playing", "view_analytics",
                       "manage_applications", "manage_polls", "manage_podcasts"]
    },
    "dj": {
        "display_name": "DJ",
        "color": "#00f0ff",
        "permissions": ["manage_requests", "manage_shows", "update_now_playing", "manage_polls"]
    },
    "editor": {
        "display_name": "Editor",
        "color": "#ffff00",
        "permissions": ["manage_content", "manage_comments"]
    },
    "listener": {
        "display_name": "Listener",
        "color": "#888888",
        "permissions": []
    }
}

# Push Notification Models
class PushTokenRegister(BaseModel):
    token: str
    device_name: Optional[str] = None

class PushNotificationSend(BaseModel):
    title: str
    body: str
    data: Optional[dict] = None
    target: str = "all"  # "all" or specific user_id

# App setup — hide interactive docs in production to reduce attack surface
app = FastAPI(
    docs_url=None if _is_production() else "/docs",
    redoc_url=None if _is_production() else "/redoc",
    openapi_url=None if _is_production() else "/openapi.json",
)
_upload_root = pathlib.Path(__file__).resolve().parent / "uploads"
_upload_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_upload_root)), name="uploads")

api_router = APIRouter(prefix="/api")

# ==================== AUTH ENDPOINTS ====================
@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    email = str(req.email).lower().strip()
    _validate_new_password(req.password)
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name.strip(),
        "role": "listener",
        "roles": ["listener"],
        "bio": "",
        "avatar_url": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    access_token = create_access_token(user_id, email, "listener")
    refresh_token = create_refresh_token(user_id)
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    return {"user": user_doc, "access_token": access_token, "refresh_token": refresh_token}

@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    if attempt and attempt.get("locked_until"):
        locked = attempt["locked_until"]
        if isinstance(locked, str):
            locked = datetime.fromisoformat(locked)
        if locked.tzinfo is None:
            locked = locked.replace(tzinfo=timezone.utc)
        if locked > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        # Track failed attempt
        if attempt:
            attempts = attempt.get("attempts", 0) + 1
            update = {"$set": {"attempts": attempts, "last_attempt": datetime.now(timezone.utc).isoformat()}}
            if attempts >= 5:
                update["$set"]["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            await db.login_attempts.update_one({"identifier": identifier}, update)
        else:
            await db.login_attempts.insert_one({
                "identifier": identifier, "attempts": 1,
                "last_attempt": datetime.now(timezone.utc).isoformat()
            })
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear attempts on success
    await db.login_attempts.delete_many({"identifier": identifier})
    
    primary_role, roles = normalize_roles(user.get("role"), user.get("roles"))
    access_token = create_access_token(user["user_id"], email, primary_role)
    refresh_token = create_refresh_token(user["user_id"])
    user.pop("password_hash", None)
    user["role"] = primary_role
    user["roles"] = roles
    return {"user": user, "access_token": access_token, "refresh_token": refresh_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access_token = create_access_token(user["user_id"], user["email"], user["role"])
        return {"access_token": access_token}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}

# ==================== USER PROFILE & PREFERENCES ====================
@api_router.get("/users/me")
async def get_my_profile(user: dict = Depends(get_current_user)):
    # Get user stats
    favorite_songs = await db.favorites.count_documents({"user_id": user["user_id"], "type": "song"})
    total_ratings = await db.song_ratings.count_documents({"user_id": user["user_id"]})
    
    user["stats"] = {
        "favorite_songs": favorite_songs,
        "total_ratings": total_ratings
    }
    return user

@api_router.put("/users/me")
async def update_profile(req: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    update_data = {}
    if req.name: update_data["name"] = req.name.strip()
    if req.bio is not None: update_data["bio"] = req.bio.strip()
    if req.avatar_url is not None: update_data["avatar_url"] = req.avatar_url
    if req.location is not None: update_data["location"] = req.location
    if req.favorite_genre is not None: update_data["favorite_genre"] = req.favorite_genre
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    primary_role, roles = normalize_roles(updated_user.get("role"), updated_user.get("roles"))
    updated_user["role"] = primary_role
    updated_user["roles"] = roles
    return updated_user

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user stats
    favorite_songs = await db.favorites.count_documents({"user_id": user_id, "type": "song"})
    total_ratings = await db.song_ratings.count_documents({"user_id": user_id})
    
    user["stats"] = {
        "favorite_songs": favorite_songs,
        "total_ratings": total_ratings
    }
    return user

# ==================== SONG RATINGS & FAVORITES ====================
@api_router.post("/songs/rate")
async def rate_song(req: SongRatingRequest, user: dict = Depends(get_current_user)):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    rating_doc = {
        "user_id": user["user_id"],
        "user_name": user["name"],
        "song_id": req.song_id,
        "song_title": req.song_title,
        "artist": req.artist,
        "rating": req.rating,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update or insert
    await db.song_ratings.update_one(
        {"user_id": user["user_id"], "song_id": req.song_id},
        {"$set": rating_doc},
        upsert=True
    )
    
    return {"message": "Rating saved", "rating": req.rating}

@api_router.get("/songs/{song_id}/ratings")
async def get_song_ratings(song_id: str):
    ratings = await db.song_ratings.find({"song_id": song_id}, {"_id": 0}).to_list(100)
    
    if not ratings:
        return {"average": 0, "count": 0, "ratings": []}
    
    avg = sum(r["rating"] for r in ratings) / len(ratings)
    return {"average": round(avg, 1), "count": len(ratings), "ratings": ratings}

@api_router.post("/songs/{song_id}/favorite")
async def toggle_favorite(song_id: str, song_title: str = "", artist: str = "", user: dict = Depends(get_current_user)):
    song_key = create_song_key(song_title, artist)
    existing = await db.favorites.find_one({
        "user_id": user["user_id"],
        "$or": [
            {"song_id": song_id},
            {"song_key": song_key}
        ]
    })
    
    if existing:
        await db.favorites.delete_many({
            "user_id": user["user_id"],
            "$or": [
                {"song_id": song_id},
                {"song_key": song_key}
            ]
        })
        return {"message": "Removed from favorites", "favorited": False}
    else:
        fav_doc = {
            "user_id": user["user_id"],
            "type": "song",
            "song_id": song_id,
            "song_key": song_key,
            "song_title": song_title,
            "artist": artist,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.favorites.insert_one(fav_doc)
        return {"message": "Added to favorites", "favorited": True}

@api_router.delete("/songs/{song_id}/favorite")
async def delete_favorite(
    song_id: str,
    song_key: str = "",
    song_title: str = "",
    artist: str = "",
    user: dict = Depends(get_current_user)
):
    resolved_song_key = (song_key or "").strip() or create_song_key(song_title, artist)
    result = await db.favorites.delete_many({
        "user_id": user["user_id"],
        "$or": [
            {"song_id": song_id},
            {"song_key": resolved_song_key}
        ]
    })
    return {
        "message": "Removed from favorites",
        "favorited": False,
        "removed_count": result.deleted_count
    }

@api_router.get("/users/me/favorites")
async def get_my_favorites(user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    seen_song_keys = set()
    deduped = []
    for fav in favorites:
        if fav.get("type") == "song":
            song_key = fav.get("song_key") or create_song_key(fav.get("song_title", ""), fav.get("artist", ""))
            if song_key in seen_song_keys:
                continue
            seen_song_keys.add(song_key)
            fav["song_key"] = song_key
        deduped.append(fav)
    return deduped[:100]

@api_router.put("/users/me/profile")
async def update_my_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Update current user's profile (name, bio, avatar)"""
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.bio is not None:
        update_data["bio"] = req.bio
    if req.avatar_url is not None:
        update_data["avatar_url"] = req.avatar_url
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
        logger.info(f"Profile update for {user['user_id']}: modified={result.modified_count}, data={update_data}")
    
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    primary_role, roles = normalize_roles(updated.get("role"), updated.get("roles"))
    updated["role"] = primary_role
    updated["roles"] = roles
    updated["avatar_url"] = normalize_avatar_url(updated.get("avatar_url"))
    return updated


def _public_base_url(request: Request) -> str:
    return os.environ.get("BACKEND_PUBLIC_URL", "").rstrip("/") or str(request.base_url).rstrip("/")


AVATAR_UPLOAD_DIR = pathlib.Path(__file__).resolve().parent / "uploads" / "avatars"
ALLOWED_AVATAR_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


@api_router.post("/users/me/avatar")
async def upload_my_avatar(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a profile photo; stores file and sets avatar_url on the user."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Image must be JPEG, PNG, WebP, or GIF")

    AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = ALLOWED_AVATAR_TYPES[content_type]
    filename = f"{user['user_id']}_{uuid.uuid4().hex[:10]}{ext}"
    dest = AVATAR_UPLOAD_DIR / filename

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded image is empty")
        max_size = 5 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="Image must be 5MB or smaller")
        if not _verify_image_magic_bytes(content, content_type):
            raise HTTPException(status_code=400, detail="File content does not match a valid image")
        with dest.open("wb") as out:
            out.write(content)
    finally:
        await file.close()

    public_path = f"/uploads/avatars/{filename}"
    avatar_data_url = f"data:{content_type};base64,{base64.b64encode(content).decode('ascii')}"

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "avatar_url": public_path,
            "avatar_data_url": avatar_data_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
    )
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    primary_role, roles = normalize_roles(updated.get("role"), updated.get("roles"))
    updated["role"] = primary_role
    updated["roles"] = roles
    updated["avatar_url"] = normalize_avatar_url(updated.get("avatar_url"))
    return {"avatar_url": updated.get("avatar_url"), "user": updated}

@api_router.get("/users/me/stats")
async def get_my_stats(user: dict = Depends(get_current_user)):
    """Get user's activity statistics"""
    user_id = user["user_id"]
    
    # Count favorites
    favorites_count = await db.favorites.count_documents({"user_id": user_id})
    
    # Count requests made
    requests_count = await db.requests.count_documents({"user_id": user_id})
    
    # Count songs rated
    ratings_count = await db.ratings.count_documents({"user_id": user_id})
    
    # Get user's points (from user document or rewards)
    user_doc = await db.users.find_one({"user_id": user_id})
    points = user_doc.get("points", 0) if user_doc else 0
    
    return {
        "favorites": favorites_count,
        "requests_made": requests_count,
        "songs_rated": ratings_count,
        "points": points
    }

@api_router.get("/admin/favorites/stats")
async def get_favorite_stats(user: dict = Depends(get_current_user)):
    """Get aggregated favorite song statistics for admin dashboard"""
    if user.get("role") not in ["admin", "dj"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get top favorited songs
    pipeline = [
        {"$group": {
            "_id": {"song_title": "$song_title", "artist": "$artist"},
            "count": {"$sum": 1},
            "last_favorited": {"$max": "$created_at"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    top_songs = await db.favorites.aggregate(pipeline).to_list(20)
    
    # Get total favorites count
    total_favorites = await db.favorites.count_documents({})
    
    # Get unique users who have favorited
    unique_users = len(await db.favorites.distinct("user_id"))
    
    # Get recent favorites (last 24 hours)
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_count = await db.favorites.count_documents({"created_at": {"$gte": yesterday.isoformat()}})
    
    return {
        "top_songs": [
            {
                "song_title": s["_id"]["song_title"],
                "artist": s["_id"]["artist"],
                "favorite_count": s["count"],
                "last_favorited": s.get("last_favorited")
            }
            for s in top_songs
        ],
        "total_favorites": total_favorites,
        "unique_users": unique_users,
        "favorites_last_24h": recent_count
    }

# ==================== CHARTS & TRENDING ====================
@api_router.get("/charts/top-rated")
async def get_top_rated_songs(limit: int = 50):
    # Aggregate ratings to get top songs
    pipeline = [
        {"$group": {
            "_id": "$song_id",
            "song_title": {"$first": "$song_title"},
            "artist": {"$first": "$artist"},
            "average_rating": {"$avg": "$rating"},
            "rating_count": {"$sum": 1}
        }},
        {"$match": {"rating_count": {"$gte": 3}}},  # At least 3 ratings
        {"$sort": {"average_rating": -1, "rating_count": -1}},
        {"$limit": limit}
    ]
    
    results = []
    async for doc in db.song_ratings.aggregate(pipeline):
        results.append({
            "song_id": doc["_id"],
            "song_title": doc["song_title"],
            "artist": doc["artist"],
            "average_rating": round(doc["average_rating"], 1),
            "rating_count": doc["rating_count"]
        })
    
    return results

@api_router.get("/charts/most-played")
async def get_most_played_songs(limit: int = 50):
    # Get songs by play count from recently played
    pipeline = [
        {"$group": {
            "_id": {"song_title": "$song_title", "artist": "$artist"},
            "play_count": {"$sum": 1},
            "last_played": {"$max": "$played_at"}
        }},
        {"$sort": {"play_count": -1}},
        {"$limit": limit}
    ]
    
    results = []
    async for doc in db.recently_played.aggregate(pipeline):
        results.append({
            "song_title": doc["_id"]["song_title"],
            "artist": doc["_id"]["artist"],
            "play_count": doc["play_count"],
            "last_played": doc["last_played"]
        })
    
    return results

@api_router.get("/charts/trending")
async def get_trending_songs(limit: int = 20):
    # Get songs played in last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    pipeline = [
        {"$match": {"played_at": {"$gte": seven_days_ago}}},
        {"$group": {
            "_id": {"song_title": "$song_title", "artist": "$artist"},
            "play_count": {"$sum": 1},
            "last_played": {"$max": "$played_at"}
        }},
        {"$sort": {"play_count": -1}},
        {"$limit": limit}
    ]
    
    results = []
    async for doc in db.recently_played.aggregate(pipeline):
        results.append({
            "song_title": doc["_id"]["song_title"],
            "artist": doc["_id"]["artist"],
            "play_count": doc["play_count"],
            "last_played": doc["last_played"]
        })
    
    return results

# ==================== POLLS ====================
@api_router.post("/polls")
async def create_poll(req: PollCreate, user: dict = Depends(require_roles("admin", "dj"))):
    poll_doc = {
        "poll_id": f"poll_{uuid.uuid4().hex[:12]}",
        "question": req.question,
        "options": [{"text": opt, "votes": 0} for opt in req.options],
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ends_at": req.ends_at,
        "active": True
    }
    await db.polls.insert_one(poll_doc)
    poll_doc.pop("_id")
    return poll_doc

@api_router.get("/polls")
async def get_polls(active_only: bool = True):
    query = {"active": True} if active_only else {}
    polls = await db.polls.find(query, {"_id": 0}).sort("created_at", -1).to_list(20)
    return polls

@api_router.post("/polls/{poll_id}/vote")
async def vote_poll(poll_id: str, req: PollVote, user: dict = Depends(get_current_user)):
    # Check if already voted
    existing_vote = await db.poll_votes.find_one({"poll_id": poll_id, "user_id": user["user_id"]})
    if existing_vote:
        raise HTTPException(status_code=400, detail="Already voted")
    
    # Record vote
    vote_doc = {
        "poll_id": poll_id,
        "user_id": user["user_id"],
        "option_index": req.option_index,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.poll_votes.insert_one(vote_doc)
    
    # Update poll
    await db.polls.update_one(
        {"poll_id": poll_id},
        {"$inc": {f"options.{req.option_index}.votes": 1}}
    )
    
    return {"message": "Vote recorded"}

@api_router.get("/polls/{poll_id}")
async def get_poll(poll_id: str):
    poll = await db.polls.find_one({"poll_id": poll_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll

# ==================== ANALYTICS (Admin) ====================
@api_router.get("/analytics/overview")
async def get_analytics_overview(user: dict = Depends(require_roles("admin"))):
    # Get various stats
    total_users = await db.users.count_documents({})
    total_songs_played = await db.recently_played.count_documents({})
    total_ratings = await db.song_ratings.count_documents({})
    total_requests = await db.song_requests.count_documents({})
    total_favorites = await db.favorites.count_documents({})
    
    # Users in last 7 days
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_users = await db.users.count_documents({"created_at": {"$gte": seven_days_ago}})
    
    # Songs played today
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    songs_today = await db.recently_played.count_documents({"played_at": {"$gte": today}})
    
    # Top favorited songs
    top_favorites_pipeline = [
        {"$group": {
            "_id": {"song_title": "$song_title", "artist": "$artist"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_favorites = await db.favorites.aggregate(top_favorites_pipeline).to_list(5)
    
    return {
        "total_users": total_users,
        "new_users_7d": new_users,
        "total_songs_played": total_songs_played,
        "songs_played_today": songs_today,
        "total_ratings": total_ratings,
        "total_requests": total_requests,
        "total_favorites": total_favorites,
        "top_favorites": [
            {"song": f["_id"]["song_title"], "artist": f["_id"]["artist"], "count": f["count"]}
            for f in top_favorites
        ]
    }

@api_router.get("/analytics/users")
async def get_user_analytics(user: dict = Depends(require_roles("admin"))):
    # User growth by day (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    users = await db.users.find(
        {"created_at": {"$gte": thirty_days_ago.isoformat()}},
        {"_id": 0, "created_at": 1}
    ).to_list(1000)
    
    # Group by date
    daily_signups = {}
    for u in users:
        date = u["created_at"][:10]  # YYYY-MM-DD
        daily_signups[date] = daily_signups.get(date, 0) + 1
    
    return {"daily_signups": daily_signups}

# ==================== COMMENTS ====================
@api_router.post("/comments")
async def create_comment(req: CommentCreate, user: dict = Depends(get_current_user)):
    comment_doc = {
        "comment_id": f"comment_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user["name"],
        "post_type": req.post_type,
        "post_id": req.post_id,
        "content": req.content,
        "approved": False,  # Requires approval
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment_doc)
    comment_doc.pop("_id")
    return comment_doc

@api_router.get("/comments/{post_type}/{post_id}")
async def get_comments(post_type: str, post_id: str):
    # Only return approved comments for public
    comments = await db.comments.find(
        {"post_type": post_type, "post_id": post_id, "approved": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return comments

@api_router.get("/admin/comments/pending")
async def get_pending_comments(user: dict = Depends(require_roles("admin", "editor"))):
    comments = await db.comments.find(
        {"approved": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return comments

@api_router.put("/admin/comments/{comment_id}/approve")
async def approve_comment(comment_id: str, user: dict = Depends(require_roles("admin", "editor"))):
    result = await db.comments.update_one(
        {"comment_id": comment_id},
        {"$set": {"approved": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment approved"}

@api_router.delete("/admin/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_roles("admin", "editor"))):
    result = await db.comments.delete_one({"comment_id": comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted"}

# ==================== ENHANCED USER MANAGEMENT ====================
@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, req: UserUpdate, admin: dict = Depends(require_roles("admin"))):
    update_data = {}
    if req.name: update_data["name"] = req.name
    if req.email: update_data["email"] = req.email
    if req.role:
        update_data["role"] = req.role.strip().lower()
    if req.roles is not None:
        primary_role, roles = normalize_roles(req.role, req.roles)
        update_data["role"] = primary_role
        update_data["roles"] = roles
    if req.bio is not None: update_data["bio"] = req.bio
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    primary_role, roles = normalize_roles(updated_user.get("role"), updated_user.get("roles"))
    updated_user["role"] = primary_role
    updated_user["roles"] = roles
    updated_user["avatar_url"] = normalize_avatar_url(updated_user.get("avatar_url"))
    return updated_user

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_roles("admin"))):
    # Prevent deleting yourself
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# ==================== NEWS ENDPOINTS ====================
@api_router.get("/news")
async def list_news(category: str = "", limit: int = 20):
    # Legacy docs may omit `published`; only explicit False is hidden from the public list.
    visibility = {"published": {"$ne": False}}
    if category:
        query = {"$and": [visibility, {"category": category}]}
    else:
        query = visibility
    articles = await db.news.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return articles

@api_router.get("/news/{news_id}")
async def get_news(news_id: str):
    article = await db.news.find_one({"news_id": news_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@api_router.post("/news")
async def create_news(req: NewsCreate, user: dict = Depends(require_roles("admin", "editor"))):
    news_doc = {
        "news_id": f"news_{uuid.uuid4().hex[:12]}",
        "title": req.title,
        "content": req.content,
        "summary": req.summary or req.content[:150],
        "image_url": req.image_url,
        "category": req.category,
        "author_id": user["user_id"],
        "author_name": user["name"],
        "published": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.news.insert_one(news_doc)
    news_doc.pop("_id", None)
    return news_doc

@api_router.put("/news/{news_id}")
async def update_news(news_id: str, req: NewsUpdate, user: dict = Depends(require_roles("admin", "editor"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.news.update_one({"news_id": news_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    article = await db.news.find_one({"news_id": news_id}, {"_id": 0})
    return article

@api_router.delete("/news/{news_id}")
async def delete_news(news_id: str, user: dict = Depends(require_roles("admin", "editor"))):
    result = await db.news.delete_one({"news_id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Deleted"}

# ==================== SONG REQUEST ENDPOINTS ====================
@api_router.get("/requests")
async def list_requests(limit: int = 50):
    # Public endpoint: only show approved requests
    requests = await db.song_requests.find({"status": "approved"}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return requests

@api_router.get("/admin/requests")
async def list_all_requests(status: str = "", limit: int = 50, user: dict = Depends(require_roles("admin", "dj"))):
    # Admin/DJ endpoint: see all requests for management
    query = {}
    if status:
        query["status"] = status
    requests = await db.song_requests.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return requests

@api_router.post("/requests")
async def create_request(req: SongRequestCreate, user: dict = Depends(get_current_user)):
    request_doc = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "song_title": req.song_title,
        "artist": req.artist,
        "message": req.message,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.song_requests.insert_one(request_doc)
    request_doc.pop("_id", None)
    
    # Auto-create chat message
    chat_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "message": f"🎵 Requested: {req.song_title}" + (f" by {req.artist}" if req.artist else "") + (f" - \"{req.message}\"" if req.message else ""),
        "type": "request",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.request_chat.insert_one(chat_doc)
    
    # Award points for making a request
    await award_points(user["user_id"], 10, f"Song request: {req.song_title}", "request")
    
    return request_doc

@api_router.put("/requests/{request_id}/status")
async def update_request_status(request_id: str, status: str, user: dict = Depends(require_roles("admin", "dj"))):
    result = await db.song_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": f"Status updated to {status}"}

@api_router.delete("/requests/{request_id}")
async def delete_request(request_id: str, user: dict = Depends(require_roles("admin", "dj"))):
    result = await db.song_requests.delete_one({"request_id": request_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted"}

@api_router.get("/requests/chat")
async def get_chat(limit: int = 50):
    messages = await db.request_chat.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return list(reversed(messages))

@api_router.post("/requests/chat")
async def send_chat(req: ChatMessageCreate, user: dict = Depends(get_current_user)):
    chat_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "message": req.message,
        "type": "chat",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.request_chat.insert_one(chat_doc)
    chat_doc.pop("_id", None)
    # Award points for chatting
    await award_points(user["user_id"], 5, "Chat message sent", "chat")
    return chat_doc

# ==================== SHOWS ENDPOINTS ====================
@api_router.get("/shows")
async def list_shows():
    shows = await db.shows.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return shows

@api_router.get("/shows/{show_id}")
async def get_show(show_id: str):
    show = await db.shows.find_one({"show_id": show_id}, {"_id": 0})
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return show

@api_router.post("/shows")
async def create_show(req: ShowCreate, user: dict = Depends(require_roles("admin", "dj"))):
    show_doc = {
        "show_id": f"show_{uuid.uuid4().hex[:12]}",
        "name": req.name,
        "description": req.description,
        "dj_id": req.dj_id or user["user_id"],
        "dj_name": user["name"],
        "schedule": req.schedule,
        "image_url": req.image_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shows.insert_one(show_doc)
    show_doc.pop("_id", None)
    return show_doc

@api_router.put("/shows/{show_id}")
async def update_show(show_id: str, req: ShowUpdate, user: dict = Depends(require_roles("admin", "dj"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.shows.update_one({"show_id": show_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Show not found")

    updated = await db.shows.find_one({"show_id": show_id}, {"_id": 0})
    return updated

@api_router.delete("/shows/{show_id}")
async def delete_show(show_id: str, user: dict = Depends(require_roles("admin", "dj"))):
    result = await db.shows.delete_one({"show_id": show_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Show not found")
    return {"message": "Show deleted"}

# ==================== NOW PLAYING ENDPOINT ====================
@api_router.get("/now-playing")
async def get_now_playing():
    np = await db.now_playing.find_one({"active": True}, {"_id": 0})
    if not np:
        return {
            "song_title": "The Beat 515",
            "artist": "Live Radio",
            "album": "",
            "dj_name": "AutoDJ",
            "started_at": datetime.now(timezone.utc).isoformat()
        }
    return np

@api_router.put("/now-playing")
async def update_now_playing(req: NowPlayingUpdate, user: dict = Depends(require_roles("admin", "dj"))):
    # Get current now playing to check if song changed
    current = await db.now_playing.find_one({"active": True}, {"_id": 0})
    current_song = current.get("song_title", "") if current else ""
    current_artist = current.get("artist", "") if current else ""
    
    np_doc = {
        "song_title": req.song_title,
        "artist": req.artist,
        "album": req.album,
        "dj_name": user["name"],
        "active": True,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "source": "manual_update"
    }
    await db.now_playing.update_one({"active": True}, {"$set": np_doc}, upsert=True)
    
    # Add to recently played if song changed
    if req.song_title != current_song or req.artist != current_artist:
        recently_played_doc = {
            "song_id": f"song_{uuid.uuid4().hex[:12]}",
            "song_title": req.song_title,
            "artist": req.artist,
            "album": req.album or "",
            "played_at": datetime.now(timezone.utc).isoformat(),
            "source": "manual_update",
            "dj_name": user["name"]
        }
        await db.recently_played.insert_one(recently_played_doc)
        logger.info(f"DJ {user['name']} updated now playing: {req.artist} - {req.song_title}")
    
    return np_doc

# ==================== DJ PROFILES ====================
@api_router.get("/djs")
async def list_djs():
    djs = await db.users.find(
        {"$or": [{"role": "dj"}, {"roles": "dj"}]},
        {"_id": 0, "password_hash": 0}
    ).to_list(50)
    for d in djs:
        primary_role, roles = normalize_roles(d.get("role"), d.get("roles"))
        d["role"] = primary_role
        d["roles"] = roles
        d["avatar_url"] = normalize_avatar_url(d.get("avatar_url"))
    return djs

@api_router.get("/djs/{user_id}")
async def get_dj(user_id: str):
    dj = await db.users.find_one(
        {"user_id": user_id, "$or": [{"role": "dj"}, {"roles": "dj"}]},
        {"_id": 0, "password_hash": 0}
    )
    if not dj:
        raise HTTPException(status_code=404, detail="DJ not found")
    primary_role, roles = normalize_roles(dj.get("role"), dj.get("roles"))
    dj["role"] = primary_role
    dj["roles"] = roles
    dj["avatar_url"] = normalize_avatar_url(dj.get("avatar_url"))
    shows = await db.shows.find({"dj_id": user_id}, {"_id": 0}).to_list(20)
    return {**dj, "shows": shows}

# ==================== ADMIN ENDPOINTS ====================
@api_router.get("/admin/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    for u in users:
        primary_role, roles = normalize_roles(u.get("role"), u.get("roles"))
        u["role"] = primary_role
        u["roles"] = roles
    return users

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, req: UserRoleUpdate, user: dict = Depends(require_roles("admin"))):
    if req.role not in ["admin", "dj", "editor", "listener"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": req.role, "roles": [req.role]}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {req.role}"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    if user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== ROLE MANAGEMENT ====================
@api_router.get("/admin/roles")
async def get_all_roles(user: dict = Depends(require_roles("admin"))):
    """Get all roles with their permissions"""
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    if not roles:
        # Initialize default roles if none exist
        for role_key, role_data in DEFAULT_ROLES.items():
            role_doc = {
                "role_id": role_key,
                "name": role_key,
                "display_name": role_data["display_name"],
                "color": role_data["color"],
                "permissions": role_data["permissions"],
                "is_system": role_key in ["admin", "listener"],  # Can't delete system roles
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.roles.insert_one(role_doc)
        roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    return roles

@api_router.get("/admin/permissions")
async def get_all_permissions(user: dict = Depends(require_roles("admin"))):
    """Get all available permissions"""
    return DEFAULT_PERMISSIONS

@api_router.post("/admin/roles")
async def create_role(req: RoleCreate, user: dict = Depends(require_roles("admin"))):
    """Create a new role"""
    role_id = req.name.lower().replace(" ", "_")
    existing = await db.roles.find_one({"role_id": role_id})
    if existing:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    role_doc = {
        "role_id": role_id,
        "name": req.name,
        "display_name": req.display_name,
        "color": req.color,
        "permissions": req.permissions,
        "is_system": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.roles.insert_one(role_doc)
    role_doc.pop("_id", None)
    return role_doc

@api_router.put("/admin/roles/{role_id}")
async def update_role(role_id: str, req: RoleUpdate, user: dict = Depends(require_roles("admin"))):
    """Update a role's permissions and settings"""
    role = await db.roles.find_one({"role_id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    update_data = {}
    if req.display_name is not None:
        update_data["display_name"] = req.display_name
    if req.color is not None:
        update_data["color"] = req.color
    if req.permissions is not None:
        update_data["permissions"] = req.permissions
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.roles.update_one({"role_id": role_id}, {"$set": update_data})
    
    updated = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_roles("admin"))):
    """Delete a role (cannot delete system roles)"""
    role = await db.roles.find_one({"role_id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system role")
    
    # Check if any users have this role
    users_with_role = await db.users.count_documents({"role": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role - {users_with_role} users have this role")
    
    await db.roles.delete_one({"role_id": role_id})
    return {"message": "Role deleted"}

# ==================== PUSH NOTIFICATIONS ====================
import httpx

async def send_expo_push_notification(tokens: List[str], title: str, body: str, data: dict = None):
    """Send push notification via Expo Push Service"""
    messages = []
    for token in tokens:
        if not token.startswith('ExponentPushToken'):
            continue
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
        }
        if data:
            message["data"] = data
        messages.append(message)
    
    if not messages:
        return {"success": 0, "failed": 0}
    
    # Send to Expo Push Service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Content-Type": "application/json"}
            )
            result = response.json()
            success = len([r for r in result.get("data", []) if r.get("status") == "ok"])
            return {"success": success, "failed": len(messages) - success}
        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return {"success": 0, "failed": len(messages), "error": str(e)}

@api_router.post("/push/register")
async def register_push_token(req: PushTokenRegister, user: dict = Depends(get_current_user)):
    """Register a device's push token"""
    # Store or update the push token for this user
    await db.push_tokens.update_one(
        {"user_id": user["user_id"], "token": req.token},
        {"$set": {
            "user_id": user["user_id"],
            "token": req.token,
            "device_name": req.device_name or "Unknown Device",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Push token registered successfully"}

@api_router.delete("/push/unregister")
async def unregister_push_token(token: str, user: dict = Depends(get_current_user)):
    """Unregister a push token"""
    await db.push_tokens.delete_one({"user_id": user["user_id"], "token": token})
    return {"message": "Push token unregistered"}

@api_router.get("/admin/push/tokens")
async def get_push_tokens(user: dict = Depends(require_roles("admin"))):
    """Get all registered push tokens (admin only)"""
    tokens = await db.push_tokens.find({}, {"_id": 0}).to_list(1000)
    return {"total": len(tokens), "tokens": tokens}

@api_router.post("/admin/push/send")
async def send_push_notification(req: PushNotificationSend, user: dict = Depends(require_roles("admin"))):
    """Send push notification to users (admin only)"""
    if req.target == "all":
        # Get all tokens
        tokens_docs = await db.push_tokens.find({}, {"token": 1}).to_list(10000)
        tokens = [t["token"] for t in tokens_docs]
    else:
        # Get tokens for specific user
        tokens_docs = await db.push_tokens.find({"user_id": req.target}, {"token": 1}).to_list(100)
        tokens = [t["token"] for t in tokens_docs]
    
    if not tokens:
        raise HTTPException(status_code=400, detail="No push tokens found for target")
    
    # Send notifications
    result = await send_expo_push_notification(tokens, req.title, req.body, req.data)
    
    # Log the notification
    await db.push_history.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "title": req.title,
        "body": req.body,
        "data": req.data,
        "target": req.target,
        "sent_by": user["user_id"],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "result": result
    })
    
    return {
        "message": "Notification sent",
        "tokens_targeted": len(tokens),
        **result
    }

@api_router.get("/admin/push/history")
async def get_push_history(limit: int = 50, user: dict = Depends(require_roles("admin"))):
    """Get push notification history (admin only)"""
    history = await db.push_history.find({}, {"_id": 0}).sort("sent_at", -1).to_list(limit)
    return history

# ==================== PROFILE ====================
@api_router.put("/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    updated = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ==================== METADATA FETCHING ====================
def fetch_icecast_metadata(stream_url: str) -> dict:
    """Fetch current song metadata from Icecast/Shoutcast stream."""
    try:
        header = {'Icy-MetaData': '1', 'User-Agent': 'TheBeat515/1.0'}
        request = urllib.request.Request(stream_url, headers=header)
        response = urllib.request.urlopen(request, timeout=10)

        station_name = response.headers.get('icy-name', 'The Beat 515')

        icy_metaint_header = response.headers.get('icy-metaint')
        if icy_metaint_header is None:
            logger.warning("No icy-metaint header in stream response")
            return None

        metaint = int(icy_metaint_header)
        read_buffer = metaint + 4096
        content = response.read(read_buffer)

        content_str = content.decode('latin-1', errors='ignore')

        stream_title_pos = content_str.find("StreamTitle='")
        if stream_title_pos == -1:
            logger.warning("No StreamTitle found in metadata")
            return None

        post_title_content = content_str[stream_title_pos + 13:]
        semicolon_pos = post_title_content.find("';")
        if semicolon_pos == -1:
            logger.warning("Could not parse StreamTitle")
            return None

        full_title = post_title_content[:semicolon_pos].strip()

        if not full_title or full_title.lower() in ('unknown', '', 'n/a', 'none'):
            logger.info(f"Stream metadata has no song info (title='{full_title}'), skipping update")
            return None

        if ' - ' in full_title:
            parts = full_title.split(' - ', 1)
            artist = parts[0].strip()
            song_title = parts[1].strip()
        else:
            artist = station_name
            song_title = full_title

        return {
            "song_title": song_title,
            "artist": artist,
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching metadata: {e}")
        return None

async def update_now_playing_from_stream():
    """Background task to update now playing from configured stream."""
    # Get stream URL from database config
    config = await db.stream_config.find_one({"active": True}, {"_id": 0})
    base_url = config.get("stream_url", "https://das-edge62-live365-dal03.cdnstream.com/a55796") if config else "https://das-edge62-live365-dal03.cdnstream.com/a55796"
    
    stream_urls = [base_url]
    # Also try http variant if https
    if base_url.startswith("https://"):
        stream_urls.append(base_url.replace("https://", "http://"))
    
    metadata = None
    for stream_url in stream_urls:
        try:
            # Fetch metadata
            metadata = await asyncio.to_thread(fetch_icecast_metadata, stream_url)
            if metadata:
                logger.info(f"Successfully fetched metadata from {stream_url}")
                break
        except Exception as e:
            logger.debug(f"Failed to fetch from {stream_url}: {e}")
            continue
    
    if metadata:
        try:
            # Get current now playing
            current = await db.now_playing.find_one({"active": True}, {"_id": 0})
            current_song = current.get("song_title", "") if current else ""
            current_artist = current.get("artist", "") if current else ""
            
            # Only update if song changed
            if metadata["song_title"] != current_song or metadata["artist"] != current_artist:
                # Update now playing
                np_doc = {
                    "song_title": metadata["song_title"],
                    "artist": metadata["artist"],
                    "album": "",
                    "dj_name": "Live365 Stream",
                    "active": True,
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "source": "live365_metadata"
                }
                await db.now_playing.update_one({"active": True}, {"$set": np_doc}, upsert=True)
                
                # Add to recently played
                recently_played_doc = {
                    "song_id": f"song_{uuid.uuid4().hex[:12]}",
                    "song_title": metadata["song_title"],
                    "artist": metadata["artist"],
                    "album": "",
                    "played_at": datetime.now(timezone.utc).isoformat(),
                    "source": "live365_metadata"
                }
                await db.recently_played.insert_one(recently_played_doc)
                
                logger.info(f"Updated now playing: {metadata['artist']} - {metadata['song_title']}")
            else:
                logger.debug("Song unchanged, no update needed")
        except Exception as e:
            logger.error(f"Error updating database: {e}")
    else:
        logger.warning("Could not fetch metadata from any stream URL - metadata may not be available")

# ==================== STREAM CONFIG ====================
class StreamConfigUpdate(BaseModel):
    stream_url: Optional[str] = None
    station_name: Optional[str] = None
    tagline: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = None

@api_router.get("/stream-config")
async def get_stream_config():
    config = await db.stream_config.find_one({"active": True}, {"_id": 0})
    if not config:
        return {
            "stream_url": "https://das-edge62-live365-dal03.cdnstream.com/a55796",
            "station_name": "The Beat 515",
            "tagline": "Proud. Loud. Local.",
            "maintenance_mode": False,
            "maintenance_message": "",
        }
    config["maintenance_mode"] = _coerce_bool_setting(config.get("maintenance_mode"), False)
    config["maintenance_message"] = str(config.get("maintenance_message") or "")[:2000]
    return config

@api_router.put("/stream-config")
async def update_stream_config(req: StreamConfigUpdate, user: dict = Depends(require_roles("admin", "dj"))):
    """Update stream configuration (URL, station name, tagline)."""
    update_data = {}
    if req.stream_url is not None:
        update_data["stream_url"] = req.stream_url
    if req.station_name is not None:
        update_data["station_name"] = req.station_name
    if req.tagline is not None:
        update_data["tagline"] = req.tagline
    if req.maintenance_mode is not None:
        update_data["maintenance_mode"] = bool(req.maintenance_mode)
    if req.maintenance_message is not None:
        msg = (req.maintenance_message or "").strip()
        update_data["maintenance_message"] = msg[:2000]
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.stream_config.update_one({"active": True}, {"$set": update_data}, upsert=True)
    config = await db.stream_config.find_one({"active": True}, {"_id": 0})
    logger.info(f"Stream config updated by {user['name']}: {update_data}")
    return config

@api_router.post("/stream/update-metadata")
async def update_metadata_webhook(song_title: str, artist: str = "", album: str = ""):
    """
    Webhook endpoint for broadcasting software to push metadata updates.
    Can be called from SAM Broadcaster, RadioDJ, or any broadcasting software.
    
    Example: POST /api/stream/update-metadata?song_title=Song&artist=Artist&album=Album
    """
    try:
        # Get current now playing
        current = await db.now_playing.find_one({"active": True}, {"_id": 0})
        current_song = current.get("song_title", "") if current else ""
        current_artist = current.get("artist", "") if current else ""
        
        # Only update if song changed
        if song_title != current_song or artist != current_artist:
            # Update now playing
            np_doc = {
                "song_title": song_title,
                "artist": artist,
                "album": album,
                "dj_name": "Live Stream",
                "active": True,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "source": "webhook_update"
            }
            await db.now_playing.update_one({"active": True}, {"$set": np_doc}, upsert=True)
            
            # Add to recently played
            recently_played_doc = {
                "song_id": f"song_{uuid.uuid4().hex[:12]}",
                "song_title": song_title,
                "artist": artist,
                "album": album,
                "played_at": datetime.now(timezone.utc).isoformat(),
                "source": "webhook_update"
            }
            await db.recently_played.insert_one(recently_played_doc)
            
            logger.info(f"Webhook updated now playing: {artist} - {song_title}")
            return {"message": "Metadata updated successfully", "song": song_title, "artist": artist}
        else:
            return {"message": "Song unchanged", "song": song_title, "artist": artist}
    except Exception as e:
        logger.error(f"Error in metadata webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/stream/refresh-metadata")
async def refresh_metadata(background_tasks: BackgroundTasks):
    """Manually trigger metadata refresh (for testing)."""
    background_tasks.add_task(update_now_playing_from_stream)
    return {"message": "Metadata refresh triggered"}

# ==================== RECENTLY PLAYED ====================
@api_router.get("/recently-played")
async def get_recently_played(limit: int = 50):
    """Get recently played songs."""
    songs = await db.recently_played.find({}, {"_id": 0}).sort("played_at", -1).limit(limit).to_list(limit)
    return songs

# ==================== STATS (ADMIN) ====================
@api_router.get("/admin/stats")
async def get_stats(user: dict = Depends(require_roles("admin"))):
    total_users = await db.users.count_documents({})
    total_news = await db.news.count_documents({})
    total_requests = await db.song_requests.count_documents({})
    pending_requests = await db.song_requests.count_documents({"status": "pending"})
    total_shows = await db.shows.count_documents({})
    return {
        "total_users": total_users,
        "total_news": total_news,
        "total_requests": total_requests,
        "pending_requests": pending_requests,
        "total_shows": total_shows
    }

# ==================== REWARDS HELPER ====================
async def award_points(user_id: str, points: int, description: str, tx_type: str):
    """Award points to a user and log the transaction."""
    await db.user_points.update_one(
        {"user_id": user_id},
        {"$inc": {"points": points, "lifetime_points": points}, "$setOnInsert": {"user_id": user_id}},
        upsert=True
    )
    await db.point_transactions.insert_one({
        "transaction_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "points": points,
        "type": tx_type,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# ==================== EVENTS ENDPOINTS ====================
@api_router.get("/events")
async def list_events():
    visibility = {"active": {"$ne": False}}
    events = await db.events.find(visibility, {"_id": 0}).sort("date", 1).to_list(50)
    return events

@api_router.post("/events")
async def create_event(req: EventCreate, user: dict = Depends(require_roles("admin"))):
    doc = {
        "event_id": f"evt_{uuid.uuid4().hex[:12]}",
        "title": req.title, "description": req.description,
        "venue": req.venue, "date": req.date, "time": req.time,
        "image_url": req.image_url, "ticket_url": req.ticket_url,
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/events/{event_id}")
async def update_event(event_id: str, req: EventUpdate, user: dict = Depends(require_roles("admin"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.events.update_one({"event_id": event_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")

    updated = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(require_roles("admin"))):
    result = await db.events.delete_one({"event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ==================== CONTESTS ENDPOINTS ====================
@api_router.get("/contests")
async def list_contests(include_inactive: bool = False):
    if include_inactive:
        query = {}
    else:
        query = {"active": {"$ne": False}}
    contests = await db.contests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return contests

@api_router.post("/contests")
async def create_contest(req: ContestCreate, user: dict = Depends(require_roles("admin"))):
    doc = {
        "contest_id": f"cst_{uuid.uuid4().hex[:12]}",
        "title": req.title, "description": req.description,
        "prize": req.prize, "end_date": req.end_date,
        "how_to_enter": req.how_to_enter, "image_url": req.image_url,
        "active": True, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contests.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/contests/{contest_id}")
async def update_contest(contest_id: str, req: ContestUpdate, user: dict = Depends(require_roles("admin"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.contests.update_one({"contest_id": contest_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")

    updated = await db.contests.find_one({"contest_id": contest_id}, {"_id": 0})
    return updated

@api_router.delete("/contests/{contest_id}")
async def delete_contest(contest_id: str, user: dict = Depends(require_roles("admin"))):
    result = await db.contests.delete_one({"contest_id": contest_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contest not found")
    return {"message": "Contest deleted"}

# ==================== PODCASTS / REPLAYS ====================
@api_router.get("/podcasts")
async def list_podcasts():
    pods = await db.podcasts.find({}, {"_id": 0}).sort("created_at", -1).to_list(30)
    return pods

@api_router.post("/podcasts")
async def create_podcast(req: PodcastCreate, user: dict = Depends(require_roles("admin", "dj"))):
    doc = {
        "podcast_id": f"pod_{uuid.uuid4().hex[:12]}",
        "title": req.title, "description": req.description,
        "show_name": req.show_name, "dj_name": req.dj_name or user["name"],
        "duration": req.duration, "audio_url": req.audio_url,
        "image_url": req.image_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.podcasts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/podcasts/{podcast_id}")
async def update_podcast(podcast_id: str, req: PodcastUpdate, user: dict = Depends(require_roles("admin", "dj"))):
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.podcasts.update_one({"podcast_id": podcast_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Podcast not found")

    updated = await db.podcasts.find_one({"podcast_id": podcast_id}, {"_id": 0})
    return updated

@api_router.delete("/podcasts/{podcast_id}")
async def delete_podcast(podcast_id: str, user: dict = Depends(require_roles("admin", "dj"))):
    result = await db.podcasts.delete_one({"podcast_id": podcast_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return {"message": "Podcast deleted"}

# ==================== REWARDS ENDPOINTS ====================
@api_router.get("/rewards")
async def list_rewards():
    rewards = await db.rewards.find({"active": True}, {"_id": 0}).sort("points_cost", 1).to_list(50)
    return rewards

@api_router.get("/rewards/my-points")
async def get_my_points(user: dict = Depends(get_current_user)):
    pts = await db.user_points.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not pts:
        return {"user_id": user["user_id"], "points": 0, "lifetime_points": 0}
    return pts

@api_router.get("/rewards/my-history")
async def get_my_history(user: dict = Depends(get_current_user)):
    txs = await db.point_transactions.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    return txs

@api_router.get("/rewards/leaderboard")
async def get_leaderboard():
    leaders = await db.user_points.find({}, {"_id": 0}).sort("lifetime_points", -1).limit(10).to_list(10)
    result = []
    for l in leaders:
        u = await db.users.find_one({"user_id": l["user_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            result.append({**l, "name": u.get("name", "Unknown"), "role": u.get("role", "listener")})
    return result

@api_router.post("/rewards/check-in")
async def daily_check_in(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.point_transactions.find_one({
        "user_id": user["user_id"], "type": "check_in",
        "created_at": {"$regex": f"^{today}"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today!")
    await award_points(user["user_id"], 25, "Daily check-in bonus", "check_in")
    pts = await db.user_points.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"message": "Check-in complete! +25 points", "points": pts.get("points", 25)}

@api_router.post("/rewards/redeem")
async def redeem_reward(req: RewardRedeemRequest, user: dict = Depends(get_current_user)):
    reward = await db.rewards.find_one({"reward_id": req.reward_id, "active": True}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    pts = await db.user_points.find_one({"user_id": user["user_id"]}, {"_id": 0})
    current = pts.get("points", 0) if pts else 0
    if current < reward["points_cost"]:
        raise HTTPException(status_code=400, detail="Not enough points")
    await db.user_points.update_one({"user_id": user["user_id"]}, {"$inc": {"points": -reward["points_cost"]}})
    await db.point_transactions.insert_one({
        "transaction_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "points": -reward["points_cost"],
        "type": "redeem",
        "description": f"Redeemed: {reward['name']}",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": f"Redeemed: {reward['name']}!"}

# ==================== SCHEDULE ENDPOINTS ====================
@api_router.get("/schedule")
async def get_schedule():
    """Public endpoint - get all schedule slots"""
    schedule = await db.schedule.find({}).to_list(length=None)
    for s in schedule:
        s.pop("_id", None)
    # Sort by day and time
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    schedule.sort(key=lambda x: (day_order.index(x.get("day_of_week", "Monday")), x.get("time_slot", "")))
    return schedule

@api_router.post("/admin/schedule")
async def create_schedule_slot(slot: ScheduleSlot, user: dict = Depends(require_roles("admin"))):
    """Admin only - create new schedule slot"""
    slot_id = f"sch_{uuid.uuid4().hex[:12]}"
    slot_data = {
        "schedule_id": slot_id,
        **slot.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.schedule.insert_one(slot_data)
    slot_data.pop("_id", None)
    return slot_data

@api_router.put("/admin/schedule/{schedule_id}")
async def update_schedule_slot(schedule_id: str, slot: ScheduleSlot, user: dict = Depends(require_roles("admin"))):
    """Admin only - update schedule slot"""
    result = await db.schedule.update_one(
        {"schedule_id": schedule_id},
        {"$set": slot.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Schedule slot not found")
    return {"message": "Schedule updated"}

@api_router.delete("/admin/schedule/{schedule_id}")
async def delete_schedule_slot(schedule_id: str, user: dict = Depends(require_roles("admin"))):
    """Admin only - delete schedule slot"""
    result = await db.schedule.delete_one({"schedule_id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule slot not found")
    return {"message": "Schedule deleted"}

# ==================== JOB APPLICATION ENDPOINTS ====================
@api_router.post("/job-applications")
async def submit_job_application(app_data: JobApplication):
    """Public endpoint - submit job application"""
    app_id = f"app_{uuid.uuid4().hex[:12]}"
    application = {
        "application_id": app_id,
        **app_data.dict(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.job_applications.insert_one(application)
    application.pop("_id", None)
    return {"message": "Application submitted successfully", "application_id": app_id}

@api_router.get("/admin/job-applications")
async def get_job_applications(user: dict = Depends(require_roles("admin"))):
    """Admin only - get all job applications"""
    applications = await db.job_applications.find({}).sort("created_at", -1).to_list(length=None)
    for app in applications:
        app.pop("_id", None)
    return applications

@api_router.put("/admin/job-applications/{application_id}/status")
async def update_application_status(application_id: str, update: JobApplicationUpdate, user: dict = Depends(require_roles("admin"))):
    """Admin only - update application status"""
    result = await db.job_applications.update_one(
        {"application_id": application_id},
        {"$set": {"status": update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": f"Status updated to {update.status}"}

@api_router.delete("/admin/job-applications/{application_id}")
async def delete_job_application(application_id: str, user: dict = Depends(require_roles("admin"))):
    """Admin only - delete job application"""
    result = await db.job_applications.delete_one({"application_id": application_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"message": "Application deleted"}

@api_router.post("/admin/job-applications/{application_id}/send-email")
async def send_email_to_applicant(application_id: str, email_req: EmailRequest, user: dict = Depends(require_roles("admin"))):
    """Admin only - send email to applicant (mock for now - integrate with email service)"""
    app = await db.job_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    # For now, just log and return success
    logger.info(f"Email would be sent to {app.get('email')}: Subject={email_req.subject}")
    
    return {
        "message": "Email sent successfully (mock)",
        "recipient": app.get("email"),
        "subject": email_req.subject
    }

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(req: NewsletterSubscribeRequest):
    """Subscribe an email address to MailerLite."""
    api_key = os.environ.get("MAILERLITE_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="Newsletter is not configured")

    email = str(req.email).strip().lower()
    payload = {
        "email": email,
        "status": "active",
    }
    if req.name:
        payload["fields"] = {"name": req.name.strip()}

    group_id = os.environ.get("MAILERLITE_GROUP_ID", "").strip()
    if group_id:
        payload["groups"] = [group_id]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                "https://connect.mailerlite.com/api/subscribers",
                json=payload,
                headers=headers,
            )

            # Fallback for accounts still using classic MailerLite API keys.
            if response.status_code in (401, 403):
                classic_headers = {
                    "X-MailerLite-ApiKey": api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                classic_payload = {
                    "email": email,
                    "name": (req.name or "").strip(),
                    "resubscribe": True,
                    "autoresponders": True,
                    "type": "active",
                }
                response = await client.post(
                    "https://api.mailerlite.com/api/v2/subscribers",
                    json=classic_payload,
                    headers=classic_headers,
                )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Unable to reach newsletter provider")

    logger.info("MailerLite subscribe response status=%s email=%s", response.status_code, email)

    if response.status_code in (200, 201):
        return {"message": "Subscribed successfully"}

    # MailerLite can return 409 when subscriber already exists.
    if response.status_code == 409:
        return {"message": "Already subscribed"}

    error_message = "Failed to subscribe"
    try:
        error_data = response.json()
        if isinstance(error_data, dict):
            error_message = error_data.get("message") or error_data.get("detail") or error_message
            if isinstance(error_data.get("errors"), dict):
                first_error = next(iter(error_data["errors"].values()), None)
                if isinstance(first_error, list) and first_error:
                    error_message = str(first_error[0])
        logger.warning("MailerLite subscribe failed status=%s body=%s", response.status_code, error_data)
    except ValueError:
        logger.warning("MailerLite subscribe failed status=%s body=%s", response.status_code, response.text[:400])
    raise HTTPException(status_code=400, detail=error_message)

# Include router
app.include_router(api_router)

_cors = _cors_middleware_kwargs()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors["allow_origins"],
    allow_origin_regex=_cors["allow_origin_regex"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Length"],
    max_age=600,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=(), interest-cohort=()",
    )
    return response


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# ==================== SEED DATA ====================
@app.on_event("startup")
async def startup():
    jwt_secret = os.environ.get("JWT_SECRET", "")
    if len(jwt_secret) < 32:
        logger.warning("JWT_SECRET should be at least 32 characters for production security.")

    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.news.create_index("news_id", unique=True)
    await db.song_requests.create_index("request_id", unique=True)
    await db.shows.create_index("show_id", unique=True)
    
    # Seed admin (never overwrite an existing admin password from env — that was a privilege-escalation risk)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@thebeat515.com")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        if not admin_password:
            admin_password = secrets.token_urlsafe(18)
            logger.warning(
                "ADMIN_PASSWORD not set; generated one-time password for %s — change it immediately: %s",
                admin_email,
                admin_password,
            )
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Station Admin",
            "role": "admin",
            "roles": ["admin"],
            "bio": "The Beat 515 Station Administrator",
            "avatar_url": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Admin user seeded")

    # Backfill roles array for legacy users.
    async for legacy_user in db.users.find({"$or": [{"roles": {"$exists": False}}, {"roles": {"$size": 0}}]}, {"_id": 0, "user_id": 1, "role": 1}):
        primary_role, roles = normalize_roles(legacy_user.get("role"), [])
        await db.users.update_one(
            {"user_id": legacy_user["user_id"]},
            {"$set": {"role": primary_role, "roles": roles}}
        )

    # Backfill avatar data-url fallback for existing uploaded avatars.
    async for u in db.users.find(
        {
            "avatar_url": {"$exists": True, "$ne": ""},
            "$or": [{"avatar_data_url": {"$exists": False}}, {"avatar_data_url": ""}]
        },
        {"_id": 0, "user_id": 1, "avatar_url": 1}
    ):
        normalized_avatar = normalize_avatar_url(u.get("avatar_url"))
        if not normalized_avatar.startswith("/uploads/avatars/"):
            continue
        local_rel = normalized_avatar[len("/uploads/"):]
        local_path = _upload_root / local_rel
        if not local_path.exists() or not local_path.is_file():
            continue
        try:
            content = local_path.read_bytes()
            suffix = local_path.suffix.lower()
            content_type = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".gif": "image/gif",
            }.get(suffix, "image/jpeg")
            avatar_data_url = f"data:{content_type};base64,{base64.b64encode(content).decode('ascii')}"
            await db.users.update_one(
                {"user_id": u["user_id"]},
                {"$set": {"avatar_data_url": avatar_data_url}}
            )
        except Exception:
            continue
    
    # Optional demo DJ / editor with known passwords — enable for local dev only (SEED_DEMO_ACCOUNTS=1)
    seed_demo = os.environ.get("SEED_DEMO_ACCOUNTS", "0").strip().lower() in ("1", "true", "yes", "on")
    if seed_demo:
        dj_email = "dj@thebeat515.com"
        existing_dj = await db.users.find_one({"email": dj_email})
        if not existing_dj:
            dj_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": dj_id,
                "email": dj_email,
                "password_hash": hash_password("DJBeat515!"),
                "name": "DJ Pulse",
                "role": "dj",
                "roles": ["dj"],
                "bio": "Spinning the hottest tracks every weeknight! Your favorite Top 40 DJ.",
                "avatar_url": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.shows.insert_one({
                "show_id": f"show_{uuid.uuid4().hex[:12]}",
                "name": "The Evening Pulse",
                "description": "The hottest Top 40 hits to get your evening started right. Call in with your requests!",
                "dj_id": dj_id,
                "dj_name": "DJ Pulse",
                "schedule": "Mon-Fri 6PM-10PM",
                "image_url": "https://images.unsplash.com/photo-1765894103984-91ff695bbbaf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxyYWRpbyUyMERKJTIwaG9zdGluZ3xlbnwwfHx8fDE3NzYwNzA2MzB8MA&ixlib=rb-4.1.0&q=85",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            await db.shows.insert_one({
                "show_id": f"show_{uuid.uuid4().hex[:12]}",
                "name": "Weekend Warm-Up",
                "description": "Getting the weekend started with the biggest bangers. Non-stop hits from noon to 4!",
                "dj_id": dj_id,
                "dj_name": "DJ Pulse",
                "schedule": "Sat-Sun 12PM-4PM",
                "image_url": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info("DJ user and shows seeded")

        editor_email = "news@thebeat515.com"
        existing_editor = await db.users.find_one({"email": editor_email})
        if not existing_editor:
            await db.users.insert_one({
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": editor_email,
                "password_hash": hash_password("News515!"),
                "name": "Sarah Chen",
                "role": "editor",
                "roles": ["editor"],
                "bio": "Music journalist and entertainment news editor at The Beat 515.",
                "avatar_url": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info("Editor user seeded")

    # Seed sample news
    news_count = await db.news.count_documents({})
    if news_count == 0:
        sample_news = [
            {
                "news_id": f"news_{uuid.uuid4().hex[:12]}",
                "title": "Summer Music Festival Returns to Downtown",
                "content": "The annual Summer Sounds Festival is back and bigger than ever! This year's lineup features headliners from across the country, with local acts opening each day. The three-day event will transform the downtown area into a music lover's paradise with multiple stages, food vendors, and interactive art installations. Tickets go on sale next Friday at 10 AM.",
                "summary": "The annual Summer Sounds Festival returns with a star-studded lineup and three days of non-stop music.",
                "image_url": "https://images.unsplash.com/photo-1773385404894-104116c1ef31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwY3Jvd2QlMjBuZW9ufGVufDB8fHx8MTc3NjA3MDY0M3ww&ixlib=rb-4.1.0&q=85",
                "category": "events",
                "author_id": "system",
                "author_name": "The Beat 515 News",
                "published": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "news_id": f"news_{uuid.uuid4().hex[:12]}",
                "title": "Top 10 Hits This Week on The Beat 515",
                "content": "Check out this week's hottest tracks dominating the airwaves! From chart-topping pop anthems to viral hits, here's what's been lighting up the request line. Number one for the third consecutive week is the summer anthem everyone can't stop singing. Our DJs have been spinning these non-stop, and listeners are loving every beat.",
                "summary": "This week's hottest tracks and chart-toppers on The Beat 515 playlist.",
                "image_url": "https://images.unsplash.com/photo-1724185773486-0b39642e607e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMG5lb24lMjBzb3VuZHdhdmV8ZW58MHx8fHwxNzc2MDcwNjQzfDA&ixlib=rb-4.1.0&q=85",
                "category": "music",
                "author_id": "system",
                "author_name": "The Beat 515 News",
                "published": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
            },
            {
                "news_id": f"news_{uuid.uuid4().hex[:12]}",
                "title": "Local Artist Spotlight: Rising Stars from the 515",
                "content": "The Beat 515 is proud to showcase local talent from the Des Moines metro area. This month we're featuring three up-and-coming artists who are making waves in the local music scene. From indie pop to hip-hop, these artists represent the best of what our community has to offer. Tune in every Sunday at 8 PM for our Local Spotlight hour.",
                "summary": "Highlighting local artists making waves in the 515 music scene.",
                "image_url": "https://static.prod-images.emergentagent.com/jobs/b1349ab8-20f7-48b5-b900-fc668397ebb1/images/8d660514dfc2116f64218cda821c96160d24b08bbcff48a69d80d36dbaa8b6ce.png",
                "category": "local",
                "author_id": "system",
                "author_name": "The Beat 515 News",
                "published": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
            },
            {
                "news_id": f"news_{uuid.uuid4().hex[:12]}",
                "title": "Contest Alert: Win Backstage Passes!",
                "content": "The Beat 515 is giving away VIP backstage passes to the biggest concert of the year! Listen for the cue-to-call and be caller number 5 to win. You and a friend will get to meet the artists, enjoy premium viewing areas, and take home exclusive merchandise. Contest runs all week during the morning show. Good luck!",
                "summary": "Win VIP backstage passes by listening for the cue-to-call this week!",
                "image_url": "",
                "category": "contests",
                "author_id": "system",
                "author_name": "The Beat 515 News",
                "published": True,
                "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
                "updated_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
            }
        ]
        await db.news.insert_many(sample_news)
        logger.info("Sample news seeded")
    
    # Seed now playing
    np = await db.now_playing.find_one({"active": True})
    if not np:
        await db.now_playing.insert_one({
            "song_title": "Blinding Lights",
            "artist": "The Weeknd",
            "album": "After Hours",
            "dj_name": "AutoDJ",
            "active": True,
            "started_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Seed stream config
    sc = await db.stream_config.find_one({"active": True})
    if not sc:
        await db.stream_config.insert_one({
            "stream_url": "https://das-edge62-live365-dal03.cdnstream.com/a55796",
            "station_name": "The Beat 515",
            "tagline": "Proud. Loud. Local.",
            "active": True
        })
    else:
        # Update stream URL to new CDN URL
        current_url = sc.get("stream_url", "")
        if "a72818" in current_url or "live365.com/a72818" in current_url:
            await db.stream_config.update_one(
                {"active": True},
                {"$set": {"stream_url": "https://das-edge62-live365-dal03.cdnstream.com/a55796"}}
            )
    
    # Seed rewards catalog
    reward_count = await db.rewards.count_documents({})
    if reward_count == 0:
        sample_rewards = [
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "Shoutout on Air", "description": "Get a personal shoutout from the DJ during their next show!", "points_cost": 100, "icon": "megaphone", "category": "experience", "active": True},
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "Priority Request", "description": "Your next song request jumps to the front of the queue!", "points_cost": 50, "icon": "flash", "category": "perk", "active": True},
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "Beat 515 Sticker Pack", "description": "Exclusive digital sticker pack with The Beat 515 designs.", "points_cost": 75, "icon": "star", "category": "merch", "active": True},
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "VIP Listener Badge", "description": "Unlock the golden VIP badge on your profile for 30 days.", "points_cost": 200, "icon": "shield-checkmark", "category": "status", "active": True},
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "Concert Ticket Entry", "description": "Enter to win concert tickets! One entry per redemption.", "points_cost": 150, "icon": "ticket", "category": "contest", "active": True},
            {"reward_id": f"rwd_{uuid.uuid4().hex[:12]}", "name": "DJ Meet & Greet", "description": "Score a virtual meet & greet with your favorite Beat 515 DJ!", "points_cost": 500, "icon": "people", "category": "experience", "active": True},
        ]
        await db.rewards.insert_many(sample_rewards)
        logger.info("Rewards catalog seeded")
    
    # Seed events
    event_count = await db.events.count_documents({})
    if event_count == 0:
        sample_events = [
            {"event_id": f"evt_{uuid.uuid4().hex[:12]}", "title": "Summer Sounds Festival 2026", "description": "Three days of non-stop music featuring headliners from across the country. Multiple stages, food vendors, and art installations.", "venue": "Downtown Amphitheater", "date": "2026-07-18", "time": "12:00 PM - 11:00 PM", "image_url": "https://images.unsplash.com/photo-1773385404894-104116c1ef31?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwY3Jvd2QlMjBuZW9ufGVufDB8fHx8MTc3NjA3MDY0M3ww&ixlib=rb-4.1.0&q=85", "ticket_url": "#", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"event_id": f"evt_{uuid.uuid4().hex[:12]}", "title": "Beat 515 Block Party", "description": "Free community event with live DJs, local food trucks, and family activities. The Beat 515 live broadcast all day!", "venue": "East Village District", "date": "2026-06-14", "time": "2:00 PM - 9:00 PM", "image_url": "", "ticket_url": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"event_id": f"evt_{uuid.uuid4().hex[:12]}", "title": "Neon Nights Club Tour", "description": "DJ Pulse takes The Beat 515 on tour across the city's best venues. VIP tables available.", "venue": "Various Locations", "date": "2026-05-23", "time": "9:00 PM - 2:00 AM", "image_url": "https://images.unsplash.com/photo-1724185773486-0b39642e607e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMG5lb24lMjBzb3VuZHdhdmV8ZW58MHx8fHwxNzc2MDcwNjQzfDA&ixlib=rb-4.1.0&q=85", "ticket_url": "#", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.events.insert_many(sample_events)
        logger.info("Events seeded")

    # Seed contests
    contest_count = await db.contests.count_documents({})
    if contest_count == 0:
        sample_contests = [
            {"contest_id": f"cst_{uuid.uuid4().hex[:12]}", "title": "Win Backstage Passes!", "description": "Listen for the cue-to-call during the morning show and be caller #5 to win VIP backstage passes to the biggest concert of the year!", "prize": "2x VIP Backstage Passes", "end_date": "2026-05-30", "how_to_enter": "Listen for the cue-to-call and dial in!", "image_url": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"contest_id": f"cst_{uuid.uuid4().hex[:12]}", "title": "Summer Playlist Challenge", "description": "Create and share your ultimate summer playlist. The best playlist wins a year of premium streaming and Beat 515 merch!", "prize": "Premium Streaming + Merch Bundle", "end_date": "2026-06-15", "how_to_enter": "Submit your playlist via the app request line", "image_url": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"contest_id": f"cst_{uuid.uuid4().hex[:12]}", "title": "Beat 515 Trivia Night", "description": "Test your music knowledge every Friday at 7 PM. Top scorer each week wins a $50 gift card!", "prize": "$50 Gift Card (Weekly)", "end_date": "2026-12-31", "how_to_enter": "Tune in Fridays at 7 PM and play along", "image_url": "", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.contests.insert_many(sample_contests)
        logger.info("Contests seeded")

    # Seed podcasts / replays
    pod_count = await db.podcasts.count_documents({})
    if pod_count == 0:
        sample_pods = [
            {"podcast_id": f"pod_{uuid.uuid4().hex[:12]}", "title": "The Evening Pulse - Friday Rewind", "description": "Catch up on Friday's biggest moments from The Evening Pulse with DJ Pulse.", "show_name": "The Evening Pulse", "dj_name": "DJ Pulse", "duration": "2h 15m", "audio_url": "#", "image_url": "https://images.unsplash.com/photo-1765894103984-91ff695bbbaf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxyYWRpbyUyMERKJTIwaG9zdGluZ3xlbnwwfHx8fDE3NzYwNzA2MzB8MA&ixlib=rb-4.1.0&q=85", "created_at": datetime.now(timezone.utc).isoformat()},
            {"podcast_id": f"pod_{uuid.uuid4().hex[:12]}", "title": "Weekend Warm-Up Mixtape #42", "description": "The latest weekend mixtape with the hottest tracks curated by DJ Pulse.", "show_name": "Weekend Warm-Up", "dj_name": "DJ Pulse", "duration": "1h 30m", "audio_url": "#", "image_url": "", "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
            {"podcast_id": f"pod_{uuid.uuid4().hex[:12]}", "title": "Local Spotlight: May Edition", "description": "Featuring interviews and tracks from three incredible local artists in the 515.", "show_name": "Local Spotlight", "dj_name": "The Beat 515", "duration": "58m", "audio_url": "#", "image_url": "https://static.prod-images.emergentagent.com/jobs/b1349ab8-20f7-48b5-b900-fc668397ebb1/images/8d660514dfc2116f64218cda821c96160d24b08bbcff48a69d80d36dbaa8b6ce.png", "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()},
            {"podcast_id": f"pod_{uuid.uuid4().hex[:12]}", "title": "Morning Beat Highlights", "description": "The best moments, interviews, and laughs from this week's morning show.", "show_name": "The Morning Beat", "dj_name": "The Beat 515", "duration": "45m", "audio_url": "#", "image_url": "", "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()},
        ]
        await db.podcasts.insert_many(sample_pods)
        logger.info("Podcasts seeded")
    
    logger.info("The Beat 515 backend started successfully!")
    
    # Start background task for metadata polling
    asyncio.create_task(metadata_polling_loop())

async def metadata_polling_loop():
    """Background loop to poll Live365 metadata every 2 minutes."""
    logger.info("Starting metadata polling loop (every 2 minutes)")
    while True:
        try:
            await asyncio.sleep(120)  # 2 minutes
            await update_now_playing_from_stream()
        except Exception as e:
            logger.error(f"Error in metadata polling loop: {e}")
            await asyncio.sleep(120)  # Continue after error

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
