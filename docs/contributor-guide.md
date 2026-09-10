# MooMussic Contributor Guide

Thank you for contributing to MooMussic. This guide covers environment setup, workflow, and expectations for growing the project from MVP to production.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ LTS recommended | Match Electron's Node if issues arise |
| npm | 9+ | Comes with Node |
| Git | 2.x | |
| OS | Windows, macOS, or Linux | Electron is cross-platform |

Optional:

- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows) — required for compiling `better-sqlite3` native bindings if prebuilds fail.

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd MooMussic
```

### 2. Install dependencies

```bash
npm install
```

If `better-sqlite3` fails to build:

```bash
npm rebuild better-sqlite3
```

### 3. Run the application

```bash
npm start
```

This launches Electron and loads `index.html` in a `BrowserWindow`.

### 4. Verify core flows

- Search for a song (YouTube results should appear)
- Click a result to play (dummy MP3 in MVP)
- Create a playlist and add a track via `+`
- Open playlist and play tracks
- Delete a track with confirm dialog

---

## Project Architecture (Quick Reference)

```
Renderer (renderer.js)  →  window.api  →  preload.js  →  IPC  →  main.js
                                                                    ├── resolvers (search/stream)
                                                                    ├── services (playlist, player)
                                                                    └── database (SQLite)
```

**Golden rule:** Never access the database or provider APIs from the renderer.

Read [architecture.md](./architecture.md) for full details.

---

## Development Workflow

### 1. Pick or open an issue

Align work with [roadmap.md](./roadmap.md) and [development-plan.md](./development-plan.md). Comment on the issue before large changes.

### 2. Create a branch

```bash
git checkout -b feature/short-description
```

Examples: `feature/queue-preload-api`, `fix/player-import`, `docs/api-contract`

### 3. Make focused changes

- Follow [coding-standards.md](./coding-standards.md)
- Update docs when changing IPC, schema, or feature behavior
- Keep PRs small and reviewable

### 4. Manual testing

There is no automated test suite yet. Test affected flows manually:

| Change type | Test |
|-------------|------|
| IPC / preload | Search, playlist ops, playback |
| Resolver | Search per provider, getStream |
| DB schema | Fresh DB + migration from existing |
| UI | Layout, modals, player controls |

### 5. Commit

Use clear, imperative messages:

```
Add platform field to playlist track persistence

Store resolver platform key when adding tracks so playlist
playback can route get-stream correctly.
```

### 6. Open a Pull Request

Include:

- **Summary** — what and why
- **Test plan** — steps you ran
- **Screenshots** — for UI changes
- **Breaking changes** — if IPC or schema changed

---

## Common Tasks

### Add a new IPC method

1. `ipcMain.handle("channel-name", handler)` in `main.js`
2. Expose on `contextBridge` in `preload.js`
3. Call from `renderer.js` via `window.api`
4. Document in [api-contract.md](./api-contract.md)

### Add a music provider

1. Create `src/resolvers/<name>Resolver.js`
2. Wire into `src/resolvers/index.js`
3. Add feature notes to [feature-specification.md](./feature-specification.md)

### Change database schema

1. Add migration SQL (once `migrations/` exists) or update bootstrap for MVP
2. Update `src/services/playlist.js` or repository
3. Document in [database.md](./database.md)

---

## Debugging

### Main process logs

Terminal where `npm start` was run shows `console.log` from `main.js`, services, and resolvers.

### Renderer logs

Open DevTools in the Electron window:

- Windows/Linux: `Ctrl+Shift+I`
- macOS: `Cmd+Option+I`

Or temporarily add to `main.js` after window creation:

```javascript
win.webContents.openDevTools();
```

### SQLite inspection

Use [DB Browser for SQLite](https://sqlitebrowser.org/) or CLI:

```bash
sqlite3 moomuss.db "SELECT * FROM playlists;"
```

---

## Known MVP Issues (Good First Fixes)

| Issue | File | Hint |
|-------|------|------|
| `player` undefined in `set-queue` handler | `main.js` | Import `playerservices.js` |
| `set-queue` not in preload | `preload.js` | Expose `setQueue` |
| `platform` not saved to DB | `playlist.js` | Add column + migration |
| Legacy duplicate services | `src/services/search.js` etc. | Remove after audit |
| App title "MusicHub" | `index.html` | Rename to MooMussic |

---

## Code Style

- Match existing formatting in the file you edit
- CommonJS modules
- camelCase functions, kebab-case IPC channels
- Parameterized SQL only

See [coding-standards.md](./coding-standards.md).

---

## Documentation

When your change affects behavior or structure, update the relevant doc in `docs/`:

| Change | Document |
|--------|----------|
| Architecture / layers | architecture.md |
| IPC | api-contract.md |
| Schema | database.md |
| Feature behavior | feature-specification.md |
| File layout | folder-structure.md |
| Phases / priorities | roadmap.md, development-plan.md |

---

## Community Guidelines

- Be respectful and constructive in reviews
- Prefer questions over assumptions on ambiguous requirements
- Document breaking changes prominently
- Do not commit secrets, API keys, or personal databases

---

## Licensing

Confirm license in `package.json` before contributing. Currently ISC — contributions should be compatible.

---

## Getting Help

1. Read docs in `docs/`
2. Search existing issues
3. Open a new issue with reproduction steps and environment details

---

## Related Documents

- [development-plan.md](./development-plan.md) — what to work on next
- [coding-standards.md](./coding-standards.md) — style and patterns
- [folder-structure.md](./folder-structure.md) — where code belongs
