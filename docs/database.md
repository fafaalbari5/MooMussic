# MooMussic Database Design

## Overview

MooMussic uses **SQLite** as its embedded, local-first database. The database file is `moomuss.db` at the project root (created automatically on first run).

Access is **restricted to the Electron main process** via `better-sqlite3`. The renderer must never open or query the database directly.

Connection and schema initialization live in `src/db/database.js`.

---

## Engine & Configuration

| Setting | Value |
|---------|-------|
| Engine | SQLite 3 |
| Driver | `better-sqlite3` (synchronous API) |
| File | `moomuss.db` |
| Foreign keys | `PRAGMA foreign_keys = ON` |

`better-sqlite3` runs synchronously on the main thread. For MVP scale (playlists, thousands of tracks) this is acceptable. If write volume grows, consider WAL mode and batched writes.

---

## Entity Relationship Diagram

```
┌─────────────────────┐         ┌──────────────────────────┐
│     playlists       │         │    playlist_tracks      │
├─────────────────────┤         ├──────────────────────────┤
│ id (PK)             │───1───* │ id (PK)                  │
│ name                │         │ playlist_id (FK)         │
└─────────────────────┘         │ title                    │
                                │ artist                   │
                                │ source                   │
                                │ track_id                 │
                                │ thumbnail                │
                                └──────────────────────────┘
```

**Relationship:** One playlist has many playlist tracks. Deleting a playlist cascades to its tracks.

---

## Current Schema

### Table: `playlists`

Stores user-created playlist containers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Internal playlist ID |
| `name` | `TEXT` | `NOT NULL` | Display name |

**Indexes (recommended, not yet applied):**

```sql
CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name);
```

### Table: `playlist_tracks`

Stores tracks associated with a playlist. This is a **snapshot** of metadata at add time, not a live link to the provider.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Row ID (used for delete) |
| `playlist_id` | `INTEGER` | `NOT NULL`, `FK → playlists(id) ON DELETE CASCADE` | Parent playlist |
| `title` | `TEXT` | `NOT NULL` | Track title |
| `artist` | `TEXT` | nullable | Artist name (not populated in MVP) |
| `source` | `TEXT` | `NOT NULL` | Provider label, e.g. `"YouTube"` |
| `track_id` | `TEXT` | nullable | Provider track/video ID |
| `thumbnail` | `TEXT` | nullable | Cover image URL |

**Note:** Early documentation referred to `video_id`; the implemented column is `track_id` to stay provider-agnostic.

---

## Bootstrap SQL

As executed in `src/db/database.js`:

```sql
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
    track_id TEXT,
    thumbnail TEXT,

    FOREIGN KEY (playlist_id)
        REFERENCES playlists(id)
        ON DELETE CASCADE
);
```

---

## Service Operations

Implemented in `src/services/playlist.js`:

| Operation | SQL | Returns |
|-----------|-----|---------|
| Create playlist | `INSERT INTO playlists (name) VALUES (?)` | `RunResult` |
| List playlists | `SELECT * FROM playlists` | `Playlist[]` |
| Add track | `INSERT INTO playlist_tracks (...)` | `RunResult` |
| List tracks | `SELECT * FROM playlist_tracks WHERE playlist_id = ?` | `PlaylistTrack[]` |
| Delete track | `DELETE FROM playlist_tracks WHERE id = ?` | `RunResult` |

**Not yet implemented:**

- Rename playlist
- Delete playlist
- Reorder tracks within playlist
- Duplicate playlist

---

## Data Mapping: Search Result → Playlist Row

When adding a track from search (`addTrackToPlaylist`):

| Search track field | DB column |
|--------------------|-----------|
| `track.title` | `title` |
| `track.source` | `source` |
| `track.id` | `track_id` |
| `track.thumbnail` | `thumbnail` |
| — | `artist` (not mapped in MVP) |
| — | `platform` (not persisted; infer from `source` or add column) |

**Gap:** `platform` (e.g. `"youtube"`) is required for stream resolution but is **not stored** in the database today. Playback from playlist may fail stream routing unless `platform` is re-derived from `source` or added as a column.

**Recommended migration:**

```sql
ALTER TABLE playlist_tracks ADD COLUMN platform TEXT;
```

---

## Future Schema (Planned)

### Phase 2 — Playback & Library

```sql
-- Independent playback queue (optional persistence)
CREATE TABLE queue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    position INTEGER NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    source TEXT NOT NULL,
    platform TEXT NOT NULL,
    track_id TEXT,
    thumbnail TEXT,
    added_at TEXT DEFAULT (datetime('now'))
);

-- Recently played
CREATE TABLE play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT,
    source TEXT NOT NULL,
    platform TEXT NOT NULL,
    track_id TEXT,
    played_at TEXT DEFAULT (datetime('now'))
);

-- User favorites
CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail TEXT,
    UNIQUE(platform, track_id)
);
```

### Phase 3 — Local Library

```sql
CREATE TABLE local_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration_ms INTEGER,
    scanned_at TEXT DEFAULT (datetime('now'))
);
```

### Phase 5 — User & Sync

```sql
CREATE TABLE user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Cloud sync metadata (device id, last sync, etc.)
CREATE TABLE sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at TEXT,
    device_id TEXT
);
```

---

## Migration Strategy

MVP uses `CREATE TABLE IF NOT EXISTS` only. For production:

1. Introduce `src/db/migrations/` with numbered SQL files (`001_initial.sql`, `002_add_platform.sql`, …).
2. Track applied migrations in a `schema_migrations` table.
3. Run migrations on app startup before services connect.

Example:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now'))
);
```

---

## Repository Pattern (Target)

Replace direct SQL in services with repositories:

```
src/repositories/
  playlistRepository.js    — playlists CRUD
  playlistTrackRepository.js — tracks CRUD
  queueRepository.js       — (future)
```

Services call repositories; repositories own SQL. This enables unit testing with in-memory SQLite.

---

## Backup & Portability

| Concern | Approach |
|---------|----------|
| User data location | Move DB to `app.getPath('userData')` in production |
| Backup | Copy `moomuss.db` or export JSON playlist |
| Corruption | SQLite integrity check on startup (future) |

---

## Conventions

- Use **parameterized queries** only (`db.prepare(...).run(?)`) — never string concatenation.
- Timestamps: ISO 8601 strings via `datetime('now')` unless migrating to integer epoch ms.
- IDs: integer autoincrement for internal rows; provider IDs in `track_id` as TEXT.
- Cascading deletes on playlist removal are already enabled via `ON DELETE CASCADE`.

---

## Related Documents

- [architecture.md](./architecture.md) — where DB fits in the stack
- [api-contract.md](./api-contract.md) — IPC payloads for playlist operations
- [development-plan.md](./development-plan.md) — migration and repository rollout schedule
