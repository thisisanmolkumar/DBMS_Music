import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { API_BASE_URL } from "../../config/api";
import styles from "./Artists.module.css";

type Artist = {
    _id: string;
    name: string;
    bio?: string;
};

type ArtistWithSongs = Artist & {
    songCount: number;
};

type SongsResponse = {
    items: Array<{ _id: string }>;
    total: number;
};

type SortField = "name" | "songs";
type SortDirection = "asc" | "desc";

const ArtistsSection = () => {
    const [artists, setArtists] = useState<ArtistWithSongs[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    useEffect(() => {
        const controller = new AbortController();

        const fetchArtists = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${API_BASE_URL}/api/artists`, {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `Failed to load artists (${response.status})`
                    );
                }

                const data: Artist[] = await response.json();
                const artistList = Array.isArray(data) ? data : [];

                const detailed = await Promise.all(
                    artistList.map(async (artist) => {
                        try {
                            const songsResponse = await fetch(
                                `${API_BASE_URL}/api/songs?artist_id=${encodeURIComponent(
                                    artist._id
                                )}&size=1`,
                                { signal: controller.signal }
                            );

                            if (!songsResponse.ok) {
                                throw new Error(
                                    `Failed to load songs for artist ${artist._id}`
                                );
                            }

                            const songsData: SongsResponse =
                                await songsResponse.json();

                            const songCount =
                                typeof songsData.total === "number"
                                    ? songsData.total
                                    : Array.isArray(songsData.items)
                                    ? songsData.items.length
                                    : 0;

                            return {
                                ...artist,
                                songCount,
                            };
                        } catch (artistError) {
                            if (controller.signal.aborted) {
                                return { ...artist, songCount: 0 };
                            }

                            console.error(
                                `Failed to load songs for artist ${artist._id}`,
                                artistError
                            );

                            return {
                                ...artist,
                                songCount: 0,
                            };
                        }
                    })
                );

                if (!controller.signal.aborted) {
                    setArtists(detailed);
                }
            } catch (fetchError) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error("Failed to load artists", fetchError);
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Unable to load artists."
                );
                setArtists([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchArtists();

        return () => controller.abort();
    }, []);

    const title = useMemo(
        () => (artists.length > 0 ? "Artists" : "No artists found"),
        [artists.length]
    );

    const sortedArtists = useMemo(() => {
        const copy = [...artists];

        copy.sort((a, b) => {
            let comparison = 0;

            if (sortField === "name") {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                comparison = nameA.localeCompare(nameB);
            } else {
                comparison = a.songCount - b.songCount;
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        return copy;
    }, [artists, sortField, sortDirection]);

    const sortLabel = useMemo(() => {
        const fieldLabel = sortField === "name" ? "Name" : "Songs";
        const directionLabel = sortDirection === "asc" ? "↑" : "↓";
        return `${fieldLabel} ${directionLabel}`;
    }, [sortField, sortDirection]);

    return (
        <section className={styles.section} aria-labelledby="artists-title">
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="artists-title">
                        {title}
                    </h2>
                    <p className={styles.subtitle}>
                        Browse and follow artists to stay updated on their
                        latest music and announcements.
                    </p>
                </div>
                {artists.length > 0 && (
                    <div className={styles.actions}>
                        <span
                            className={styles.sortSummary}
                            onClick={() => {
                                if (sortField === "name") {
                                    if (sortDirection === "asc") {
                                        setSortDirection("desc");
                                    } else {
                                        setSortField("songs");
                                        setSortDirection("asc");
                                    }
                                } else {
                                    if (sortDirection === "asc") {
                                        setSortDirection("desc");
                                    } else {
                                        setSortField("name");
                                        setSortDirection("asc");
                                    }
                                }
                            }}
                        >
                            {sortLabel}
                        </span>
                        <span className={styles.count}>
                            {artists.length === 1
                                ? "1 artist"
                                : `${artists.length} artists`}
                        </span>
                    </div>
                )}
            </header>

            {isLoading && (
                <p className={styles.statusMessage}>Loading artists…</p>
            )}

            {!isLoading && error && (
                <p className={styles.errorMessage} role="alert">
                    {error}
                </p>
            )}

            {!isLoading && !error && artists.length === 0 && (
                <p className={styles.statusMessage}>
                    We couldn&apos;t find any artists. Try adding more songs or
                    check back later.
                </p>
            )}

            {!isLoading && !error && artists.length > 0 && (
                <ul className={styles.artistList}>
                    {sortedArtists.map((artist) => (
                        <li
                            key={artist._id}
                            className={styles.artistListItem}
                            onClick={() => {
                                // TODO: Go to search and fill with artist name
                            }}
                        >
                            <div>
                                <h3 className={styles.artistName}>
                                    {artist.name}
                                </h3>
                            </div>
                            <span className={styles.artistCount}>
                                {artist.songCount === 1
                                    ? "1 song"
                                    : `${artist.songCount} songs`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

export default ArtistsSection;
