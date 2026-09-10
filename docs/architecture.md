# MooMussic Architecture

## Overview

MooMussic is a desktop music player built on Electron. It follows a **multi-process architecture** with strict separation between the renderer (UI), preload bridge (IPC surface), and main process (business logic, database, and provider access).

The design goal is to evolve from the current MVP into a **production-grade, provider-extensible** music platform without rewriting core boundaries.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer Process                          │
│  index.html · style.css · renderer.js                           │
│  - UI rendering & user interaction                               │
│  - HTML5 Audio playback                                          │
│  - No direct DB or provider access                               │
└────────────────────────────┬────────────────────────────────────┘
                             │ window.api (contextBridge)
┌────────────────────────────▼────────────────────────────────────┐
│                        Preload Script                            │
│  preload.js                                                      │
│  - Exposes typed IPC invoke wrappers                             │
│  - contextIsolation: true                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ ipcRenderer.invoke / ipcMain.handle
┌────────────────────────────▼────────────────────────────────────┐
│                         Main Process                             │
│  main.js                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Services   │  │  Resolvers   │  │     Database         │  │
│  │  playlist    │  │  youtube     │  │  better-sqlite3      │  │
│  │  player*     │  │  soundcloud  │  │  moomuss.db          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         YouTube API    SoundCloud API   Future providers
```

\* `playerService` exists in code but is not fully wired from renderer to main process yet (see [Known Gaps](#known-gaps)).

---

## Architectural Principles

| Principle | Description |
|-----------|-------------|
| **Modular architecture** | Features are grouped by domain (search, playback, playlist, queue). |
| **Provider-based sources** | Each music source implements a common resolver interface. |
| **Separation of concerns** | UI, orchestration, persistence, and external APIs live in separate layers. |
| **Service layer pattern** | Main process services own business rules and coordinate resolvers/DB. |
| **Repository pattern (future)** | Data access will be abstracted behind repositories instead of raw SQL in services. |
| **IPC-only renderer access** | Renderer never imports Node modules or touches SQLite directly. |

---

## Process Responsibilities

### Renderer Process

- Renders Spotify-inspired layout (target; current UI is functional MVP).
- Handles search input, playlist UI, modals, and transport controls.
- Owns **HTML5 `<audio>`** element and local playback state (`isPlaying`, seek position).
- Calls `window.api.*` for all backend operations.

**Must not:**

- Access `better-sqlite3` or filesystem-backed DB.
- Call YouTube/SoundCloud APIs directly.
- Use `nodeIntegration`.

### Preload Bridge

- Single entry point: `contextBridge.exposeInMainWorld("api", { ... })`.
- Maps each UI call to one `ipcRenderer.invoke(channel, ...)` handler.
- Keeps the attack surface minimal; only whitelisted methods are exposed.

### Main Process

- Creates `BrowserWindow` with secure `webPreferences`.
- Registers `ipcMain.handle` channels.
- Routes requests to **services** (playlist, player) and **resolvers** (search/stream).
- Owns SQLite connection lifecycle.

---

## Layer Model

### 1. Presentation Layer (Renderer)

Files: `index.html`, `style.css`, `renderer.js`

Responsible for DOM, events, and visual feedback. Playback queue state is currently **partially client-side** (`currentPlaylist`, `currentIndex` in `renderer.js`) rather than fully driven by main-process `playerService`.

### 2. IPC Contract Layer (Preload + Main handlers)

Files: `preload.js`, IPC registration in `main.js`

Defines the stable API between processes. See [api-contract.md](./api-contract.md).

### 3. Service Layer

| Service | File | Responsibility |
|---------|------|----------------|
| Playlist | `src/services/playlist.js` | CRUD for playlists and playlist tracks |
| Player | `src/services/playerservices.js` | Queue, next/prev, stream resolution orchestration |
| Search (legacy) | `src/services/search.js` | Duplicate of resolver aggregation; **deprecated** |

Services should remain thin: validate input, call DB or resolvers, return normalized DTOs.

### 4. Resolver Layer (Provider Abstraction)

Files: `src/resolvers/index.js`, `src/resolvers/youtubeResolver.js`, `src/resolvers/soundcloudResolver.js`

The resolver layer is the **provider plugin boundary**. Each provider implements:

| Method | Purpose |
|--------|---------|
| `search(query)` | Return normalized track list |
| `getStreamUrl(track)` | Resolve playable URL for a track |
| `getTrack(id)` *(planned)* | Fetch single track metadata |

The aggregator (`resolvers/index.js`) fans out search in parallel and routes stream requests by `track.platform`.

### 5. Data Layer

File: `src/db/database.js`

- SQLite via `better-sqlite3` (synchronous, main-process only).
- Schema bootstrap on startup (`CREATE TABLE IF NOT EXISTS`).
- Future: migrate to repository modules under `src/repositories/`.

---

## Data Flow

### Search Flow

```
User types query
  → renderer.search()
  → window.api.searchAll(query)
  → ipcMain "search-all"
  → resolver.searchAll()
      → Promise.all([youtube.searchYouTube, soundcloud.searchSoundCloud])
  → merged Track[] returned to renderer
  → DOM list rendered
```

### Playback Flow (Current MVP)

```
User clicks track
  → window.api.getStream(track)
  → ipcMain "get-stream"
  → resolver.getStreamUrl(track)  [platform switch]
  → dummy MP3 URL (MVP)
  → audio.src = url; audio.play()
```

### Playlist Flow

```
createPlaylist / addTrack / getPlaylistTracks / deleteTrack
  → IPC
  → playlist service
  → prepared SQL statements
  → SQLite
```

### Target Queue Flow (Not fully implemented)

```
User plays album or "Play All"
  → window.api.setQueue(tracks, startIndex)   [IPC exists]
  → playerService.setQueue()
  → renderer requests stream per track via getStream
  → next/prev consult main-process queue (planned)
```

---

## Track Normalization Contract

All resolvers must return tracks in a **normalized shape** so the UI and DB stay provider-agnostic:

```javascript
{
  id: string,           // provider-specific ID
  title: string,
  thumbnail?: string,
  duration?: string,
  source: string,       // display label: "YouTube", "SoundCloud"
  platform: string      // routing key: "youtube", "soundcloud"
}
```

Playlist persistence stores `track_id`, `title`, `source`, `thumbnail` (see [database.md](./database.md)).

---

## Security Model

| Setting | Value | Rationale |
|---------|-------|-----------|
| `contextIsolation` | `true` | Prevents renderer from tampering with Node/Electron internals |
| `nodeIntegration` | `false` | Blocks direct `require()` in renderer |
| Preload whitelist | `window.api` only | Minimal exposed surface |

Future considerations:

- Validate all IPC payloads in main process.
- Sanitize playlist names and search queries.
- Store API keys (if any) in main process or OS keychain, never in renderer.

---

## Extensibility: Adding a Provider

1. Create `src/resolvers/<provider>Resolver.js` implementing search + getStreamUrl.
2. Register in `src/resolvers/index.js` (`searchAll` parallel call + `getStreamUrl` switch).
3. Add IPC only if new capabilities are needed (most providers reuse existing channels).
4. Document platform key and track shape in [api-contract.md](./api-contract.md).

Planned providers: local library, internet radio, podcast, cloud storage, self-hosted media server.

---

## UI Architecture (Target)

Desktop-first, dark theme, Spotify-inspired regions:

| Region | Purpose |
|--------|---------|
| Sidebar | Navigation, library, playlists |
| Search | Query + results |
| Main content | Playlist detail, album/artist views (future) |
| Queue panel | Upcoming tracks, reorder (future) |
| Now playing bar | Transport, progress, volume, metadata |

Current MVP collapses these into a single-page layout in `index.html`.

---

## Known Gaps (MVP vs Target)

| Area | Current State | Target |
|------|---------------|--------|
| Stream URLs | Dummy MP3 from SoundHelix | Real provider streaming |
| SoundCloud | Mock search results | Official or third-party API |
| Queue | Client-side playlist index; `set-queue` IPC unused in renderer | Main-process queue independent of playlist |
| Player service | Defined but not imported in `main.js` for `set-queue` | Fully wired IPC + renderer integration |
| Legacy services | `src/services/youtube.js`, `soundcloud.js`, `search.js` | Remove or consolidate into resolvers |
| Repository pattern | Raw SQL in playlist service | Dedicated repository modules |
| Error handling | Minimal alerts | Structured errors over IPC |

These gaps are intentional MVP shortcuts and are tracked in [roadmap.md](./roadmap.md) and [development-plan.md](./development-plan.md).

---

## Technology Choices

| Component | Choice | Notes |
|-----------|--------|-------|
| Desktop shell | Electron 42+ | Cross-platform desktop |
| UI | HTML/CSS/Vanilla JS | No framework yet; may adopt component model later |
| Database | SQLite + better-sqlite3 | Embedded, local-first |
| YouTube search | yt-search | Metadata only; stream extraction TBD |
| Audio | HTML5 Audio | Sufficient for MVP; consider Web Audio API for effects later |

---

## Related Documents

- [folder-structure.md](./folder-structure.md) — file layout and module ownership
- [api-contract.md](./api-contract.md) — IPC channels and payloads
- [database.md](./database.md) — schema and migrations
- [feature-specification.md](./feature-specification.md) — feature behavior
- [development-plan.md](./development-plan.md) — implementation sequencing
