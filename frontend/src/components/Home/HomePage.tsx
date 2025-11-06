import { FC, ReactElement, useState } from "react";
import AudioDialog from "../Audio/AudioDialog";
import LoginDialog from "../Login/LoginDialog";
import Sidebar from "../Sidebar/Sidebar";
import styles from "./Home.module.css";
import { DEFAULT_HOME_SECTION, type HomeSections } from "../homeSections";
import SongsSection from "../Songs/SongsSection";
import NewReleaseSection from "../NewRelease/NewReleaseSection";
import SearchSection from "../Search/SearchSection";
import HomeSection from "../HomeContent/HomeSection";
import ArtistsSection from "../Artists/ArtistsSection";
import PlaylistsSection from "../Playlists/PlaylistsSection";

type NonSongSection = Exclude<HomeSections, "songs" | "new">;
const NON_SONG_SECTION_COMPONENTS: Record<NonSongSection, FC> = {
    search: SearchSection,
    home: HomeSection,
    artists: ArtistsSection,
    allPlaylists: PlaylistsSection,
};

const HomePage = () => {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [activeSection, setActiveSection] =
        useState<HomeSections>(DEFAULT_HOME_SECTION);
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

    const openLogin = () => setIsLoginOpen(true);
    const closeLogin = () => setIsLoginOpen(false);
    const handleSectionChange = (section: HomeSections) => {
        setActiveSection(section);
    };
    const handleSongSelect = (songId: string) => {
        setSelectedTrackId(songId);
    };

    let mainContent: ReactElement;
    if (activeSection === "songs") {
        mainContent = (
            <div className={styles.content}>
                <SongsSection
                    onSelect={handleSongSelect}
                    activeSongId={selectedTrackId}
                />
            </div>
        );
    } else if (activeSection === "new") {
        mainContent = (
            <div className={styles.content}>
                <NewReleaseSection
                    onSelect={handleSongSelect}
                    activeSongId={selectedTrackId}
                />
            </div>
        );
    } else {
        const SectionComponent =
            NON_SONG_SECTION_COMPONENTS[activeSection as NonSongSection];
        mainContent = (
            <div className={styles.content}>
                <SectionComponent />
            </div>
        );
    }

    return (
        <div className={styles.layout}>
            <Sidebar
                onAccountClick={openLogin}
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />
            <div className={styles.main}>{mainContent}</div>
            <AudioDialog currentTrackId={selectedTrackId} />
            <LoginDialog isOpen={isLoginOpen} onClose={closeLogin} />
        </div>
    );
};

export default HomePage;
