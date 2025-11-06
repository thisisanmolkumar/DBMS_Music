import mimetypes
from pathlib import Path
from typing import Tuple, Optional
from flask import Flask, request, Response, jsonify, abort
from flask_cors import CORS

# === Settings ===
MUSIC_DIR = Path("songs").resolve()  # folder with your mp3 files
HOST = "0.0.0.0"
PORT = 8000

app = Flask(__name__)
CORS(app)  # allow requests from your React dev server (localhost:3000)


def _safe_path(filename: str) -> Path:
    """
    Prevent directory traversal and ensure file is inside MUSIC_DIR.
    """
    candidate = (MUSIC_DIR / filename).resolve()
    if not str(candidate).startswith(str(MUSIC_DIR)):
        abort(404)
    return candidate


def _parse_range(range_header: str, file_size: int) -> Optional[Tuple[int, int]]:
    """
    Parse a Range header like 'bytes=START-END' and return (start, end) inclusive.
    Returns None if header is invalid.
    """
    try:
        units, _, rng = range_header.partition("=")
        if units.strip() != "bytes":
            return None
        start_str, _, end_str = rng.partition("-")
        if not start_str and not end_str:
            return None

        if start_str:
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        else:
            # suffix range: bytes=-N (last N bytes)
            suffix = int(end_str)
            start = max(file_size - suffix, 0)
            end = file_size - 1

        if start < 0 or end < start or end >= file_size:
            return None
        return start, end
    except Exception:
        return None


def _iter_file(path: Path, start: int, end: int, chunk_size: int = 1024 * 1024):
    """
    Generator that yields bytes from start..end inclusive.
    """
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = f.read(min(chunk_size, remaining))
            if not chunk:
                break
            yield chunk
            remaining -= len(chunk)


@app.route("/tracks", methods=["GET"])
def list_tracks():
    """
    Returns JSON listing of files in MUSIC_DIR with stream URLs.
    """
    MUSIC_DIR.mkdir(parents=True, exist_ok=True)
    files = []
    for p in MUSIC_DIR.glob("**/*"):
        if p.is_file():
            mime, _ = mimetypes.guess_type(p.name)
            if (mime or "").startswith("audio") or p.suffix.lower() == ".mp3":
                rel = p.relative_to(MUSIC_DIR).as_posix()
                files.append({
                    "filename": rel,
                    "size": p.stat().st_size,
                    "mime": mime or "audio/mpeg",
                    "url": f"/stream/{rel}",
                })
    # Sort by name for convenience
    files.sort(key=lambda x: x["filename"].lower())
    return jsonify(files)


@app.route("/stream/<path:filename>", methods=["GET", "HEAD"])
def stream_file(filename: str):
    """
    Streams file with Range support (206 Partial Content).
    """
    print(filename)
    path = _safe_path(filename)
    if not path.exists() or not path.is_file():
        abort(404)

    file_size = path.stat().st_size
    mime, _ = mimetypes.guess_type(str(path))
    content_type = mime or "audio/mpeg"  # default for mp3

    range_header = request.headers.get("Range", None)
    if not range_header:
        # No range: send the whole file
        headers = {
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Type": content_type,
        }
        if request.method == "HEAD":
            return Response(status=200, headers=headers)
        return Response(_iter_file(path, 0, file_size - 1), status=200, headers=headers)

    # With Range
    byte_range = _parse_range(range_header, file_size)
    if byte_range is None:
        # Invalid range
        return Response(status=416, headers={
            "Content-Range": f"bytes */{file_size}",
            "Accept-Ranges": "bytes",
        })

    start, end = byte_range
    content_length = end - start + 1
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": content_type,
    }
    if request.method == "HEAD":
        return Response(status=206, headers=headers)
    return Response(_iter_file(path, start, end), status=206, headers=headers)


@app.route("/")
def index():
    return jsonify({
        "message": "Local audio server running",
        "list": "/tracks",
        "stream_pattern": "/stream/<filename>"
    })


if __name__ == "__main__":
    print(f"Serving {MUSIC_DIR} on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, threaded=True)
