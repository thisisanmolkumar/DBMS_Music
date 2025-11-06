import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import styles from "./Audio.module.css";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import LoopIcon from "@mui/icons-material/Loop";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import Slider from "./Slider";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

export type Track = {
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
    isInSongsPlaylist?: boolean;
};

type PlaylistSong = {
    _id?: string;
    song_id?: string;
    id?: string;
};

type PlaylistWithMembership = {
    _id: string;
    name: string;
    user_id: string;
    songs?: PlaylistSong[];
    containsTrack: boolean;
};

type AudioDialogProps = {
    currentTrackId: string | null;
};

const formatTime = (timeInSeconds: number) => {
    if (!Number.isFinite(timeInSeconds) || timeInSeconds <= 0) {
        return "0:00";
    }

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${seconds}`;
};

const AudioDialog = ({ currentTrackId }: AudioDialogProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isUpdatingLike, setIsUpdatingLike] = useState(false);
    const [songsPlaylistId, setSongsPlaylistId] = useState<string>("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const volumeRef = useRef(volume);
    const { user } = useAuth();

    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const userId = user?.id ?? null;
    const [userPlaylists, setUserPlaylists] = useState<PlaylistWithMembership[]>(
        []
    );
    const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
    const [playlistError, setPlaylistError] = useState<string | null>(null);
    const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
    const [pendingPlaylistIds, setPendingPlaylistIds] = useState<string[]>([]);
    const playlistMenuRef = useRef<HTMLDivElement | null>(null);
    const trackIdForRequests = useMemo(() => {
        const candidates = [
            currentTrack?._id,
            currentTrack?.song_id,
            currentTrackId ?? undefined,
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "string" && candidate.trim().length > 0) {
                return candidate;
            }
        }

        return null;
    }, [currentTrack?._id, currentTrack?.song_id, currentTrackId]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchSongsDetails = async (songId: string) => {
            if (songId === "") {
                return;
            }
            const response = await fetch(
                `${API_BASE_URL}/api/songs?song_id=${songId}`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch song (${response.status})`);
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

            const data: Track = JSON.parse(jsonText).items[0];

            let playlistSongIds = new Set<string>();
            let songsPlaylistIdentifier = "";

            if (userId) {
                const playlistresponse = await fetch(
                    `${API_BASE_URL}/api/songs_playlists/${userId}`,
                    { signal: controller.signal }
                );

                if (!playlistresponse.ok) {
                    if (playlistresponse.status !== 404) {
                        throw new Error(
                            `Failed to fetch songs playlist (${playlistresponse.status})`
                        );
                    }
                } else {
                    const praw = await playlistresponse.text();
                    let pjsonText = praw;
                    if (/\bNaN\b|\bInfinity\b|\b-Infinity\b/.test(praw)) {
                        console.warn(
                            "Sanitizing invalid JSON tokens (NaN/Infinity) from response"
                        );
                        pjsonText = praw
                            .replace(/\bNaN\b/g, "null")
                            .replace(/\b-Infinity\b/g, "null")
                            .replace(/\bInfinity\b/g, "null");
                    }
                    const playlistData = JSON.parse(pjsonText);
                    songsPlaylistIdentifier = playlistData._id ?? "";

                    playlistSongIds = new Set(
                        Array.isArray(playlistData?.songs)
                            ? playlistData.songs
                                  .map(
                                      (s: {
                                          _id?: string;
                                          song_id?: string;
                                          id?: string;
                                      }) =>
                                          s?.song_id ??
                                          s?._id ??
                                          s?.id ??
                                          null
                                  )
                                  .filter(
                                      (v: string | null): v is string =>
                                          typeof v === "string" &&
                                          v.length > 0
                                  )
                            : []
                    );
                }
            }

            setSongsPlaylistId(songsPlaylistIdentifier);

            const currentId =
                (data as any)?.song_id ??
                (data as any)?._id ??
                (data as any)?.id ??
                "";
            (data as any)["isInSongsPlaylist"] = currentId
                ? playlistSongIds.has(currentId)
                : false;
            return data;
        };

        fetchSongsDetails(currentTrackId ?? "").then((data) => {
            setCurrentTrack(data ?? null);
        });

        return () => {
            controller.abort();
        };
    }, [currentTrackId, userId]);

    useEffect(() => {
        if (!userId) {
            setUserPlaylists([]);
            setIsPlaylistDropdownOpen(false);
            setIsPlaylistsLoading(false);
            setPlaylistError(null);
            return;
        }

        if (!currentTrack || !trackIdForRequests) {
            setUserPlaylists([]);
            setIsPlaylistsLoading(false);
            return;
        }

        const controller = new AbortController();
        setIsPlaylistsLoading(true);
        setPlaylistError(null);

        const fetchPlaylists = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/users/${userId}/playlists`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        `Failed to load playlists (${response.status})`
                    );
                }

                const raw = await response.text();
                let jsonText = raw;
                if (/\bNaN\b|\bInfinity\b|\b-Infinity\b/.test(raw)) {
                    jsonText = raw
                        .replace(/\bNaN\b/g, "null")
                        .replace(/\b-Infinity\b/g, "null")
                        .replace(/\bInfinity\b/g, "null");
                }

                const data: Omit<PlaylistWithMembership, "containsTrack">[] =
                    JSON.parse(jsonText);

                const trackIds = new Set<string>();
                const candidates = [
                    currentTrack._id,
                    currentTrack.song_id,
                    trackIdForRequests,
                ];
                candidates.forEach((value) => {
                    if (typeof value === "string" && value.trim().length > 0) {
                        trackIds.add(value);
                    }
                });

                const playlists = Array.isArray(data)
                    ? data.map((playlist) => {
                          const songs = Array.isArray(playlist.songs)
                              ? playlist.songs
                              : [];
                          const containsTrack = songs.some((song) => {
                              const candidate =
                                  song?.song_id ??
                                  song?._id ??
                                  (song as PlaylistSong)?.id;
                              return typeof candidate === "string"
                                  ? trackIds.has(candidate)
                                  : false;
                          });

                          return {
                              ...playlist,
                              songs,
                              containsTrack,
                          };
                      })
                    : [];

                setUserPlaylists(playlists);
                setPlaylistError(null);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                console.error("Failed to load user playlists", error);
                setUserPlaylists([]);
                setPlaylistError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load playlists."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsPlaylistsLoading(false);
                }
            }
        };

        fetchPlaylists();

        return () => {
            controller.abort();
        };
    }, [userId, currentTrack, trackIdForRequests]);

    useEffect(() => {
        if (!isPlaylistDropdownOpen) {
            return;
        }

        const handleClick = (event: MouseEvent) => {
            if (
                playlistMenuRef.current &&
                event.target instanceof Node &&
                !playlistMenuRef.current.contains(event.target)
            ) {
                setIsPlaylistDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);

        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, [isPlaylistDropdownOpen]);

    useEffect(() => {
        setIsPlaylistDropdownOpen(false);
    }, [trackIdForRequests]);

    useEffect(() => {
        if (!currentTrack) {
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audioElement = new Audio(
            `http://localhost:8000/stream/${currentTrack.song_id}.mp3`
        );
        audioRef.current = audioElement;
        audioElement.volume = volumeRef.current;

        const handleLoadedMetadata = () =>
            setDuration(audioElement.duration || 0);
        const handleTimeUpdate = () => setProgress(audioElement.currentTime);

        setProgress(0);
        setDuration(0);

        audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);
        audioElement.addEventListener("timeupdate", handleTimeUpdate);

        if (isPlaying) {
            audioElement.play().catch(() => setIsPlaying(false));
        }

        return () => {
            audioElement.pause();
            audioElement.removeEventListener(
                "loadedmetadata",
                handleLoadedMetadata
            );
            audioElement.removeEventListener("timeupdate", handleTimeUpdate);
            audioRef.current = null;
        };
    }, [currentTrack, isPlaying]);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (isPlaying) {
            audio.play().catch(() => setIsPlaying(false));
        } else {
            audio.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        volumeRef.current = volume;

        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        audio.volume = volume;
    }, [volume]);

    const handlePlayPause = () => {
        if (!currentTrack) {
            return;
        }

        setIsPlaying((prevState) => !prevState);
    };

    const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
        const newTime = Number(event.target.value);

        if (!Number.isFinite(newTime)) {
            return;
        }

        setProgress(newTime);

        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    };

    const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(event.target.value);

        if (Number.isNaN(newVolume)) {
            return;
        }

        setVolume(Math.min(1, Math.max(0, newVolume)));
    };

    const handleToggleLike = async () => {
        if (!userId || isUpdatingLike || !currentTrack?._id || !songsPlaylistId) {
            return;
        }

        const isLiked = Boolean(currentTrack.isInSongsPlaylist);
        setIsUpdatingLike(true);
        setPlaylistError(null);

        try {
            const endpoint = isLiked
                ? `${API_BASE_URL}/api/playlists/${songsPlaylistId}/songs/${currentTrack._id}`
                : `${API_BASE_URL}/api/playlists/${songsPlaylistId}/songs`;

            const response = await fetch(endpoint, {
                method: isLiked ? "DELETE" : "POST",
                headers: isLiked
                    ? undefined
                    : {
                          "Content-Type": "application/json",
                      },
                body: isLiked
                    ? undefined
                    : JSON.stringify({ song_id: currentTrack._id }),
            });

            if (!response.ok) {
                throw new Error(
                    isLiked
                        ? `Failed to remove song from playlist (${response.status})`
                        : `Failed to add song to playlist (${response.status})`
                );
            }

            setCurrentTrack((prev) =>
                prev
                    ? {
                          ...prev,
                          isInSongsPlaylist: !isLiked,
                      }
                    : prev
            );

            if (songsPlaylistId) {
                setUserPlaylists((prev) =>
                    prev.map((playlist) =>
                        playlist._id === songsPlaylistId
                            ? { ...playlist, containsTrack: !isLiked }
                            : playlist
                    )
                );
            }
        } catch (error) {
            console.error("Failed to toggle like state for song", error);
            setPlaylistError(
                error instanceof Error
                    ? error.message
                    : "Unable to update playlist."
            );
        } finally {
            setIsUpdatingLike(false);
        }
    };

    const toggleTrackInPlaylist = async (
        playlistId: string,
        shouldAdd: boolean
    ) => {
        if (
            !userId ||
            !currentTrack ||
            !trackIdForRequests ||
            pendingPlaylistIds.includes(playlistId)
        ) {
            return;
        }

        setPendingPlaylistIds((prev) =>
            prev.includes(playlistId) ? prev : [...prev, playlistId]
        );
        setPlaylistError(null);

        try {
            const endpoint = shouldAdd
                ? `${API_BASE_URL}/api/playlists/${playlistId}/songs`
                : `${API_BASE_URL}/api/playlists/${playlistId}/songs/${trackIdForRequests}`;

            const response = await fetch(endpoint, {
                method: shouldAdd ? "POST" : "DELETE",
                headers: shouldAdd
                    ? {
                          "Content-Type": "application/json",
                      }
                    : undefined,
                body: shouldAdd
                    ? JSON.stringify({ song_id: trackIdForRequests })
                    : undefined,
            });

            if (!response.ok) {
                throw new Error(
                    shouldAdd
                        ? `Failed to add song to playlist (${response.status})`
                        : `Failed to remove song from playlist (${response.status})`
                );
            }

            setUserPlaylists((prev) =>
                prev.map((playlist) => {
                    if (playlist._id !== playlistId) {
                        return playlist;
                    }

                    const songs = Array.isArray(playlist.songs)
                        ? playlist.songs
                        : [];

                    if (shouldAdd) {
                        const exists = songs.some((song) => {
                            const candidate =
                                song?.song_id ??
                                song?._id ??
                                (song as PlaylistSong)?.id;
                            return candidate === trackIdForRequests;
                        });
                        return {
                            ...playlist,
                            containsTrack: true,
                            songs: exists
                                ? songs
                                : [
                                      ...songs,
                                      { song_id: trackIdForRequests } as PlaylistSong,
                                  ],
                        };
                    }

                    return {
                        ...playlist,
                        containsTrack: false,
                        songs: songs.filter((song) => {
                            const candidate =
                                song?.song_id ??
                                song?._id ??
                                (song as PlaylistSong)?.id;
                            return candidate !== trackIdForRequests;
                        }),
                    };
                })
            );

            if (playlistId === songsPlaylistId) {
                setCurrentTrack((prev) =>
                    prev
                        ? {
                              ...prev,
                              isInSongsPlaylist: shouldAdd,
                          }
                        : prev
                );
            }
        } catch (error) {
            console.error("Failed to update playlist membership", error);
            setPlaylistError(
                error instanceof Error
                    ? error.message
                    : "Unable to update playlist."
            );
        } finally {
            setPendingPlaylistIds((prev) =>
                prev.filter((id) => id !== playlistId)
            );
        }
    };

    const isPlaylistButtonDisabled = !userId || !currentTrack;
    const isPlaylistUpdating = (playlistId: string) =>
        pendingPlaylistIds.includes(playlistId);
    const handlePlaylistButtonClick = () => {
        if (isPlaylistButtonDisabled) {
            return;
        }
        setIsPlaylistDropdownOpen((prev) => !prev);
    };

    const isLikeButtonDisabled = !userId || isUpdatingLike;

    return (
        <div className={styles.main}>
            <div className={styles.trackInfo}>
                <span className={styles.trackLabel}>Now playing</span>
                <div className={styles.trackTitleRow}>
                    <span className={styles.trackTitle}>
                        {currentTrack
                            ? currentTrack.title
                            : "No track selected"}
                    </span>
                </div>
            </div>

            <div className={styles.transport}>
                <button
                    type="button"
                    className={`${styles.likeButton} ${
                        currentTrack?.isInSongsPlaylist
                            ? styles.likeButtonActive
                            : ""
                    }`}
                    onClick={handleToggleLike}
                    aria-label={
                        currentTrack?.isInSongsPlaylist
                            ? "Remove from your songs playlist"
                            : "Save to your songs playlist"
                    }
                    aria-pressed={currentTrack?.isInSongsPlaylist}
                    disabled={isLikeButtonDisabled}
                    title={
                        currentTrack
                            ? currentTrack?.isInSongsPlaylist
                                ? "Remove from your songs playlist"
                                : "Save to your songs playlist"
                            : "No track selected"
                    }
                >
                    {currentTrack?.isInSongsPlaylist ? (
                        <FavoriteIcon fontSize="small" />
                    ) : (
                        <FavoriteBorderIcon fontSize="small" />
                    )}
                </button>
                <div className={styles.playlistMenu} ref={playlistMenuRef}>
                    <button
                        type="button"
                        className={styles.playlistToggle}
                        onClick={handlePlaylistButtonClick}
                        disabled={isPlaylistButtonDisabled}
                        aria-haspopup="true"
                        aria-expanded={isPlaylistDropdownOpen}
                    >
                        <QueueMusicIcon fontSize="small" />
                        <span className={styles.playlistToggleLabel}>
                            Playlists
                        </span>
                    </button>
                    {isPlaylistDropdownOpen && (
                        <div
                            className={styles.playlistDropdown}
                            role="menu"
                            aria-label="Add track to playlists"
                        >
                            {isPlaylistsLoading ? (
                                <p className={styles.playlistStatus}>
                                    Loading playlists…
                                </p>
                            ) : userPlaylists.length === 0 ? (
                                <p className={styles.playlistStatus}>
                                    {playlistError
                                        ? playlistError
                                        : "You have no playlists yet."}
                                </p>
                            ) : (
                                <ul className={styles.playlistList}>
                                    {userPlaylists.map((playlist) => (
                                        <li key={playlist._id}>
                                            <label
                                                className={
                                                    styles.playlistOption
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        playlist.containsTrack
                                                    }
                                                    onChange={(event) =>
                                                        toggleTrackInPlaylist(
                                                            playlist._id,
                                                            event.target
                                                                .checked
                                                        )
                                                    }
                                                    disabled={isPlaylistUpdating(
                                                        playlist._id
                                                    )}
                                                />
                                                <span>{playlist.name}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {playlistError &&
                                userPlaylists.length > 0 &&
                                !isPlaylistsLoading && (
                                    <p
                                        className={styles.playlistError}
                                        role="alert"
                                    >
                                        {playlistError}
                                    </p>
                                )}
                        </div>
                    )}
                </div>
                {/* <button
                    type="button"
                    className={styles.controlButton}
                    onClick={() => {}}
                    disabled={!currentTrack}
                    aria-label="Shuffle"
                >
                    <ShuffleIcon />
                </button> */}
                {/* <button
                    type="button"
                    className={styles.controlButton}
                    onClick={handlePrevious}
                    disabled={!currentTrack}
                    aria-label="Previous track"
                >
                    <NavigateBeforeIcon />
                </button> */}
                <button
                    type="button"
                    className={styles.controlButton}
                    onClick={handlePlayPause}
                    disabled={!currentTrack}
                    aria-label={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </button>
                {/* <button
                    type="button"
                    className={styles.controlButton}
                    onClick={handleNext}
                    disabled={!currentTrack}
                    aria-label="Next track"
                >
                    <NavigateNextIcon />
                </button> */}
                <button
                    type="button"
                    className={styles.controlButton}
                    onClick={() => {}}
                    disabled={!currentTrack}
                    aria-label="Loop"
                >
                    <LoopIcon />
                </button>
            </div>

            <div className={styles.progressGroup}>
                <span className={styles.time}>{formatTime(progress)}</span>
                <Slider
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={duration ? Math.min(progress, duration) : 0}
                    onChange={handleSeek}
                    className={styles.seek}
                    ariaLabel="Seek"
                    disabled={!currentTrack}
                />
                <span className={styles.time}>{formatTime(duration)}</span>
            </div>

            <div className={styles.volumeGroup}>
                <button
                    type="button"
                    className={styles.controlButton}
                    onClick={() => {
                        setVolume(volume > 0 ? 0 : 0.5); // TODO: Store old value
                    }}
                    disabled={!currentTrack}
                    aria-label="Volume"
                >
                    {volume > 0 ? (
                        <VolumeUpIcon
                            style={{ height: "20px", paddingTop: "2px" }}
                        />
                    ) : (
                        <VolumeOffIcon
                            style={{ height: "20px", paddingTop: "2px" }}
                        />
                    )}
                </button>
                <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolumeChange}
                    className={styles.volume}
                    ariaLabel="Volume"
                    disabled={!currentTrack}
                />
            </div>
        </div>
    );
};

export default AudioDialog;
