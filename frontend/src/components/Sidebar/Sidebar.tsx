import styles from "./Sidebar.module.css";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import WidgetsOutlinedIcon from "@mui/icons-material/WidgetsOutlined";
import MicExternalOnOutlinedIcon from "@mui/icons-material/MicExternalOnOutlined";
import SubscriptionsOutlinedIcon from "@mui/icons-material/SubscriptionsOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import LibraryMusicOutlinedIcon from "@mui/icons-material/LibraryMusicOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import logo from "../../logo.svg";
import { useAuth } from "../../auth/AuthContext";
import type { HomeSections } from "../homeSections";

type SidebarProps = {
    onAccountClick?: () => void;
    activeSection: HomeSections;
    onSectionChange: (section: HomeSections) => void;
};

const Sidebar = ({
    onAccountClick,
    activeSection,
    onSectionChange,
}: SidebarProps) => {
    const { user } = useAuth();

    return (
        <div className={styles.sidebar}>
            <div className={styles.nav}>
                <div className={styles.logo}>
                    <img src={logo} className={styles.logo_icon} alt="logo" />
                    Music
                </div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "search" ? styles.navActive : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("search")}
                >
                    <SearchOutlinedIcon />
                    Search
                </div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "home" ? styles.navActive : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("home")}
                >
                    <HomeOutlinedIcon />
                    Home
                </div>
                <div className={styles.section}>Explore</div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "new" ? styles.navActive : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("new")}
                >
                    <WidgetsOutlinedIcon />
                    New Releases
                </div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "artists" ? styles.navActive : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("artists")}
                >
                    <MicExternalOnOutlinedIcon />
                    Artists
                </div>
                <div className={styles.section}>Playlists</div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "allPlaylists"
                            ? styles.navActive
                            : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("allPlaylists")}
                >
                    <SubscriptionsOutlinedIcon />
                    All Playlists
                </div>
                <div
                    className={[
                        styles.navLink,
                        activeSection === "songs" ? styles.navActive : "",
                    ].join(" ")}
                    onClick={() => onSectionChange("songs")}
                >
                    <MusicNoteOutlinedIcon />
                    Favourite Songs
                </div>
            </div>
            <div
                className={styles.account}
                onClick={() => {
                    onAccountClick?.();
                }}
            >
                <AccountCircleOutlinedIcon />
                {user ? user.username : "Account"}
            </div>
        </div>
    );
};

export default Sidebar;
