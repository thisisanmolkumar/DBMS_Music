from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, ReturnDocument, IndexModel
import bcrypt


def oid(x) -> ObjectId:
    if x is None:
        return None
    return x if isinstance(x, ObjectId) else ObjectId(str(x))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_pw(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def check_pw(password: str, hashed: bytes) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed)
    except Exception:
        return False


def ensure_indexes(db):
    db.users.create_indexes([
        IndexModel([("username", ASCENDING)],
                   unique=True, name="uniq_username"),
        IndexModel([("email", ASCENDING)], unique=True, name="uniq_email"),
        IndexModel([("created_at", DESCENDING)], name="created_at_desc"),
    ])

    db.songs.create_indexes([
        IndexModel([("title", ASCENDING), ("artist_id", ASCENDING),
                   ("album", ASCENDING)], name="idx_song_title_artist_album"),
        IndexModel([("artist_id", ASCENDING)], name="idx_song_artist"),
        IndexModel([("album", ASCENDING)], name="idx_song_album"),
        IndexModel([("genre", ASCENDING)], name="idx_song_genre"),
    ])

    db.playlists.create_indexes([
        IndexModel([("name", ASCENDING), ("user_id", ASCENDING)],
                   name="idx_playlist_name_user"),
        IndexModel([("user_id", ASCENDING)], name="idx_playlist_user"),
        IndexModel([("created_at", DESCENDING)], name="idx_playlist_created"),
    ])

    db.playlist_songs.create_indexes([
        IndexModel([("playlist_id", ASCENDING), ("song_id", ASCENDING)],
                   unique=True, name="uniq_playlist_song"),
        IndexModel([("playlist_id", ASCENDING)], name="idx_ps_playlist"),
        IndexModel([("song_id", ASCENDING)], name="idx_ps_song"),
    ])

    db.admins.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True,
                   name="uniq_admin_email"),
    ])

# ---------------------------
# Users
# ---------------------------


def create_user(db, username: str, email: str, password: str) -> ObjectId:
    doc = {
        "username": username,
        "email": email,
        "password_hash": hash_pw(password),  # store hash
        "created_at": now_utc(),
    }
    res = db.users.insert_one(doc)
    return res.inserted_id


def get_user_by_id(db, user_id) -> Optional[Dict]:
    return db.users.find_one({"_id": oid(user_id)})


def get_user_by_email(db, email: str) -> Optional[Dict]:
    return db.users.find_one({"email": email})


def list_users(db, limit: int = 50, skip: int = 0) -> List[Dict]:
    return list(db.users.find({}, {"password_hash": 0}).skip(skip).limit(limit).sort("created_at", DESCENDING))


def update_user(db, user_id, patch: Dict[str, Any]) -> Optional[Dict]:
    if "password" in patch:
        patch["password_hash"] = hash_pw(patch.pop("password"))
    return db.users.find_one_and_update(
        {"_id": oid(user_id)},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )


def delete_user(db, user_id) -> bool:
    return db.users.delete_one({"_id": oid(user_id)}).deleted_count == 1

# ---------------------------
# Artists
# ---------------------------


def create_artist(db, name: str) -> ObjectId:
    res = db.artists.insert_one({"name": name})
    return res.inserted_id


def get_artist(db, artist_id) -> Optional[Dict]:
    return db.artists.find_one({"_id": oid(artist_id)})


def get_artist_by_name(db, artist_name) -> Optional[Dict]:
    return db.artists.find_one({"name": artist_name})


def list_artists(db, q: Optional[str] = None, limit: int = 50, skip: int = 0) -> List[Dict]:
    filt = {}
    if q:
        filt["name"] = {"$regex": q, "$options": "i"}
    return list(db.artists.find(filt).skip(skip).limit(limit).sort("name", ASCENDING))


def update_artist(db, artist_id, patch: Dict[str, Any]) -> Optional[Dict]:
    return db.artists.find_one_and_update(
        {"_id": oid(artist_id)},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )


def delete_artist(db, artist_id) -> bool:
    # Consider cascade cleanup (albums/songs) at app layer if needed
    return db.artists.delete_one({"_id": oid(artist_id)}).deleted_count == 1

# ---------------------------
# Songs
# ---------------------------


def create_song(db, song_id: str, title: str, artist_id=None, album=None, duration_sec: Optional[int] = None, release_year: Optional[str] = None, cover: Optional[str] = None, audio_url: Optional[str] = None) -> ObjectId:
    doc = {
        "song_id": song_id,
        "title": title,
        "artist_id": oid(artist_id) if artist_id else None,
        "album": album,
        "duration_sec": duration_sec,
        "release_year": release_year,
        "audio_url": audio_url,
        "cover": cover,
        "created_at": now_utc(),
    }
    return db.songs.insert_one(doc).inserted_id


def get_song(db, song_id) -> Optional[Dict]:
    return db.songs.find_one({"_id": oid(song_id)})


def get_song_by_id(db, song_id) -> Optional[Dict]:
    return db.songs.find_one({"song_id": song_id})


def list_songs(db, q: Optional[str] = None, artist_id=None, album=None, genre=None,
               limit: int = 50, skip: int = 0) -> List[Dict]:
    filt = {}
    if q:
        filt["title"] = {"$regex": q, "$options": "i"}
    if artist_id:
        filt["artist_id"] = oid(artist_id)
    if album:
        filt["album"] = oid(album)
    if genre:
        filt["genre"] = genre
    return list(db.songs.find(filt).skip(skip).limit(limit).sort("created_at", DESCENDING))


def update_song(db, song_id, patch: Dict[str, Any]) -> Optional[Dict]:
    if "artist_id" in patch and patch["artist_id"]:
        patch["artist_id"] = oid(patch["artist_id"])
    if "album" in patch and patch["album"]:
        patch["album"] = oid(patch["album"])
    return db.songs.find_one_and_update(
        {"_id": oid(song_id)},
        {"$set": patch},
        return_document=ReturnDocument.AFTER,
    )


def delete_song(db, song_id) -> bool:
    return db.songs.delete_one({"_id": oid(song_id)}).deleted_count == 1

# ---------------------------
# Playlists
# ---------------------------


def create_playlist(db, name: str, user_id) -> ObjectId:
    doc = {"name": name, "user_id": oid(user_id), "created_at": now_utc()}
    return db.playlists.insert_one(doc).inserted_id


def get_playlist(db, playlist_id) -> Optional[Dict]:
    return db.playlists.find_one({"_id": oid(playlist_id)})


def list_playlists(db, user_id=None, limit: int = 50, skip: int = 0) -> List[Dict]:
    filt = {"user_id": oid(user_id)} if user_id else {}
    return list(db.playlists.find(filt).skip(skip).limit(limit).sort("created_at", DESCENDING))


def rename_playlist(db, playlist_id, name: str) -> Optional[Dict]:
    return db.playlists.find_one_and_update(
        {"_id": oid(playlist_id)},
        {"$set": {"name": name}},
        return_document=ReturnDocument.AFTER,
    )


def delete_playlist(db, playlist_id) -> bool:
    ok = db.playlists.delete_one({"_id": oid(playlist_id)}).deleted_count == 1
    db.playlist_songs.delete_many({"playlist_id": oid(playlist_id)})
    return ok

# --- Playlist <-> Songs (join collection) ---


def add_song_to_playlist(db, playlist_id, song_id) -> bool:
    try:
        db.playlist_songs.insert_one(
            {"playlist_id": oid(playlist_id), "song_id": oid(song_id)})
        return True
    except Exception:
        # duplicate or constraint violation
        return False


def remove_song_from_playlist(db, playlist_id, song_id) -> bool:
    return db.playlist_songs.delete_one({"playlist_id": oid(playlist_id), "song_id": oid(song_id)}).deleted_count == 1


def get_playlist_with_songs(db, playlist_id) -> Dict[str, Any]:
    pipeline = [
        {"$match": {"_id": oid(playlist_id)}},
        {"$lookup": {
            "from": "playlist_songs",
            "localField": "_id",
            "foreignField": "playlist_id",
            "as": "links"
        }},
        {"$lookup": {
            "from": "songs",
            "let": {"song_ids": "$links.song_id"},
            "pipeline": [
                {"$match": {
                    "$expr": {"$in": ["$_id", {"$ifNull": ["$$song_ids", []]}]}}}
            ],
            "as": "songs"
        }},
        {"$project": {"links": 0}}
    ]
    result = list(db.playlists.aggregate(pipeline))
    return result[0] if result else {}

# ---------------------------
# Admins
# ---------------------------


def create_admin(db, email: str, password: str) -> ObjectId:
    return db.admins.insert_one({
        "email": email,
        "password_hash": hash_pw(password),
        "created_at": now_utc(),
    }).inserted_id


def auth_admin(db, email: str, password: str) -> Optional[Dict]:
    admin = db.admins.find_one({"email": email})
    if admin and check_pw(password, admin.get("password_hash", b"")):
        admin.pop("password_hash", None)
        return admin
    return None


def delete_admin(db, admin_id) -> bool:
    return db.admins.delete_one({"_id": oid(admin_id)}).deleted_count == 1
