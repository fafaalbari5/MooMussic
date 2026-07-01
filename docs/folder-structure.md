# MooMussic Folder Structure

Current layout, module ownership, and target structure as the project scales to production.

---

## Current Structure (MVP)

```
MooMussic/
├── docs/                          # Project documentation
│   ├── architecture.md
│   ├── api-contract.md
│   ├── coding-standards.md
│   ├── contributor-guide.md
│   ├── database.md
│   ├── development-plan.md
│   ├── feature-specification.md
│   ├── folder-structure.md
│   ├── product-requirements-document.md
│   └── roadmap.md
│
├── src/
│   ├── db/
│   │   └── database.js            # SQLite connection + schema bootstrap
│   │
│   ├── resolvers/                 # Provider abstraction (ACTIVE)
│   │   ├── index.js               # Aggregator: searchAll, getStreamUrl
│   │   ├── youtubeResolver.js     # YouTube search + stream
│   │   └── soundcloudResolver.js  # SoundCloud search + stream
│   │
│   └── services/
│       ├── playlist.js            # Playlist CRUD (ACTIVE)
│       ├── playerservices.js      # Queue + playback orchestration (PARTIAL)
│       ├── search.js              # LEGACY — duplicate of resolvers
│       ├── youtube.js             # LEGACY — superseded by youtubeResolver
│       └── soundcloud.js          # LEGACY — superseded by soundcloudResolver
│
├── index.html                     # Renderer markup
├── renderer.js                    # UI logic + HTML5 audio
├── preload.js                     # contextBridge IPC API
├── main.js                        # Electron main + IPC handlers
├── style.css                      # Global styles
├── moomuss.db                     # SQLite database file (local)
├── package.json
├── package-lock.json
└── .gitignore
```

---

## Module Ownership

| Path | Process | Responsibility |
|------|---------|----------------|
| `main.js` | Main | App lifecycle, window creation, IPC registration |
| `preload.js` | Preload | Secure `window.api` bridge |
| `index.html` | Renderer | DOM structure |
| `renderer.js` | Renderer | Events, DOM updates, audio element |
| `style.css` | Renderer | Presentation |
| `src/db/database.js` | Main | DB singleton + schema |
| `src/services/playlist.js` | Main | Playlist business logic |
| `src/services/playerservices.js` | Main | Queue state, play orchestration |
| `src/resolvers/*` | Main | External provider integration |

---

## Entry Points

```
npm start  →  electron .  →  main.js
                                ├── registerIpc()
                                ├── BrowserWindow + preload.js
                                └── loadFile(index.html)
                                      └── renderer.js
                                            └── window.api → preload → main
```

---

## Target Structure (Production)

As features grow, adopt domain folders without breaking IPC boundaries:

```
MooMussic/
├── docs/
├── assets/                        # Icons, fonts, static images
│   ├── icons/
│   └── fonts/
│
├── src/
│   ├── main/
│   │   ├── index.js               # main.js relocated
│   │   ├── ipc/
│   │   │   ├── register.js        # Central IPC registration
│   │   │   ├── searchHandlers.js
│   │   ├── playlistHandlers.js
│   │   └── playerHandlers.js
│   │   └── window.js              # BrowserWindow factory
│   │
│   ├── preload/
│   │   └── index.js               # preload.js relocated
│   │
│   ├── renderer/
│   │   ├── index.html
│   │   ├── styles/
│   │   │   ├── main.css
│   │   │   ├── sidebar.css
│   │   │   └── player-bar.css
│   │   ├── components/            # UI modules (future)
│   │   │   ├── search.js
│   │   │   ├── playlist.js
│   │   │   ├── queue.js
│   │   │   └── player.js
│   │   └── app.js                 # renderer.js relocated
│   │
│   ├── db/
│   │   ├── database.js
│   │   └── migrations/
│   │       ├── 001_initial.sql
│   │       └── 002_add_platform.sql
│   │
│   ├── repositories/
│   │   ├── playlistRepository.js
│   │   └── playlistTrackRepository.js
│   │
│   ├── services/
│   │   ├── playlistService.js
│   │   ├── playerService.js
│   │   └── searchService.js       # Thin wrapper over resolvers
│   │
│   ├── resolvers/
│   │   ├── index.js
│   │   ├── types.js               # Shared track types / validators
│   │   ├── youtubeResolver.js
│   │   ├── soundcloudResolver.js
│   │   └── localResolver.js       # Phase 4
│   │
│   └── shared/
│       ├── constants.js           # IPC channel names, platform keys
│       └── errors.js              # Error codes
│
├── tests/
│   ├── resolvers/
│   ├── services/
│   └── integration/
│
├── scripts/
│   ├── migrate.js
│   └── build.js                   # electron-builder (future)
│
├── package.json
└── README.md
```

---

## File Naming Rules

| Type | Pattern | Example |
|------|---------|---------|
| Service | `<domain>Service.js` or `<domain>.js` | `playlist.js` |
| Resolver | `<provider>Resolver.js` | `youtubeResolver.js` |
| Repository | `<entity>Repository.js` | `playlistRepository.js` |
| IPC handler | `<domain>Handlers.js` | `playlistHandlers.js` |
| Migration | `NNN_description.sql` | `002_add_platform.sql` |
| Test | `<module>.test.js` | `youtubeResolver.test.js` |

---

## What Goes Where

### Add a new music provider

1. `src/resolvers/<provider>Resolver.js`
2. Register in `src/resolvers/index.js`
3. Document in `docs/api-contract.md`
4. Tests in `tests/resolvers/<provider>Resolver.test.js`

### Add a new persisted entity

1. Migration in `src/db/migrations/`
2. Repository in `src/repositories/`
3. Service methods in `src/services/`
4. IPC handlers in `main` + preload
5. Update `docs/database.md`

### Add UI feature

1. Markup in `index.html` (or `src/renderer/` when migrated)
2. Logic in `renderer.js` or component module
3. Styles in `style.css` or scoped CSS file
4. Only call `window.api` for backend access

---

## Legacy Files (To Remove)

| File | Replacement | Action |
|------|-------------|--------|
| `src/services/search.js` | `src/resolvers/index.js` | Delete after confirming no imports |
| `src/services/youtube.js` | `src/resolvers/youtubeResolver.js` | Delete |
| `src/services/soundcloud.js` | `src/resolvers/soundcloudResolver.js` | Delete |

Verify with:

```bash
# Ensure no require() references before deletion
rg "services/search" .
rg "services/youtube" .
rg "services/soundcloud" .
```

---

## Database File Location

| Stage | Path |
|-------|------|
| MVP (current) | `./moomuss.db` (project root) |
| Production target | `app.getPath('userData')/moomuss.db` |

Do not commit user databases to git. Add to `.gitignore` when appropriate.

---

## Build Artifacts (Future)

```
dist/                    # electron-builder output
release/                 # Installers (.exe, .dmg, .AppImage)
node_modules/            # Dependencies (gitignored)
```

---

## Related Documents

- [architecture.md](./architecture.md) — layer responsibilities
- [coding-standards.md](./coding-standards.md) — naming and import rules
- [development-plan.md](./development-plan.md) — when to adopt target structure
