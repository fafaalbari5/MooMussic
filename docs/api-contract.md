# MooMussic API Contract

## Overview

MooMussic uses **Electron IPC** as the sole communication channel between the renderer and main process. The renderer accesses backend capabilities exclusively through `window.api`, exposed by `preload.js` via `contextBridge`.

All channels use **`ipcMain.handle` / `ipcRenderer.invoke`** (request/response, Promise-based).

---

## Design Rules

1. **Renderer never calls Node APIs directly.**
2. **Channel names are kebab-case** strings.
3. **Payloads must be JSON-serializable** (no functions, no class instances).
4. **Track objects** use the normalized shape defined below.
5. **Breaking changes** require version suffix or migration (e.g. `search-all-v2`) — not needed in MVP.

---

## Exposed Renderer API

Defined in `preload.js` as `window.api`:

| Method | IPC Channel | Direction |
|--------|-------------|-----------|
| `searchAll(query)` | `search-all` | Renderer → Main |
| `getStream(track)` | `get-stream` | Renderer → Main |
| `createPlaylist(name)` | `create-playlist` | Renderer → Main |
| `getPlaylists()` | `get-playlists` | Renderer → Main |
| `addTrack(playlistId, track)` | `add-track` | Renderer → Main |
| `getPlaylistTracks(playlistId)` | `get-playlist-tracks` | Renderer → Main |
| `deleteTrack(trackId)` | `delete-track` | Renderer → Main |

### Planned (partially implemented in main, not in preload)

| Method | IPC Channel | Status |
|--------|-------------|--------|
| `setQueue(tracks, startIndex)` | `set-queue` | Registered in `main.js`; not exposed in preload |
| `playNext()` | `player-next` | Not implemented |
| `playPrev()` | `player-prev` | Not implemented |
| `getCurrentTrack()` | `player-current` | Not implemented |

---

## Shared Types

### Track (Search / Playback)

Normalized track returned by resolvers and consumed by renderer:

```typescript
interface Track {
  id: string;              // Provider-specific ID (e.g. YouTube videoId)
  title: string;
  thumbnail?: string;
  duration?: string;       // Human-readable, e.g. "3:45"
  source: string;          // Display: "YouTube", "SoundCloud"
  platform: string;        // Router key: "youtube", "soundcloud"
}
```

**Example — YouTube:**

```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/vi/.../hqdefault.jpg",
  "duration": "3:32",
  "source": "YouTube",
  "platform": "youtube"
}
```

### Playlist

```typescript
interface Playlist {
  id: number;
  name: string;
}
```

### PlaylistTrack (Database row)

```typescript
interface PlaylistTrack {
  id: number;              // Row ID (for delete)
  playlist_id: number;
  title: string;
  artist: string | null;
  source: string;
  track_id: string | null;
  thumbnail: string | null;
}
```

**Gap:** `platform` is not persisted. Stream resolution from playlist should add `platform` column or map from `source`.

### RunResult (better-sqlite3)

Mutations return SQLite run metadata:

```typescript
interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}
```

---

## Channel Specifications

### `search-all`

Search all registered music providers in parallel.

**Invoke:**

```javascript
window.api.searchAll("lofi hip hop")
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | `string` | Yes | Search text |

**Returns:** `Track[]`

**Errors (current):** Unhandled provider errors may reject the Promise. **Target:** return partial results with per-provider error metadata.

**Main handler:**

```javascript
ipcMain.handle("search-all", (_, q) => resolver.searchAll(q));
```

---

### `get-stream`

Resolve a playable stream URL for a track.

**Invoke:**

```javascript
const url = await window.api.getStream(track);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `track` | `Track` or `PlaylistTrack` | Yes | Must include routable `platform` or derivable source |

**Returns:** `string | null` — URL suitable for `HTMLAudioElement.src`

**MVP behavior:** Returns dummy MP3 URLs from SoundHelix for testing.

**Target behavior:** Provider-specific stream URL or signed redirect URL.

**Main handler:**

```javascript
ipcMain.handle("get-stream", async (_, track) => resolver.getStreamUrl(track));
```

**Routing logic (`resolvers/index.js`):**

| `track.platform` | Resolver |
|------------------|----------|
| `"youtube"` | `youtubeResolver.getStreamUrl` |
| `"soundcloud"` | `soundcloudResolver.getStreamUrl` |
| other / missing | `null` |

---

### `create-playlist`

**Invoke:**

```javascript
await window.api.createPlaylist("My Playlist")
```

| Parameter | Type | Required |
|-----------|------|----------|
| `name` | `string` | Yes |

**Returns:** `RunResult`

---

### `get-playlists`

**Invoke:**

```javascript
const playlists = await window.api.getPlaylists();
```

**Returns:** `Playlist[]`

---

### `add-track`

Add a search result track to a playlist.

**Invoke:**

```javascript
await window.api.addTrack(playlistId, track);
```

| Parameter | Type | Required |
|-----------|------|----------|
| `playlistId` | `number` | Yes |
| `track` | `Track` | Yes |

**Field mapping to DB:**

| Track field | DB column |
|-------------|-----------|
| `title` | `title` |
| `source` | `source` |
| `id` | `track_id` |
| `thumbnail` | `thumbnail` |

**Returns:** `RunResult`

---

### `get-playlist-tracks`

**Invoke:**

```javascript
const tracks = await window.api.getPlaylistTracks(playlistId);
```

| Parameter | Type | Required |
|-----------|------|----------|
| `playlistId` | `number` | Yes |

**Returns:** `PlaylistTrack[]`

---

### `delete-track`

Delete a row from `playlist_tracks` (not the provider track).

**Invoke:**

```javascript
await window.api.deleteTrack(trackRowId);
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `trackId` | `number` | Yes | `playlist_tracks.id` |

**Returns:** `RunResult`

---

### `set-queue` (Planned integration)

Set the main-process playback queue.

**Invoke (planned):**

```javascript
await window.api.setQueue(tracks, startIndex);
```

| Parameter | Type | Required | Default |
|-----------|------|----------|---------|
| `tracks` | `Track[]` | Yes | — |
| `startIndex` | `number` | No | `0` |

**Returns:** `boolean` (`true` on success)

**Note:** Currently registered in `main.js` but `player` module is not imported; renderer does not call this channel.

---

## Resolver Interface (Internal)

Each provider resolver should implement:

```typescript
interface MusicResolver {
  search(query: string): Promise<Track[]>;
  getStreamUrl(track: Track): Promise<string | null>;
  getTrack?(id: string): Promise<Track | null>;  // future
}
```

**Aggregator (`resolvers/index.js`):**

```typescript
searchAll(query: string): Promise<Track[]>
getStreamUrl(track: Track): Promise<string | null>
```

---

## Target Response Envelope (Future)

Standardize IPC responses for consistent error handling:

```typescript
interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

Example:

```json
{
  "ok": false,
  "error": {
    "code": "STREAM_UNAVAILABLE",
    "message": "Could not resolve stream for this track"
  }
}
```

---

## Versioning Strategy

| Stage | Approach |
|-------|----------|
| MVP | Implicit v1; no version field |
| Beta | Add `apiVersion` in preload exposure |
| Production | Channel suffix or header for breaking changes |

---

## Security Notes

- Validate `playlistId` and `trackId` are positive integers before SQL.
- Reject oversized strings (playlist name, query length cap).
- Never return filesystem paths or env secrets over IPC.
- Stream URLs should be HTTPS where possible.

---

## Related Documents

- [architecture.md](./architecture.md) — IPC layer in system design
- [feature-specification.md](./feature-specification.md) — user-visible behavior per feature
- [coding-standards.md](./coding-standards.md) — how to add new channels
