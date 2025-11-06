import { useEffect, useMemo, useState } from "react";
import styles from "./Search.module.css";
import { API_BASE_URL } from "../../config/api";

type SongResult = {
    _id?: string;
    song_id?: string;
    title: string;
    artist?: string;
    artist_id?: string;
    album?: string;
    duration_sec?: number | null;
};

type ArtistResult = {
    _id: string;
    name: string;
    bio?: string;
};

type AlbumResult = {
    _id: string;
    title: string;
    artist_id?: string;
    artist_name?: string;
    release_year?: string | number | null;
    cover_image_url?: string | null;
};

type SongsResponse = {
    items?: SongResult[];
    total?: number;
};

type ArtistsResponse = {
    items?: ArtistResult[];
    total?: number;
};

type AlbumsResponse = {
    items?: AlbumResult[];
    total?: number;
};

const MIN_QUERY_LENGTH = 2;
const RESULT_SIZE = 6;

const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
        return "--";
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = (seconds % 60).toString().padStart(2, "0");

    return `${minutes}:${remainder}`;
};

const SearchSection = () => {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [songs, setSongs] = useState<SongResult[]>([]);
    const [artists, setArtists] = useState<ArtistResult[]>([]);

    const [artistNames, setArtistNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, 350);

        return () => window.clearTimeout(handle);
    }, [query]);

    useEffect(() => {
        if (debouncedQuery.length < MIN_QUERY_LENGTH) {
            setIsLoading(false);
            setError(null);
            setSongs([]);
            setArtists([]);
            return;
        }

        const controller = new AbortController();

        const fetchResults = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    q: debouncedQuery,
                    size: RESULT_SIZE.toString(),
                });

                const [songsRes, artistsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/songs?${params.toString()}`, {
                        signal: controller.signal,
                    }),
                    fetch(`${API_BASE_URL}/api/artists?${params.toString()}`, {
                        signal: controller.signal,
                    }),
                ]);

                if (!songsRes.ok || !artistsRes.ok) {
                    throw new Error("One or more search requests failed.");
                }

                const [songsJson, artistsJson] = await Promise.all([
                    songsRes.json() as Promise<SongsResponse>,
                    artistsRes.json() as Promise<ArtistsResponse>,
                ]);

                setSongs(Array.isArray(songsJson.items) ? songsJson.items : []);
                setArtists(Array.isArray(artistsJson) ? artistsJson : []);
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error("Search failed", fetchError);
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Unable to complete the search."
                );
                setSongs([]);
                setArtists([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchResults();

        return () => controller.abort();
    }, [debouncedQuery]);

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
                console.log("Artists", response);

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch artists (${response.status})`
                    );
                }

                const data: ArtistResult[] = await response.json();
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
                console.error("Failed to resolve song artists", fetchError);
            }
        };

        fetchArtists();

        return () => controller.abort();
    }, [songs, artists]);

    const queryHint = useMemo(() => {
        if (query.length === 0) {
            return "Type to search for songs, artists, or albums.";
        }
        if (query.trim().length < MIN_QUERY_LENGTH) {
            return "Keep typing to search…";
        }
        return null;
    }, [query]);

    const resolvedSongs = useMemo(
        () =>
            songs.map((song) => ({
                ...song,
                artistLabel:
                    (song.artist_id &&
                        artistNames[song.artist_id] &&
                        artistNames[song.artist_id]) ||
                    song.artist ||
                    "Unknown artist",
            })),
        [songs, artistNames]
    );

    return (
        <section className={styles.section} aria-labelledby="search-title">
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="search-title">
                        Search
                    </h2>
                    <p className={styles.subtitle}>
                        Discover songs, artists, and albums across the catalog.
                    </p>
                </div>
            </header>

            <div className={styles.searchBar}>
                <label className={styles.searchLabel} htmlFor="catalog-search">
                    Search catalog
                </label>
                <input
                    id="catalog-search"
                    className={styles.searchInput}
                    type="search"
                    placeholder="Try “lofi beats” or “Arijit Singh”"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                />
            </div>

            {queryHint && <p className={styles.searchHint}>{queryHint}</p>}

            {isLoading && <p className={styles.statusMessage}>Searching…</p>}

            {!isLoading && error && (
                <p className={styles.errorMessage} role="alert">
                    {error}
                </p>
            )}

            {!isLoading &&
                !error &&
                debouncedQuery.length >= MIN_QUERY_LENGTH && (
                    <div className={styles.searchGroups}>
                        <div className={styles.searchGroup}>
                            <header className={styles.searchGroupHeader}>
                                <h3>Songs</h3>
                                <span>{resolvedSongs.length}</span>
                            </header>
                            {resolvedSongs.length === 0 ? (
                                <p className={styles.searchEmpty}>
                                    No songs matched your search.
                                </p>
                            ) : (
                                <ul className={styles.searchList}>
                                    {resolvedSongs.map((song) => (
                                        <li
                                            key={
                                                song._id ??
                                                song.song_id ??
                                                song.title
                                            }
                                            className={styles.searchListItem}
                                        >
                                            <div>
                                                <p
                                                    className={
                                                        styles.searchPrimary
                                                    }
                                                >
                                                    {song.title}
                                                </p>
                                                <p
                                                    className={
                                                        styles.searchSecondary
                                                    }
                                                >
                                                    {song.artistLabel}
                                                    {song.album
                                                        ? ` • ${song.album}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <span
                                                className={
                                                    styles.searchMetaValue
                                                }
                                            >
                                                {formatDuration(
                                                    song.duration_sec
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className={styles.searchGroup}>
                            <header className={styles.searchGroupHeader}>
                                <h3>Artists</h3>
                                <span>{artists.length}</span>
                            </header>
                            {artists.length === 0 ? (
                                <p className={styles.searchEmpty}>
                                    No artists matched your search.
                                </p>
                            ) : (
                                <ul className={styles.searchList}>
                                    {artists.map((artist) => (
                                        <li
                                            key={artist._id}
                                            className={styles.searchListItem}
                                        >
                                            <div>
                                                <p
                                                    className={
                                                        styles.searchPrimary
                                                    }
                                                >
                                                    {artist.name}
                                                </p>
                                                {artist.bio && (
                                                    <p
                                                        className={
                                                            styles.searchSecondary
                                                        }
                                                    >
                                                        {artist.bio}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
        </section>
    );
};

export default SearchSection;
