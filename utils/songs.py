import yt_dlp
from typing import Dict, Any, List, Optional
import time
import pandas as pd
import os
from tqdm import tqdm


def get_playlist_entries(list_url: str) -> List[str]:
    """
    Return video IDs from a YouTube (www) playlist URL.
    """
    ydl_opts = {
        "skip_download": True,
        "extract_flat": True,    # fast listing
        "quiet": True,
        "noplaylist": False,
    }
    ids: List[str] = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(list_url, download=False)
        for e in info.get("entries") or []:
            vid = (e or {}).get("id")
            if vid:
                ids.append(vid)
    return ids


def get_music_metadata(video_id: str) -> Optional[Dict[str, Any]]:
    """
    Query the Music endpoint for a single video ID to expose artist/track/album.
    """
    url = f"https://music.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "skip_download": True,
        "extract_flat": False,   # resolve full metadata
        "quiet": True,
        "extractor_args": {
            "youtube": {
                # Prefer Music client; fall back if needed
                "player_client": ["android_music", "android"]
            }
        },
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            e = ydl.extract_info(url, download=False)
        except Exception:
            return None

    # Build a neat record with fallbacks
    if not e:
        return None
    thumbs = e.get("thumbnails") or []
    largest_thumb = thumbs[-1]["url"] if thumbs else None
    return {
        "id": e.get("id"),
        "audio_url": e.get("webpage_url") or url,
        "title": e.get("track") or e.get("title"),
        "artist": (
            e.get("artist")
            or (", ".join(a.get("name") for a in (e.get("artists") or []) if a.get("name")))
            or e.get("uploader") or e.get("channel")
        ),
        "album": e.get("album"),
        "duration": e.get("duration"),
        "release_year": e.get("release_year"),
        "cover": largest_thumb,
    }


def get_music_playlist_with_metadata(playlist_url: str) -> List[Dict[str, Any]]:
    """
    Full flow: list on www, then fetch per-ID via music.youtube.com to get artist/album/track.
    """
    # If user pasted a music.youtube URL, yt-dlp will redirect it anyway.
    # Use the same URL; we only care about the list=... ID.
    ids = get_playlist_entries(playlist_url)
    results: List[Dict[str, Any]] = []
    for i, vid in enumerate(ids, 1):
        meta = get_music_metadata(vid)
        if meta:
            results.append(meta)
        # Gentle delay helps avoid throttling
        time.sleep(0.2)
    return results


def download_mp3(ids: List[str], youtube_links: List[str], output_folder: str = "songs"):
    os.makedirs(output_folder, exist_ok=True)
    downloaded = []

    for i, link in enumerate(tqdm(youtube_links)):
        filename = f"{ids[i]}.%(ext)s"

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_folder, filename),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': False,           # Set True for silent mode
            'ignoreerrors': True,     # Skip broken links
            'noplaylist': True,       # Treat each URL individually
            'nocheckcertificate': True
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                # print(f"\n🎵 Downloading: {link}")
                ydl.download([link])
                downloaded.append(ids[i])
            except Exception as e:
                print(f"Failed to download {link}: {e}")

    print("\nAll downloads completed!")
    return downloaded


if __name__ == "__main__":
    PLAYLISTS = [
        "https://music.youtube.com/playlist?list=PL9V8DOn-UZiiZD9R4zh8VjQNXlsMBZNLi&si=xA4ub1Tij7qnUPCr",
        "https://youtube.com/playlist?list=PLdbrGbj-qjDYAP7vAe7lMCXU0nSUp_VHX&si=mpcwniT9ZlHbYOoz",
        "https://music.youtube.com/playlist?list=PL9V8DOn-UZig4s9YNTfntxPyXPTMxo3Tn&si=0pohbTeXZpRRXwov",
    ]

    # 1) Gather metadata from all playlists
    all_tracks: List[Dict[str, Any]] = []
    for pl in PLAYLISTS:
        tracks = get_music_playlist_with_metadata(pl)
        if tracks:
            all_tracks.extend(tracks)

    if not all_tracks:
        print("No tracks found in the provided playlists.")
        raise SystemExit(0)

    # 2) Deduplicate by video id while keeping the first occurrence's metadata
    unique_by_id: Dict[str, Dict[str, Any]] = {}
    for t in all_tracks:
        vid = t.get("id")
        if vid and vid not in unique_by_id:
            unique_by_id[vid] = t

    df = pd.DataFrame(list(unique_by_id.values()))

    # 3) Download all songs in one pass
    ids: List[str] = list(df['id'])
    links: List[str] = list(df['audio_url'])
    downloaded_ids = download_mp3(ids, links, output_folder="songs")

    # 4) Keep only successfully-downloaded songs for CSV
    mask = df['id'].isin(downloaded_ids)
    subset = df.loc[mask, ['id', 'audio_url', 'title',
                           'artist', 'album', 'duration', 'release_year', 'cover']]

    # Optional: sort for stable output
    subset = subset.sort_values(
        by=['artist', 'album', 'title'], na_position='last').reset_index(drop=True)

    # 5) Save
    subset.to_csv('songs.csv', index=False)

    print(f"Total unique tracks found: {len(df)}")
    print(f"Successfully downloaded: {len(downloaded_ids)}")
    print(f"Saved metadata for {len(subset)} downloaded songs to songs.csv")
