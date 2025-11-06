from flask import Flask, request, abort
from flask_cors import CORS
from pymongo import ASCENDING, DESCENDING
import bcrypt

from db import db
from util import json_response, oid

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.post("/api/users")
def create_user():
    body = request.json or {}
    username = (body.get("username") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not (username and email and password):
        return json_response({"error": "username, email, password required"}, 400)
    if db.users.find_one({"$or": [{"username": username}, {"email": email}]}):
        return json_response({"error": "username or email already exists"}, 409)

    pwd_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    doc = {"username": username, "email": email, "password_hash": pwd_hash}
    res = db.users.insert_one(doc)
    user = db.users.find_one({"_id": res.inserted_id}, {"password_hash": 0})

    return json_response(user, 201)


@app.post("/api/login")
def login():
    body = request.json or {}
    email = (body.get("email") or "").lower()
    password = body.get("password") or ""
    u = db.users.find_one({"email": email})

    if not u or not bcrypt.checkpw(password.encode(), u["password_hash"]):
        return json_response({"error": "invalid credentials"}, 401)

    u.pop("password_hash", None)
    return json_response({"user": u})


@app.post("/api/artists")
def create_artist():
    name = (request.json or {}).get("name")
    if not name:
        return json_response({"error": "name required"}, 400)
    res = db.artists.insert_one({"name": name})
    return json_response(db.artists.find_one({"_id": res.inserted_id}), 201)


@app.get("/api/artists")
def list_artists():
    q = request.args.get("q")
    filt = {"name": {"$regex": q, "$options": "i"}} if q else {}
    items = list(db.artists.find(filt).sort("name", ASCENDING))
    return json_response(items)


@app.get("/api/songs")
def list_songs():
    q = request.args.get("q", "").strip()
    song_id = request.args.get("song_id")
    artist_id = request.args.get("artist_id")
    page = int(request.args.get("page", 1))
    size = min(int(request.args.get("size", 25)), 100)

    filt = {}
    if q:
        filt["title"] = {"$regex": q, "$options": "i"}
    if song_id:
        filt["song_id"] = song_id
    if artist_id:
        filt["artist_id"] = oid(artist_id)

    cursor = (
        db.songs.find(filt)
        .sort("created_at", DESCENDING)
        .skip((page - 1) * size)
        .limit(size)
    )
    items = list(cursor)
    total = db.songs.count_documents(filt)
    return json_response({"items": items, "page": page, "size": size, "total": total})


@app.get("/api/songs/latest")
def list_latest_songs():
    page = int(request.args.get("page", 1))
    size = min(int(request.args.get("size", 25)), 100)
    if page < 1:
        page = 1
    if size < 1:
        size = 1

    skip = (page - 1) * size
    cursor = (
        db.songs.find({})
        .sort("created_at", DESCENDING)
        .skip(skip)
        .limit(size)
    )
    items = list(cursor)
    total = db.songs.count_documents({})
    return json_response({"items": items, "page": page, "size": size, "total": total})


@app.get("/api/users/<uid>/playlists")
def get_user_playlists(uid):
    if not uid:
        return json_response({"error": "user_id required"}, 400)
    items = list(db.playlists.find(
        {"user_id": oid(uid)}).sort("created_at", DESCENDING))
    for i in items:
        links = list(db.playlist_songs.find({"playlist_id": i["_id"]}))
        song_ids = [l["song_id"] for l in links]
        songs = list(db.songs.find({"_id": {"$in": song_ids}}))
        i["songs"] = songs

    return json_response(items)


@app.post("/api/playlists")
def create_playlist():
    body = request.json or {}
    name = (body.get("name") or "").strip()
    user_id = body.get("user_id")
    if not (name and user_id):
        return json_response({"error": "name and user_id required"}, 400)
    res = db.playlists.insert_one({"name": name, "user_id": oid(user_id)})
    return json_response(db.playlists.find_one({"_id": res.inserted_id}), 201)


@app.get("/api/songs_playlists/<uid>")
def get_songs_playlist(uid):
    pl = db.playlists.find_one({"name": "songs", "user_id": oid(uid)})
    if not pl:
        abort(404)
    links = list(db.playlist_songs.find({"playlist_id": pl["_id"]}))
    song_ids = [l["song_id"] for l in links]
    songs = list(db.songs.find({"_id": {"$in": song_ids}}))
    pl["songs"] = songs
    return json_response(pl)


@app.get("/api/playlists/<pid>")
def get_playlist(pid):
    pl = db.playlists.find_one({"_id": oid(pid)})
    if not pl:
        abort(404)
    links = list(db.playlist_songs.find({"playlist_id": pl["_id"]}))
    song_ids = [l["song_id"] for l in links]
    songs = list(db.songs.find({"_id": {"$in": song_ids}}))
    pl["songs"] = songs
    return json_response(pl)


@app.post("/api/playlists/<pid>/songs")
def add_song_to_playlist(pid):
    body = request.json or {}
    song_id = body.get("song_id")
    if not song_id:
        return json_response({"error": "song_id required"}, 400)
    db.playlist_songs.update_one(
        {"playlist_id": oid(pid), "song_id": oid(song_id)},
        {"$set": {"playlist_id": oid(pid), "song_id": oid(song_id)}},
        upsert=True
    )
    return json_response({"ok": True})


@app.delete("/api/playlists/<pid>/songs/<sid>")
def remove_song_from_playlist(pid, sid):
    db.playlist_songs.delete_one(
        {"playlist_id": oid(pid), "song_id": oid(sid)})
    return json_response({"ok": True})


@app.get("/api/health")
def health():
    return json_response({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
