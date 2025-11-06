import {
    ChangeEvent,
    FormEvent,
    MouseEvent as ReactMouseEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import styles from "./Playlists.module.css";

type PlaylistSummary = {
    _id: string;
    name: string;
    user_id: string;
};

type PlaylistSong = {
    _id?: string;
    song_id?: string;
    title?: string;
    artist_id?: string;
    album?: string;
    duration_sec?: number;
    release_year?: number;
    audio_url?: string;
    cover?: string;
};

type PlaylistDetail = PlaylistSummary & {
    created_at?: string;
    songs?: PlaylistSong[];
};

const PlaylistsSection = () => {
    const { user } = useAuth();
    const [playlists, setPlaylists] = useState<PlaylistDetail[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!user?.id) {
            setPlaylists([]);
            setError(null);
            setIsLoading(false);
            controllerRef.current?.abort();
            controllerRef.current = null;
            return;
        }

        const fetchPlaylists = async () => {
            const activeController = controllerRef.current;
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/users/${user.id}/playlists`,
                    { signal: activeController?.signal }
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

                const data: PlaylistSummary[] = JSON.parse(jsonText);
                const summaries = Array.isArray(data) ? data : [];

                if (summaries.length === 0) {
                    setPlaylists([]);
                    return;
                }

                if (!activeController?.signal?.aborted) {
                    setPlaylists(
                        summaries.filter(
                            (playlist): playlist is PlaylistDetail =>
                                Boolean(playlist)
                        )
                    );
                }
            } catch (fetchError) {
                if (activeController?.signal?.aborted) {
                    return;
                }
                setPlaylists([]);
                console.error("Failed to load playlists", fetchError);
                setError(
                    fetchError instanceof Error
                        ? fetchError.message
                        : "Unable to load playlists."
                );
            } finally {
                if (!activeController?.signal?.aborted) {
                    setIsLoading(false);
                }
            }
        };

        controllerRef.current?.abort();
        controllerRef.current = new AbortController();

        fetchPlaylists();

        return () => {
            controllerRef.current?.abort();
            controllerRef.current = null;
        };
    }, [user?.id]);

    useEffect(() => {
        if (!user) {
            setIsCreateDialogOpen(false);
            setNewPlaylistName("");
            setCreateError(null);
            setIsCreating(false);
        }
    }, [user]);

    useEffect(() => {
        if (!isCreateDialogOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isCreating) {
                setIsCreateDialogOpen(false);
                setCreateError(null);
                setNewPlaylistName("");
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isCreateDialogOpen, isCreating]);

    const sectionTitle = useMemo(() => {
        if (!user) {
            return "Playlists";
        }
        return `${user.username.split(" ")[0]}'s playlists`;
    }, [user]);

    const playlistsWithCounts = useMemo(
        () =>
            playlists.map((playlist) => {
                const songCount = Array.isArray(playlist.songs)
                    ? playlist.songs.length
                    : 0;

                return {
                    ...playlist,
                    songCount,
                };
            }),
        [playlists]
    );

    const handleCreatePlaylist = () => {
        if (!user || isCreating) {
            return;
        }
        setCreateError(null);
        setNewPlaylistName("");
        setIsCreateDialogOpen(true);
    };

    const handleCloseCreateDialog = () => {
        if (isCreating) {
            return;
        }
        setIsCreateDialogOpen(false);
        setCreateError(null);
        setNewPlaylistName("");
    };

    const handleDialogBackdropClick = (
        event: ReactMouseEvent<HTMLDivElement>
    ) => {
        if (event.target === event.currentTarget) {
            handleCloseCreateDialog();
        }
    };

    const handleCreateDialogSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        if (!user?.id || isCreating) {
            return;
        }

        const trimmedName = newPlaylistName.trim();
        if (!trimmedName) {
            setCreateError("Playlist name is required.");
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/playlists`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: trimmedName,
                    user_id: user.id,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Create playlist failed with status ${response.status}`
                );
            }

            const createdSummary: PlaylistSummary = await response.json();
            setPlaylists((prev) => [
                {
                    ...createdSummary,
                    songs: [],
                },
                ...prev,
            ]);
            setError(null);
            setIsCreateDialogOpen(false);
            setNewPlaylistName("");
        } catch (createError) {
            console.error("Failed to create playlist", createError);
            const message =
                createError instanceof Error
                    ? createError.message
                    : "Unable to create playlist.";
            setCreateError(message);
            setError(message);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <section className={styles.section} aria-labelledby="playlists-title">
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="playlists-title">
                        {sectionTitle}
                    </h2>
                    <p className={styles.subtitle}>
                        Browse every playlist tied to your account.
                    </p>
                </div>
                {user && (
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.createButton}
                            onClick={handleCreatePlaylist}
                            disabled={isCreating}
                        >
                            {isCreating ? "Creating…" : "New playlist"}
                        </button>
                        <span className={styles.count}>
                            {playlistsWithCounts.length === 0
                                ? "No playlists yet"
                                : `${playlistsWithCounts.length} playlist${
                                      playlistsWithCounts.length === 1
                                          ? ""
                                          : "s"
                                  }`}
                        </span>
                    </div>
                )}
            </header>

            {!user && (
                <p className={styles.statusMessage}>
                    Sign in to see your playlists.
                </p>
            )}

            {user && isLoading && (
                <p className={styles.statusMessage}>Loading playlists…</p>
            )}

            {user && !isLoading && error && (
                <p className={styles.errorMessage} role="alert">
                    {error}
                </p>
            )}

            {user &&
                !isLoading &&
                !error &&
                playlistsWithCounts.length === 0 && (
                    <p className={styles.statusMessage}>
                        No playlists found yet. Start curating and they&apos;ll
                        show up here.
                    </p>
                )}

            {user && !isLoading && !error && playlistsWithCounts.length > 0 && (
                <ul className={styles.list}>
                    {playlistsWithCounts.map((playlist) => {
                        let duration = 0;
                        playlist.songs?.forEach((song) => {
                            duration += song.duration_sec ?? 0;
                        });

                        return (
                            <li key={playlist._id}>
                                <article
                                    className={styles.playlist_card}
                                    onClick={() => {}}
                                >
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>
                                            {playlist.name}
                                        </h3>
                                        <span className={styles.badge}>
                                            {playlist.songCount}{" "}
                                            {playlist.songCount === 1
                                                ? "song"
                                                : "songs"}
                                        </span>
                                    </div>
                                    {duration !== 0 && (
                                        <div className={styles.meta}>
                                            <span>
                                                {parseInt(
                                                    (duration / 3600).toString()
                                                )}
                                                + Hours of playtime
                                            </span>
                                        </div>
                                    )}
                                </article>
                            </li>
                        );
                    })}
                </ul>
            )}
            {isCreateDialogOpen && (
                <div
                    className={styles.createDialogBackdrop}
                    onClick={handleDialogBackdropClick}
                >
                    <div
                        className={styles.createDialogCard}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-playlist-title"
                        aria-describedby="create-playlist-description"
                    >
                        <h3
                            className={styles.createDialogTitle}
                            id="create-playlist-title"
                        >
                            Name your playlist
                        </h3>
                        <p
                            className={styles.createDialogDescription}
                            id="create-playlist-description"
                        >
                            Pick something memorable so you can find it again
                            later.
                        </p>
                        <form
                            className={styles.createDialogForm}
                            onSubmit={handleCreateDialogSubmit}
                        >
                            <label
                                className={styles.createDialogLabel}
                                htmlFor="new-playlist-name"
                            >
                                Playlist name
                            </label>
                            <input
                                id="new-playlist-name"
                                name="playlist-name"
                                className={styles.createDialogInput}
                                type="text"
                                placeholder="E.g. Weekend Vibes"
                                value={newPlaylistName}
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>
                                ) => {
                                    setNewPlaylistName(event.target.value);
                                    if (createError) {
                                        setCreateError(null);
                                    }
                                }}
                                autoFocus
                                disabled={isCreating}
                            />
                            {createError && (
                                <p
                                    className={styles.createDialogError}
                                    role="alert"
                                >
                                    {createError}
                                </p>
                            )}
                            <div className={styles.createDialogActions}>
                                <button
                                    type="button"
                                    className={styles.createDialogCancel}
                                    onClick={handleCloseCreateDialog}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.createDialogSubmit}
                                    disabled={isCreating}
                                >
                                    {isCreating ? "Creating…" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default PlaylistsSection;
