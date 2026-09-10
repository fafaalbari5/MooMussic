# MooMussic Feature Specification

Detailed behavior specifications for MooMussic features. Status labels: **Implemented**, **Partial**, **Planned**.

---

## 1. Search Music

**Status:** Partial

### Description

Users search for tracks across configured music providers. Results are merged and displayed in a single list.

### User Stories

- As a user, I want to search by song title or artist so I can find music quickly.
- As a user, I want to see which provider a result comes from.

### Flow

```
User enters query → clicks Search
  → Renderer calls api.searchAll(query)
  → Main aggregates resolver results (parallel)
  → Renderer renders <ul id="results">
```

### Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| S-01 | Empty query shows no results or validation message | Partial |
| S-02 | YouTube returns real metadata (title, thumbnail, id) | Implemented |
| S-03 | SoundCloud returns real results | Planned (mock today) |
| S-04 | Results show `title` and `source` | Implemented |
| S-05 | Clicking result starts playback | Implemented |
| S-06 | Provider failures do not block other providers | Partial |
| S-07 | Duplicate tracks across providers are deduplicated | Planned |

### UI Elements

- `#search` — text input
- Search button → `search()`
- `#results` — result list with play on title click, `+` to add to playlist

### Edge Cases

- Network timeout → show error, empty partial results
- No results → display empty state message (planned)
- Very long titles → truncate with ellipsis in UI (planned)

---

## 2. Audio Playback

**Status:** Partial

### Description

Users play, pause, skip, and seek within the current track using HTML5 Audio.

### User Stories

- As a user, I want to play and pause music.
- As a user, I want to skip to next/previous track in my current list.
- As a user, I want to seek within a track.

### Controls

| Control | Element / Function | Status |
|---------|-------------------|--------|
| Play / Pause | `togglePlay()` | Implemented |
| Next | `nextSong()` | Implemented (playlist-bound) |
| Previous | `prevSong()` | Implemented (playlist-bound) |
| Seekbar | `#progress` range input | Implemented |
| Time display | `#time` | Implemented |
| Volume | — | Planned |
| Shuffle | — | Planned |
| Repeat | — | Planned |

### Playback Initiation

1. **From search:** click track title → `getStream` → set `audio.src` → `play()`
2. **From playlist:** `playFromPlaylist(index)` → same stream flow → update `#nowPlaying`

### Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| P-01 | Play/pause toggles audio state | Implemented |
| P-02 | Track end auto-advances to next | Implemented |
| P-03 | Seekbar reflects playback position | Implemented |
| P-04 | Seeking updates `audio.currentTime` | Implemented |
| P-05 | Real stream URL from provider | Planned |
| P-06 | Now playing shows title and artwork | Partial (title only) |
| P-07 | Playback continues when switching playlist view | N/A today |

### Edge Cases

- `getStream` returns null → alert "Stream tidak tersedia"
- Audio not loaded → progress shows 0:00
- Rapid skip → cancel in-flight stream requests (planned)

---

## 3. Playlist Management

**Status:** Implemented (basic CRUD)

### Description

Users create named playlists, add tracks from search, view contents, play tracks, and remove tracks.

### User Stories

- As a user, I want to create playlists to organize music.
- As a user, I want to add search results to a playlist.
- As a user, I want to view and play tracks in a playlist.
- As a user, I want to remove tracks I no longer want.

### Operations

| Operation | API | UI | Status |
|-----------|-----|-----|--------|
| Create | `createPlaylist(name)` | `#playlistName` + button | Implemented |
| List | `getPlaylists()` | `#playlists` | Implemented |
| View tracks | `getPlaylistTracks(id)` | `#playlistTracks` | Implemented |
| Add track | `addTrack(playlistId, track)` | Modal `#playlistModal` | Implemented |
| Delete track | `deleteTrack(rowId)` | Confirm `#confirmModal` | Implemented |
| Rename playlist | — | — | Planned |
| Delete playlist | — | — | Planned |
| Reorder tracks | — | — | Planned |

### Add to Playlist Flow

```
User clicks "+" on search result
  → selectedTrackForPlaylist = track
  → openPlaylistModal()
  → user picks playlist
  → api.addTrack(playlistId, track)
  → modal closes
```

### Delete Track Flow

```
User clicks ❌ on playlist track
  → openConfirmModal(track)
  → user confirms
  → api.deleteTrack(track.id)  // row id
  → refresh playlist view
```

### Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| PL-01 | Playlist persists after app restart | Implemented |
| PL-02 | Added track retains title, source, thumbnail | Implemented |
| PL-03 | Active track highlighted in list | Implemented |
| PL-04 | `platform` stored for playback from playlist | Planned |
| PL-05 | Duplicate add allowed (may add dedup later) | Implemented |

---

## 4. Queue System

**Status:** Partial

### Description

A Spotify-like queue holds upcoming tracks independent of the playlist being browsed. Supports play order, next/previous, and (target) manual reorder.

### Current Behavior

- Next/previous operate on **`currentPlaylist`** in renderer when user is viewing a playlist.
- `playerService` in main maintains `queue` and `currentIndex` but renderer does not use `set-queue` IPC.

### Target Behavior

| Capability | Description |
|------------|-------------|
| Play All | Populate queue from playlist without replacing playlist view state |
| Queue panel | Show now playing + upcoming |
| Play Next | Insert track after current |
| Add to Queue | Append to end |
| Remove from queue | Skip without deleting from playlist |
| Reorder | Drag to reorder upcoming |
| Independence | Changing sidebar selection does not clear queue |

### Acceptance Criteria (Target)

| ID | Criterion | Status |
|----|-----------|--------|
| Q-01 | `setQueue` exposed via preload | Planned |
| Q-02 | Next/prev use main-process queue | Planned |
| Q-03 | Queue survives playlist navigation | Planned |
| Q-04 | UI shows queue contents | Planned |
| Q-05 | Manual reorder persists until played | Planned |

---

## 5. Provider Resolution

**Status:** Partial

### YouTube

| Capability | Status |
|------------|--------|
| Search via `yt-search` | Implemented |
| Stream URL | Dummy MP3 (MVP) |

### SoundCloud

| Capability | Status |
|------------|--------|
| Search | Mock single result |
| Stream URL | Dummy MP3 (MVP) |

### Resolver Contract

Every provider implements search + `getStreamUrl`. See [api-contract.md](./api-contract.md).

---

## 6. User Interface

**Status:** Partial (functional MVP)

### Current Layout (`index.html`)

- Search section
- Playlist create + list
- Playlist detail tracks
- Player bar (now playing, transport, progress, audio element)
- Modals: playlist picker, delete confirm

### Target Layout

| Section | Content |
|---------|---------|
| Sidebar | Home, search, library, playlist list |
| Main | Search results or playlist/detail views |
| Queue drawer | Upcoming tracks |
| Player bar | Artwork, metadata, controls, volume |

### Theme

- Default: dark
- Typography: system UI stack (target: custom brand fonts)
- Responsive: minimum window 900×600 (planned)

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Offline playlists | View saved playlists without network |
| Offline playback | Requires cached/local files (Phase 4) |
| Performance | UI remains responsive during search |
| Privacy | No account required in MVP |
| Localization | Indonesian UI strings present; i18n framework planned |

---

## 8. Out of Scope (MVP)

- User authentication
- Social sharing
- Lyrics
- Equalizer
- Video playback
- Mobile apps

---

## Feature Traceability Matrix

| Feature | Renderer | IPC | Service | Resolver | DB |
|---------|----------|-----|---------|----------|-----|
| Search | `search()` | `search-all` | — | `searchAll` | — |
| Play stream | click handler | `get-stream` | — | `getStreamUrl` | — |
| Create playlist | `createPlaylist()` | `create-playlist` | `playlist` | — | ✓ |
| List playlists | `loadPlaylists()` | `get-playlists` | `playlist` | — | ✓ |
| Add track | modal | `add-track` | `playlist` | — | ✓ |
| Delete track | confirm | `delete-track` | `playlist` | — | ✓ |
| Queue | — | `set-queue` | `player` | — | — |

---

## Related Documents

- [api-contract.md](./api-contract.md) — IPC payloads
- [roadmap.md](./roadmap.md) — phase planning
- [product-requirements-document.md](./product-requirements-document.md) — product-level requirements
