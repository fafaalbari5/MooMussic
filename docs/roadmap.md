# MooMussic Roadmap

This roadmap describes the evolution from the current **MVP** to a **production-grade desktop music platform**. Timelines are indicative and should be adjusted based on team capacity.

---

## Vision

A modular, provider-extensible desktop music player that feels familiar (Spotify / YouTube Music–inspired) while supporting multiple sources, local-first data, and optional cloud sync.

---

## Current State (MVP) — ✅ Partial

| Capability | Status | Notes |
|------------|--------|-------|
| Multi-provider search (UI) | ✅ | YouTube via `yt-search`; SoundCloud mocked |
| Playback (play/pause/next/prev) | ✅ | HTML5 Audio |
| Seekbar & time display | ✅ | Basic range input |
| Playlist create / list | ✅ | SQLite |
| Add track to playlist | ✅ | Modal selection |
| View / play playlist tracks | ✅ | Client-side index for next/prev |
| Delete track from playlist | ✅ | Confirm modal |
| Real streaming | ❌ | Dummy MP3 URLs |
| Main-process queue | ⚠️ | Service + IPC exist; renderer not integrated |
| Spotify-like UI | ❌ | Functional layout only |
| Shuffle / repeat / volume | ❌ | Not implemented |

---

## Phase 1 — Core MVP Completion

**Goal:** Reliable search, playback, playlist, and queue with real provider streams.

| Item | Priority | Description |
|------|----------|-------------|
| Wire `playerService` end-to-end | P0 | Fix main import; expose next/prev/getCurrent via IPC |
| Unified queue in main process | P0 | Queue independent from active playlist view |
| Persist `platform` on playlist tracks | P0 | Required for stream routing from saved tracks |
| Real YouTube stream resolution | P0 | Replace dummy MP3 (ytdl, invidious, or approved API) |
| SoundCloud search & stream | P1 | Real API or scraper with rate limits |
| Remove legacy `src/services/search.js` | P1 | Consolidate on resolver layer |
| Structured IPC errors | P1 | `{ ok, data, error }` response shape |
| Move DB to `userData` path | P2 | Per-user persistent storage |

**Exit criteria:** User can search, play, queue, and save playlists with real audio from at least YouTube.

---

## Phase 2 — Player Experience

**Goal:** Match baseline expectations of modern music apps.

| Item | Priority | Description |
|------|----------|-------------|
| Shuffle | P1 | Randomized queue order with undo |
| Repeat (off / all / one) | P1 | Standard modes |
| Volume control | P1 | Slider + mute; persist preference |
| Seekbar improvements | P1 | Buffered progress, click-to-seek on bar |
| Keyboard shortcuts | P2 | Space, arrows, media keys |
| Now playing metadata | P1 | Artwork, title, artist, duration |
| Queue UI panel | P1 | View upcoming, remove, play next |
| Manual queue reorder | P2 | Drag-and-drop |

**Exit criteria:** Playback UX is comparable to basic Spotify desktop controls.

---

## Phase 3 — Library & Discovery

**Goal:** Rich browsing beyond flat playlists.

| Item | Priority | Description |
|------|----------|-------------|
| Playlist rename & delete | P1 | Full CRUD |
| Reorder playlist tracks | P2 | Persist order column |
| Album view | P2 | When metadata available |
| Artist view | P2 | Aggregation by artist |
| Cover art everywhere | P1 | Thumbnails in lists and player bar |
| Recently played | P2 | `play_history` table |
| Favorites / liked songs | P2 | Heart toggle |
| Search filters | P2 | By source, duration, etc. |

**Exit criteria:** Users can organize and rediscover music without relying only on search.

---

## Phase 4 — Local & Extended Sources

**Goal:** Support owned media and non-streaming content.

| Item | Priority | Description |
|------|----------|-------------|
| Local music scanner | P1 | Folder watch, ID3 tags |
| Local provider resolver | P1 | `file://` or served blob URLs |
| Internet radio | P2 | Station list + stream URLs |
| Podcast provider | P3 | RSS + episode playback |
| Lyrics display | P3 | Synced or static |
| Downloaded tracks | P3 | Offline cache with consent |
| Smart playlists | P3 | Rule-based auto playlists |

**Exit criteria:** App works as primary player for both streaming and local files.

---

## Phase 5 — Account, Sync & Scale

**Goal:** Multi-device and production operations.

| Item | Priority | Description |
|------|----------|-------------|
| User accounts | P2 | Auth provider TBD |
| Cloud backup | P2 | Playlists, favorites, settings |
| Multi-device sync | P3 | Conflict resolution |
| Auto-update | P1 | electron-updater |
| Crash reporting | P2 | Opt-in telemetry |
| Plugin SDK for providers | P3 | Third-party resolver registration |
| Self-hosted media server | P3 | Jellyfin / Navidrome adapter |

**Exit criteria:** Safe updates, optional sync, extensible provider ecosystem.

---

## UI Roadmap

| Milestone | Description |
|-----------|-------------|
| M1 | Dark theme, sidebar + main + player bar layout |
| M2 | Componentized CSS (BEM or CSS modules) |
| M3 | Responsive breakpoints for small windows |
| M4 | Optional light theme |
| M5 | Consider lightweight framework if UI complexity warrants |

---

## Technical Debt Register

| ID | Item | Phase to address |
|----|------|------------------|
| TD-01 | `main.js` references `player` without import | Phase 1 |
| TD-02 | Duplicate youtube/soundcloud in `services/` vs `resolvers/` | Phase 1 |
| TD-03 | `platform` not stored in DB | Phase 1 |
| TD-04 | No migration system | Phase 1 |
| TD-05 | HTML title still "MusicHub" | Phase 2 UI |
| TD-06 | No automated tests | Phase 2 |
| TD-07 | Search merges providers without ranking/dedup | Phase 2 |

---

## Success Metrics (Production)

| Metric | Target |
|--------|--------|
| Cold start to playable | < 3s |
| Search latency (p95) | < 2s per provider |
| Playback start after click | < 1.5s |
| Crash-free sessions | > 99.5% |
| Playlist operations | < 100ms local |

---

## Related Documents

- [development-plan.md](./development-plan.md) — sprint-level breakdown of Phase 1–2
- [feature-specification.md](./feature-specification.md) — detailed feature behavior
- [product-requirements-document.md](./product-requirements-document.md) — product-level requirements
