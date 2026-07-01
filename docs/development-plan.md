# MooMussic Development Plan

Actionable implementation plan from MVP completion through early production. Assumes a small team (1–3 developers). Adjust sprint length (1–2 weeks) to capacity.

---

## Current Baseline (As-Is)

### Working

- Electron app boots via `npm start`
- IPC: search, stream, playlist CRUD
- YouTube search via `yt-search`
- HTML5 playback with transport + seekbar
- SQLite playlists and tracks

### Broken / Incomplete

| Item | Location | Issue |
|------|----------|-------|
| Player queue IPC | `main.js` | Uses `player` without import |
| Preload queue API | `preload.js` | `setQueue` not exposed |
| Renderer queue | `renderer.js` | Uses local `currentPlaylist` only |
| Playlist playback | DB + resolver | `platform` not stored on add |
| SoundCloud | `soundcloudResolver.js` | Mock data only |
| Streams | resolvers | Dummy SoundHelix MP3 URLs |
| Legacy code | `src/services/search.js` etc. | Duplicates resolvers |

---

## Phase 1: MVP Completion

**Objective:** End-to-end real playback, correct queue wiring, clean architecture.

### Sprint 1.1 — Stability & Wiring (3–5 days)

| Task | Owner | Files | Done when |
|------|-------|-------|-----------|
| Fix player import in main | Dev | `main.js` | `set-queue` handler works without ReferenceError |
| Expose `setQueue` in preload | Dev | `preload.js`, `renderer.js` | Renderer can set main-process queue |
| Add `platform` column migration | Dev | `database.js`, `playlist.js` | New adds persist `platform` |
| Map `platform` on playlist play | Dev | `renderer.js` | Saved tracks resolve stream correctly |
| Remove debug logs | Dev | `search.js` (legacy) | Clean console on start |

**Deliverable:** Queue IPC functional; playlist tracks playable after restart.

### Sprint 1.2 — Real YouTube Streaming (5–8 days)

| Task | Owner | Files | Done when |
|------|-------|-------|-----------|
| Evaluate stream libraries/APIs | Dev | spike doc in PR | Decision recorded with tradeoffs |
| Implement `getStreamUrl` for YouTube | Dev | `youtubeResolver.js` | Real audio plays from search |
| Error handling for unavailable videos | Dev | resolver + renderer | User sees clear message |
| Timeout / retry policy | Dev | resolver | No hung promises |

**Deliverable:** YouTube search → real playback.

### Sprint 1.3 — SoundCloud & Cleanup (5–7 days)

| Task | Owner | Files | Done when |
|------|-------|-------|-----------|
| Integrate SoundCloud search API | Dev | `soundcloudResolver.js` | Real results returned |
| Implement SoundCloud stream | Dev | `soundcloudResolver.js` | Playback works |
| Delete legacy service files | Dev | `src/services/youtube.js`, etc. | No duplicate code paths |
| Standardize on resolver aggregator | Dev | `main.js` | Single search entry point |

**Deliverable:** Two live providers; legacy removed.

### Sprint 1.4 — Data & Polish (3–5 days)

| Task | Owner | Files | Done when |
|------|-------|-------|-----------|
| Move DB to userData | Dev | `database.js`, `main.js` | DB survives app updates in dev |
| Migration runner (minimal) | Dev | `src/db/migrations/` | Schema changes are versioned |
| IPC error envelope (optional) | Dev | handlers, preload | Documented in api-contract |
| Rename UI branding MusicHub → MooMussic | Dev | `index.html` | Consistent product name |

**Phase 1 exit:** All items in PRD MVP acceptance criteria met.

---

## Phase 2: Player Experience

**Objective:** Match baseline desktop player expectations.

### Sprint 2.1 — Transport & Queue UI (1–2 weeks)

| Task | Priority |
|------|----------|
| Queue side panel component | P0 |
| Wire next/prev to main-process queue | P0 |
| "Play All" from playlist | P0 |
| Remove track from queue | P1 |
| Play Next / Add to Queue from search | P1 |

### Sprint 2.2 — Modes & Controls (1 week)

| Task | Priority |
|------|----------|
| Shuffle | P1 |
| Repeat off/all/one | P1 |
| Volume slider + mute | P1 |
| Persist volume in settings table | P2 |

### Sprint 2.3 — UX & Input (1 week)

| Task | Priority |
|------|----------|
| Keyboard shortcuts | P1 |
| Now playing artwork + metadata | P1 |
| Buffered seekbar | P2 |
| Media keys (OS integration) | P2 |

### Sprint 2.4 — UI Layout (2 weeks)

| Task | Priority |
|------|----------|
| Sidebar + main + player bar layout | P0 |
| Dark theme CSS variables | P0 |
| Split renderer into components | P1 |
| Empty states for search/playlists | P2 |

**Phase 2 exit:** Feature parity with basic Spotify desktop controls.

---

## Phase 3: Library Features

**Duration:** ~4–6 weeks

| Workstream | Tasks |
|------------|-------|
| Playlist CRUD | Rename, delete playlist, reorder tracks |
| Discovery | Recently played, favorites |
| Browsing | Album/artist views when metadata exists |
| Search | Filters, sort, provider badges |

**Dependencies:** `play_history` and `favorites` tables (see [database.md](./database.md)).

---

## Phase 4: Local & Extended Sources

**Duration:** ~6–8 weeks

| Workstream | Tasks |
|------------|-------|
| Local library | Folder picker, scanner, ID3 parser |
| Local resolver | `file://` playback |
| Radio | Station list resolver |
| Offline | Cache manager (legal considerations) |

---

## Phase 5: Production Hardening

**Duration:** Ongoing

| Workstream | Tasks |
|------------|-------|
| Packaging | electron-builder, code signing |
| Updates | electron-updater |
| Testing | Unit + integration suite in CI |
| Observability | Crash logs, opt-in analytics |
| Sync | Account system, cloud backup (if product direction confirms) |

---

## Recommended Priority Queue (Next 10 Tasks)

1. Import `playerservices.js` in `main.js`
2. Expose `setQueue` in `preload.js`
3. Integrate renderer with main-process queue for next/prev
4. Add `platform` column to `playlist_tracks`
5. Persist `platform` in `addTrackToPlaylist`
6. Implement real YouTube `getStreamUrl`
7. Remove `src/services/search.js` and legacy provider services
8. Move database path to `userData`
9. Add minimal migration runner
10. Begin sidebar + player bar UI refactor

---

## Testing Strategy Rollout

| Phase | Testing |
|-------|---------|
| MVP (now) | Manual test checklist per PR |
| Phase 1 end | Unit tests for resolvers (mocked) |
| Phase 2 | Integration tests for IPC |
| Phase 3+ | CI on GitHub Actions: lint, test, build |

### Initial test targets

```
tests/resolvers/youtubeResolver.test.js   — normalize search results
tests/services/playlist.test.js           — CRUD against :memory: DB
tests/integration/ipc.test.js             — optional with spectron/playwright
```

---

## CI/CD Milestones

| Milestone | Trigger | Actions |
|-----------|---------|---------|
| M1 | Phase 1 complete | `npm test` on PR |
| M2 | Phase 2 UI | Build artifact on tag |
| M3 | Beta release | Signed installer + auto-update channel |

---

## Resource & Tooling Recommendations

| Need | Tool |
|------|------|
| Issue tracking | GitHub Issues / Projects |
| DB inspection | DB Browser for SQLite |
| API debugging | Postman or curl for provider spikes |
| Electron debugging | DevTools + main process logs |
| Packaging | electron-builder (Phase 5) |

---

## Definition of Done (Per Task)

- [ ] Code follows [coding-standards.md](./coding-standards.md)
- [ ] IPC/schema changes documented
- [ ] Manually tested on target OS
- [ ] No new renderer security violations
- [ ] PR reviewed and merged

---

## Risk Mitigation Timeline

| Risk | When to address | Action |
|------|-----------------|--------|
| Stream extraction fragility | Sprint 1.2 | Abstraction + fallback message |
| SQLite path in repo root | Sprint 1.4 | userData + gitignore |
| Growing renderer.js | Sprint 2.4 | Component split |
| No tests | Phase 1 end | Resolver unit tests first |

---

## Document Maintenance

Update this plan when:

- A sprint completes (mark tasks done)
- Priorities shift in [roadmap.md](./roadmap.md)
- New providers or platforms are approved in PRD

---

## Related Documents

- [roadmap.md](./roadmap.md) — phase outcomes
- [product-requirements-document.md](./product-requirements-document.md) — requirements source
- [contributor-guide.md](./contributor-guide.md) — how to execute tasks
- [architecture.md](./architecture.md) — technical design reference
