from bson import ObjectId
from datetime import datetime
from flask import Response
import json
import pandas as pd

from crud import add_song_to_playlist, create_artist, create_song, get_artist_by_name, get_song_by_id
from db import db


def oid(x):
    return x if isinstance(x, ObjectId) else ObjectId(str(x))


class MongoJSON(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)


def json_response(payload, status=200):
    return Response(json.dumps(payload, cls=MongoJSON), status=status, mimetype="application/json")


def artist_data(name):
    artist = get_artist_by_name(db, name)
    if artist == None:
        artist_id = create_artist(db, name)
    else:
        artist_id = artist["_id"]

    return artist_id


def create_song_data():
    df = pd.read_csv('songs.csv')
    for _, row in df.iterrows():
        artist_id = artist_data(row["artist"])
        song_id = create_song(db, row["id"], row["title"], artist_id, row["album"],
                              row["duration"], row["release_year"], row["cover"], row["audio_url"])

        print(song_id)


def create_playlist():
    df = pd.read_csv('songs.csv')

    if len(df) <= 50:
        print(f"Only {len(df)} songs available, returning all.")
        sample_df = df
    else:
        sample_df = df.sample(n=50, random_state=42)

    for i in sample_df.iterrows():
        print(i[1]['id'])
        song_id = get_song_by_id(db, i[1]['id'])['_id']
        add_song_to_playlist(db, "690a13658d3d5fd808498add", song_id)

    return sample_df


# create_song_data()
# create_playlist()
