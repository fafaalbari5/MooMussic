# MooMussic Product Requirements Document (PRD)

**Product:** MooMussic  
**Version:** 1.0 (MVP) → 2.0 (Production target)  
**Document status:** Living document  
**Last updated:** 2026

---

## 1. Executive Summary

MooMussic is a desktop music player inspired by Spotify and YouTube Music. It enables users to search music from multiple online sources, play tracks, manage playlists, and control playback through a queue — all stored locally without requiring an account in the MVP phase.

The product will evolve from a functional MVP into a production-grade, provider-extensible desktop music platform.

---

## 2. Problem Statement

Music is fragmented across platforms (YouTube, SoundCloud, local files, etc.). Users want a **single desktop app** to search, play, and organize music without switching browser tabs or being locked to one subscription service.

### Pain Points

- No unified search across streaming sources
- Browser-based listening lacks desktop player UX (queue, shortcuts, persistence)
- Playlist data trapped in individual platforms
- Local and streaming libraries are rarely combined

---

## 3. Goals & Non-Goals

### Goals

| ID | Goal |
|----|------|
| G-01 | Provide fast multi-source music search |
| G-02 | Deliver reliable desktop playback with standard controls |
| G-03 | Persist user playlists locally (privacy-first) |
| G-04 | Support a Spotify-like queue independent of playlists |
| G-05 | Architect for easy addition of new music providers |
| G-06 | Ship a polished dark-theme desktop UI |

### Non-Goals (MVP)

| ID | Non-Goal |
|----|----------|
| NG-01 | User accounts and cloud sync |
| NG-02 | Music licensing or content hosting |
| NG-03 | Mobile applications |
| NG-04 | Social features (sharing, collaborative playlists) |
| NG-05 | Video playback as primary experience |

---

## 4. Target Users

### Primary Persona: Casual Desktop Listener

- Listens while working or studying
- Uses YouTube or SoundCloud for discovery
- Wants simple playlists and queue control
- Values free, local-first storage

### Secondary Persona: Power User / Collector

- Large local music library (Phase 4)
- Wants smart playlists, favorites, recently played
- Cares about keyboard shortcuts and metadata

### Tertiary Persona: Self-Hoster (Future)

- Runs Jellyfin/Navidrome
- Wants one client for self-hosted + streaming sources

---

## 5. Product Scope by Phase

### Phase 1 — MVP (Current → Complete)

**Must have:**

- Search (YouTube + SoundCloud)
- Play / pause / next / previous
- Seekbar and elapsed time
- Create playlist, add/view/delete tracks
- Local SQLite persistence
- Basic queue (main-process backed)

**Success metrics:**

- User completes search → play → save to playlist in < 2 minutes
- Zero renderer-to-DB violations
- Playback works for ≥ 1 real provider stream

### Phase 2 — Player Parity

Shuffle, repeat, volume, queue UI, keyboard shortcuts, improved now-playing metadata.

### Phase 3 — Library

Playlist CRUD completion, favorites, recently played, album/artist views, cover art polish.

### Phase 4 — Sources Expansion

Local scanner, radio, podcasts, lyrics, offline downloads.

### Phase 5 — Platform

Accounts, sync, auto-update, plugin SDK, enterprise-ready logging.

See [roadmap.md](./roadmap.md) for full detail.

---

## 6. Functional Requirements

### FR-01: Search

| Req | Description | Priority | MVP |
|-----|-------------|----------|-----|
| FR-01.1 | User can search by text query | P0 | Yes |
| FR-01.2 | Results from multiple providers in one list | P0 | Yes |
| FR-01.3 | Each result shows title and source | P0 | Yes |
| FR-01.4 | User can play from search results | P0 | Yes |
| FR-01.5 | User can add search result to playlist | P0 | Yes |
| FR-01.6 | Graceful degradation if one provider fails | P1 | Partial |

### FR-02: Playback

| Req | Description | Priority | MVP |
|-----|-------------|----------|-----|
| FR-02.1 | Play and pause | P0 | Yes |
| FR-02.2 | Next and previous track | P0 | Yes |
| FR-02.3 | Seek within track | P0 | Yes |
| FR-02.4 | Auto-advance on track end | P0 | Yes |
| FR-02.5 | Display now playing title | P1 | Yes |
| FR-02.6 | Real provider audio stream | P0 | No (dummy) |
| FR-02.7 | Volume control | P2 | No |
| FR-02.8 | Shuffle and repeat | P2 | No |

### FR-03: Playlists

| Req | Description | Priority | MVP |
|-----|-------------|----------|-----|
| FR-03.1 | Create named playlist | P0 | Yes |
| FR-03.2 | List all playlists | P0 | Yes |
| FR-03.3 | View tracks in playlist | P0 | Yes |
| FR-03.4 | Play tracks from playlist | P0 | Yes |
| FR-03.5 | Remove track from playlist | P0 | Yes |
| FR-03.6 | Rename playlist | P2 | No |
| FR-03.7 | Delete playlist | P2 | No |
| FR-03.8 | Reorder tracks | P3 | No |

### FR-04: Queue

| Req | Description | Priority | MVP |
|-----|-------------|----------|-----|
| FR-04.1 | Queue holds upcoming tracks | P0 | Partial |
| FR-04.2 | Queue independent from playlist view | P1 | No |
| FR-04.3 | Visible queue panel | P2 | No |
| FR-04.4 | Manual reorder | P3 | No |

### FR-05: Data

| Req | Description | Priority | MVP |
|-----|-------------|----------|-----|
| FR-05.1 | Playlists persist across sessions | P0 | Yes |
| FR-05.2 | Data stored locally in SQLite | P0 | Yes |
| FR-05.3 | No account required | P0 | Yes |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Security | contextIsolation; no nodeIntegration in renderer |
| NFR-02 | Privacy | No telemetry in MVP; local data by default |
| NFR-03 | Performance | Search results < 3s typical on broadband |
| NFR-04 | Reliability | App recovers from failed stream without crash |
| NFR-05 | Maintainability | Provider logic isolated in resolvers |
| NFR-06 | Portability | Windows primary; macOS/Linux via Electron |
| NFR-07 | Accessibility | Keyboard navigable controls (Phase 2) |

---

## 8. User Experience Requirements

| ID | Requirement |
|----|-------------|
| UX-01 | Dark theme default |
| UX-02 | Desktop-first layout (sidebar + content + player bar) |
| UX-03 | Minimal clicks: search → play in ≤ 2 clicks |
| UX-04 | Confirm destructive actions (delete track) |
| UX-05 | Indonesian copy acceptable for dialogs; English for dev docs |

---

## 9. Technical Constraints

| Constraint | Detail |
|------------|--------|
| Framework | Electron |
| UI | HTML, CSS, Vanilla JS (MVP) |
| Database | SQLite via better-sqlite3 (main process only) |
| IPC | All renderer ↔ backend via preload bridge |
| Providers | YouTube (yt-search), SoundCloud (TBD API) |

---

## 10. Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube stream extraction ToS/legal | High | Evaluate compliant APIs; document limitations |
| SoundCloud API access | Medium | Official API or partner solution |
| Electron app size | Low | Tree-shake; lazy load providers |
| Native module build (sqlite) | Medium | Document build tools; use prebuilds |
| Technical debt (legacy services) | Medium | Consolidate in Phase 1 |

---

## 11. Metrics & KPIs

### MVP Launch

| Metric | Target |
|--------|--------|
| DAU (internal/beta) | Qualitative feedback |
| Core flow completion rate | > 80% in user testing |
| Crash rate | < 1% sessions |

### Production

| Metric | Target |
|--------|--------|
| Cold start time | < 3s |
| Search p95 latency | < 2s |
| Retention (7-day) | Track post-Phase 2 |

---

## 12. Open Questions

1. Which YouTube stream strategy is acceptable (legal + stable)?
2. SoundCloud: official API vs alternative metadata source?
3. When to introduce TypeScript?
4. Branding: finalize name (MusicHub vs MooMussic) in UI?
5. Monetization model (if any) — donation, premium providers, none?

---

## 13. Acceptance Criteria for MVP Exit

- [ ] Real audio stream from YouTube (not dummy MP3)
- [ ] Playlist add/play/delete works after restart
- [ ] Queue managed in main process and used by renderer
- [ ] `platform` persisted for playlist playback
- [ ] Legacy duplicate services removed
- [ ] Documentation complete in `docs/`
- [ ] No critical security violations (renderer isolation)

---

## 14. References

- [feature-specification.md](./feature-specification.md)
- [architecture.md](./architecture.md)
- [roadmap.md](./roadmap.md)
- [development-plan.md](./development-plan.md)
