const Database = require("better-sqlite3");
const { app } = require("electron");
const path = require("path");

const fs = require("fs");

let db = null;

function getDb() {
  if (!db) {
    let userDataPath;
    try {
      userDataPath = app?.getPath ? app.getPath("userData") : null;
    } catch {
      userDataPath = null;
    }

    const dbDir =
      userDataPath ||
      path.join(process.env.APPDATA || process.cwd(), "moomussic");

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, "moomuss.db");
    const localDbPath = path.join(process.cwd(), "moomuss.db");

    // Migrate local database to userData seamlessly
    if (dbPath !== localDbPath && !fs.existsSync(dbPath) && fs.existsSync(localDbPath)) {
      try {
        fs.copyFileSync(localDbPath, dbPath);
        console.log("[Database] Local DB migrated to userData successfully.");
      } catch (err) {
        console.error("[Database] Failed to migrate local DB:", err);
      }
    }

    db = new Database(dbPath);

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
          duration TEXT,

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

    try {
      db.exec(`ALTER TABLE playlist_tracks ADD COLUMN duration TEXT`);
    } catch {
      // column already exists
    }
  }
  return db;
}

module.exports = {
  prepare: (sql) => getDb().prepare(sql),
  exec: (sql) => getDb().exec(sql)
};