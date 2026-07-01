const Database = require("better-sqlite3");

const db = new Database("moomuss.db");

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    source TEXT NOT NULL,
    platform TEXT,
    track_id TEXT,
    thumbnail TEXT,

    FOREIGN KEY (playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE
);
`);

try {
  db.exec(`ALTER TABLE playlist_tracks ADD COLUMN platform TEXT`);
} catch {
  // column already exists
}

module.exports = db;