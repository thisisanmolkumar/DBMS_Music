import { useEffect, useMemo, useState } from "react";
import styles from "./Songs.module.css";
import type { Track as AudioTrack } from "../Audio/AudioDialog";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

type PlaylistSong = {
    _id: string;
    song_id: string;
    title: string;
    artist_id?: string;
    artist?: string;
    album?: string;
    duration_sec?: number;
    release_year?: number;
    audio_url?: string;
    cover?: string;
    created_at?: string;
};

type PlaylistDocument = {
    _id: string;
    name: string;
    user_id: string;
    songs?: PlaylistSong[];
};

type PlaylistResponse = PlaylistDocument | PlaylistDocument[];

type PlaylistSongsProps = {
    onSelect: (songId: string) => void;
    activeSongId?: string | null;
    pid: string;
};

type Artist = {
    _id: string;
    name: string;
};

const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
        return "--";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${remainder}`;
};

const PlaylistSongs = ({ onSelect, activeSongId, pid }: PlaylistSongsProps) => {
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const [songs, setSongs] = useState<PlaylistSong[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [artistNames, setArtistNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const controller = new AbortController();

        if (!userId) {
            setSongs([]);
            setError(null);
            setIsLoading(false);
            return () => controller.abort();
        }

        const fetchSongs = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/playlists/${pid}`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Request failed with status ${response.status}`
                    );
                }

                const raw = await response.text();
                let jsonText = raw;
                if (/\bNaN\b|\bInfinity\b|\b-Infinity\b/.test(raw)) {
                    console.warn(
                        "Sanitizing invalid JSON tokens (NaN/Infinity) from response"
                    );
                    jsonText = raw
                        .replace(/\bNaN\b/g, "null")
                        .replace(/\b-Infinity\b/g, "null")
                        .replace(/\bInfinity\b/g, "null");
                }
                const data: PlaylistResponse = JSON.parse(jsonText);
                const playlist = Array.isArray(data) ? data[0] : data;
                const playlistSongs: PlaylistSong[] = Array.isArray(
                    playlist?.songs
                )
                    ? playlist.songs
                    : [];
                setSongs(playlistSongs);
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error("Failed to load songs playlist", fetchError);
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Failed to load songs."
                );
                setSongs([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSongs();

        return () => controller.abort();
    }, [userId]);

    useEffect(() => {
        const artistIds = Array.from(
            new Set(
                songs
                    .map((song) => song.artist_id)
                    .filter((id): id is string => Boolean(id))
            )
        );

        const missing = artistIds.filter(
            (artistId) => !(artistId in artistNames)
        );

        if (missing.length === 0) {
            return;
        }

        const controller = new AbortController();

        const fetchArtists = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/artists`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch artists (${response.status})`
                    );
                }

                const data: Artist[] = await response.json();
                if (!Array.isArray(data)) {
                    return;
                }

                const nextEntries = data
                    .filter((artist) => missing.includes(artist._id))
                    .reduce<Record<string, string>>((acc, artist) => {
                        acc[artist._id] = artist.name;
                        return acc;
                    }, {});

                if (Object.keys(nextEntries).length > 0) {
                    setArtistNames((prev) => ({ ...prev, ...nextEntries }));
                }
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }
                console.error("Failed to resolve artist names", fetchError);
            }
        };

        fetchArtists();

        return () => controller.abort();
    }, [songs, artistNames]);

    const trackCountLabel = useMemo(() => {
        const count = songs.length;
        if (count === 0) {
            return "No tracks";
        }
        return `${count} track${count === 1 ? "" : "s"}`;
    }, [songs.length]);

    return (
        <section className={styles.section} aria-labelledby="song-list-title">
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="song-list-title">
                        Your songs
                    </h2>
                    <p className={styles.subtitle}>
                        Music from your playlist, straight from the server.
                    </p>
                </div>
                <span className={styles.count}>{trackCountLabel}</span>
            </header>

            {isLoading && (
                <p className={styles.statusMessage}>Loading songs…</p>
            )}

            {!user && (
                <p className={styles.statusMessage}>
                    Sign in to see your favourite songs.
                </p>
            )}

            {user && !isLoading && error && (
                <p className={styles.errorMessage} role="alert">
                    {error}
                </p>
            )}

            {user && !isLoading && !error && songs.length === 0 && (
                <p className={styles.statusMessage}>
                    No songs were found in your playlist yet.
                </p>
            )}

            {user && !isLoading && !error && songs.length > 0 && (
                <ul className={styles.grid}>
                    {songs.map((song) => {
                        const songId = song.song_id;
                        const isActive = activeSongId === songId;
                        const duration = formatDuration(song.duration_sec);
                        const artistLabel =
                            (song.artist_id &&
                                artistNames[song.artist_id] &&
                                artistNames[song.artist_id]) ||
                            song.artist ||
                            "Unknown artist";

                        return (
                            <li key={song._id ?? songId}>
                                <button
                                    type="button"
                                    className={`${styles.card} ${
                                        isActive ? styles.cardActive : ""
                                    }`}
                                    onClick={() => {
                                        onSelect(songId);
                                        console.log(songId);
                                    }}
                                    aria-pressed={isActive}
                                >
                                    <div className={styles.coverWrapper}>
                                        {song.cover ? (
                                            <img
                                                className={styles.cover}
                                                src={song.cover}
                                                alt={`Cover art for ${song.title}`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div
                                                className={styles.coverFallback}
                                            >
                                                <span aria-hidden="true">
                                                    No cover
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.cardBody}>
                                        <h3 className={styles.track}>
                                            {song.title}
                                        </h3>
                                        <p className={styles.artist}>
                                            {artistLabel}
                                        </p>
                                        <div className={styles.meta}>
                                            <span>{song.album}</span>
                                            <span>{duration}</span>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

export default PlaylistSongs;
