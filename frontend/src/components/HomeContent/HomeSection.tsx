import styles from "./Home.module.css";

const HomeSection = () => {
    return (
        <section
            className={styles.section}
            aria-labelledby="home-overview-title"
        >
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title} id="home-overview-title">
                        Database Management System Music Project
                    </h2>
                    <h3>About This DBMS Project</h3>
                    <p className={styles.subtitle}>
                        A full-stack exploration of music catalog data powered
                        by MongoDB, Flask services, and a React frontend.
                    </p>
                </div>
            </header>

            <div className={styles.richText}>
                <p>
                    This application is part of a database management systems
                    project that experiments with document-first design. All
                    music metadata, playlists, and activity logs are persisted
                    inside a MongoDB cluster, letting us lean on flexible
                    schemas while still enforcing structure through the
                    frontend.
                </p>
                <p>
                    Two dedicated Flask APIs coordinate how the client interacts
                    with that data. The first (located at{" "}
                    <code>utils/server.py</code>) exposes REST endpoints for
                    songs, artists, albums, playlists, and search. The second (
                    <code>utils/stream.py</code>) focuses on media delivery—it
                    serves and streams MP3 assets with range requests so the
                    player can scrub through tracks in real time.
                </p>
            </div>

            <div className={styles.infoGrid}>
                <article className={styles.infoCard}>
                    <h3>Why MongoDB?</h3>
                    <ul className={styles.infoList}>
                        <li>
                            Nested song &amp; playlist documents without joins.
                        </li>
                        <li>
                            Rapid prototyping while iterating on schema design.
                        </li>
                        <li>Powerful aggregation pipelines for analytics.</li>
                    </ul>
                </article>
                <article className={styles.infoCard}>
                    <h3>Flask Data API</h3>
                    <ul className={styles.infoList}>
                        <li>
                            Search endpoints for songs, artists, and albums
                            backed by indexes.
                        </li>
                        <li>
                            Playlist management and aggregated “latest” feeds.
                        </li>
                        <li>
                            Clean JSON responses consumed by the React client.
                        </li>
                    </ul>
                </article>
                <article className={styles.infoCard}>
                    <h3>Streaming API</h3>
                    <ul className={styles.infoList}>
                        <li>
                            Range-enabled MP3 streaming for precise playback.
                        </li>
                        <li>
                            Static track catalog served from the local songs
                            store.
                        </li>
                        <li>
                            Separates heavy media traffic from metadata queries.
                        </li>
                    </ul>
                </article>
            </div>

            <div className={styles.richText}>
                <p>
                    On the frontend, this React + TypeScript application
                    stitches everything together—offering search, new release
                    highlights, curated playlists, and authenticated access. As
                    the project evolves, these sections will expand with
                    analytics dashboards, playlist editors, and richer library
                    insights.
                </p>
            </div>

            <div className={styles.runbook}>
                <h3>Run It Locally</h3>
                <p>
                    Spin up all three services (two Flask APIs and the React
                    app) to experience the full stack in development:
                </p>
                <ol className={styles.runSteps}>
                    <li>
                        <strong>Install dependencies</strong>
                        <ul>
                            <li>
                                Backend utilities:{" "}
                                <code>
                                    pip install -r utils/requirements.txt
                                </code>{" "}
                                (create a virtualenv first if you prefer).
                            </li>
                            <li>
                                Frontend: <code>npm install</code> from{" "}
                                <code>frontend/music</code>.
                            </li>
                        </ul>
                    </li>
                    <li>
                        <strong>Seed MongoDB (optional)</strong>
                        <p>
                            Use the helper scripts in <code>utils/db.py</code>{" "}
                            to populate artists, albums, and songs. Update the
                            MongoDB connection string in that file if you are
                            not using the provided Atlas cluster.
                        </p>
                    </li>
                    <li>
                        <strong>Start the Flask APIs</strong>
                        <ul>
                            <li>
                                Catalog API: <code>python utils/server.py</code>{" "}
                                (runs on <code>http://127.0.0.1:5001</code>).
                            </li>
                            <li>
                                Streaming API:{" "}
                                <code>python utils/stream.py</code> (serves
                                audio on <code>http://127.0.0.1:8000</code>).
                            </li>
                        </ul>
                    </li>
                    <li>
                        <strong>Launch the React client</strong>
                        <p>
                            From <code>frontend/music</code> run{" "}
                            <code>npm start</code>. The dev server proxies API
                            calls to the Flask services and expects them to be
                            reachable at the ports above.
                        </p>
                    </li>
                </ol>
                <p>
                    With all three processes running you can explore search, new
                    releases, playlists, and streaming directly from the
                    browser.
                </p>
            </div>
        </section>
    );
};

export default HomeSection;
