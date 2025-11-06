import os
import yt_dlp
from tqdm import tqdm
import pandas as pd


def get_metadata(song_id):
    url = f"https://music.youtube.com/watch?v={song_id}"
    ydl_opts = {
        "skip_download": True,
        "extract_flat": False,
        "quiet": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android_music", "android"]
            }
        },
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            e = ydl.extract_info(url, download=False)
        except Exception:
            return None

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


if __name__ == '__main__':
    songs = []
    for i in tqdm(os.listdir('./songs')):
        songs.append(get_metadata(i[:-4]))

    df = pd.DataFrame(songs)
    df.to_csv('songs.csv', index=False)
