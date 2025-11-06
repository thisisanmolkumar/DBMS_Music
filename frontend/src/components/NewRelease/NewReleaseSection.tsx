import { useEffect, useMemo, useState } from "react";
import styles from "./NewRelease.module.css";
import { API_BASE_URL } from "../../config/api";
import type { Track as AudioTrack } from "../Audio/AudioDialog";

type Song = {
    _id: string;
    song_id?: string;
    title: string;
    artist?: string;
    artist_id?: string;
    album?: string;
    album_id?: string;
    duration_sec?: number | null;
    audio_url?: string;
    cover?: string | null;
    created_at?: string;
};

type SongsResponse = {
    items: Song[];
    page: number;
    size: number;
    total: number;
};

type Artist = {
    _id: string;
    name: string;
};

const PAGE_SIZE = 12;

const mapSongsToTracks = (items: Song[]): AudioTrack[] => {
    const tracks: AudioTrack[] = [];

    items.forEach((song) => {
        const trackId = song._id ?? song.song_id;

        if (!trackId) {
            return;
        }

        tracks.push({
            _id: trackId,
            title: song.title,
            audio_url: song.audio_url ?? "",
            song_id: song.song_id ?? "",
        });
    });

    return tracks;
};

const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
        return "--";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${remainder}`;
};

const formatDate = (value?: string) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
};

type NewReleasesSectionProps = {
    onSelect: (songId: string) => void;
    activeSongId?: string | null;
    onTracksUpdate?: (tracks: AudioTrack[]) => void;
};

const NewReleaseSection = ({
    onSelect,
    activeSongId,
}: NewReleasesSectionProps) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [artistNames, setArtistNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const controller = new AbortController();

        const fetchSongs = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/songs/latest?page=${page}&size=${PAGE_SIZE}`,
                    { signal: controller.signal }
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

                const data: SongsResponse = JSON.parse(jsonText);
                setSongs(Array.isArray(data.items) ? data.items : []);
                setTotal(typeof data.total === "number" ? data.total : 0);
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error("Failed to load latest songs", fetchError);
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Unable to load latest songs."
                );
                setSongs([]);
                setTotal(0);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSongs();

        return () => controller.abort();
    }, [page]);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(total / PAGE_SIZE));
    }, [total]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const trackCountLabel = useMemo(() => {
        if (total === 0) {
            return "No tracks";
        }
        return `${total} track${total === 1 ? "" : "s"}`;
    }, [total]);

    const handlePrevious = () => {
        setPage((current) => Math.max(1, current - 1));
    };

    const handleNext = () => {
        setPage((current) => Math.min(totalPages, current + 1));
    };

    useEffect(() => {
        const ids = Array.from(
            new Set(
                songs
                    .map((song) => song.artist_id)
                    .filter((id): id is string => Boolean(id))
            )
        );

        const missing = ids.filter((artistId) => !(artistId in artistNames));
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

                const entries = data
                    .filter((artist) => missing.includes(artist._id))
                    .reduce<Record<string, string>>((acc, artist) => {
                        acc[artist._id] = artist.name;
                        return acc;
                    }, {});

                if (Object.keys(entries).length > 0) {
                    setArtistNames((previous) => ({
                        ...previous,
                        ...entries,
                    }));
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
    return (
        <section
            className={styles.section}
            aria-labelledby="new-releases-title"
        >
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="new-releases-title">
                        New Releases
                    </h2>
                    <p className={styles.subtitle}>
                        Fresh tracks that just landed. Updated continuously as
                        new songs are added.
                    </p>
                </div>
                <div className={styles.actions}>
                    <span className={styles.count}>{trackCountLabel}</span>
                    <span className={styles.pageSummary}>
                        Page {total === 0 ? 0 : page} of {totalPages}
                    </span>
                </div>
            </header>

            {isLoading && (
                <p className={styles.statusMessage}>Loading latest songs…</p>
            )}

            {!isLoading && error && (
                <p className={styles.errorMessage} role="alert">
                    {error}
                </p>
            )}

            {!isLoading && !error && total === 0 && (
                <p className={styles.statusMessage}>
                    No releases yet. Check back soon for the latest drops.
                </p>
            )}

            {!isLoading && !error && songs.length > 0 && (
                <>
                    <ul className={styles.grid}>
                        {songs.map((song) => {
                            const trackId = song.song_id;
                            if (!trackId) {
                                return null;
                            }

                            const isActive = activeSongId === trackId;
                            const durationLabel = formatDuration(
                                song.duration_sec
                            );
                            const releaseLabel = formatDate(song.created_at);
                            const artistLabel =
                                (song.artist_id &&
                                    artistNames[song.artist_id] &&
                                    artistNames[song.artist_id]) ||
                                song.artist ||
                                "Unknown artist";

                            return (
                                <li key={trackId}>
                                    <button
                                        type="button"
                                        className={`${styles.card} ${
                                            isActive ? styles.cardActive : ""
                                        }`}
                                        onClick={() => onSelect(trackId)}
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
                                                    className={
                                                        styles.coverFallback
                                                    }
                                                >
                                                    <span aria-hidden="true">
                                                        New
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
                                                <span>
                                                    {song.album ?? "Unknown"}
                                                </span>
                                                <span>{durationLabel}</span>
                                                {releaseLabel && (
                                                    <span>{releaseLabel}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>

                    <div className={styles.pagination}>
                        <button
                            type="button"
                            className={styles.pageButton}
                            onClick={handlePrevious}
                            disabled={page <= 1 || isLoading}
                        >
                            Previous
                        </button>
                        <span className={styles.pageInfo}>
                            Page {total === 0 ? 0 : page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            className={styles.pageButton}
                            onClick={handleNext}
                            disabled={page >= totalPages || isLoading}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}
        </section>
    );
};

export default NewReleaseSection;
