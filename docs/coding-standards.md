# MooMussic Coding Standards

Standards for contributors working on MooMussic as it grows from MVP to production. When in doubt, match existing patterns in the nearest module.

---

## General Principles

1. **Minimize scope** — Small, focused changes over large refactors unless planned.
2. **Separation of concerns** — UI in renderer; logic in main services; providers in resolvers; SQL in DB/repository layer.
3. **No shortcuts through the renderer** — Never enable `nodeIntegration` for convenience.
4. **Provider agnostic UI** — Renderer works with normalized `Track` objects, not provider-specific fields.
5. **Explicit over clever** — Prefer readable code over dense abstractions in MVP phase.

---

## Language & Runtime

| Area | Standard |
|------|----------|
| Language | JavaScript (ES202+); TypeScript may be adopted in Phase 2+ |
| Module system | CommonJS (`require` / `module.exports`) |
| Node | Align with Electron bundled Node version |
| Package manager | npm (lockfile committed) |

---

## Project Layout Rules

| Layer | Location | May import |
|-------|----------|------------|
| Main entry | `main.js` | services, resolvers, electron |
| Preload | `preload.js` | electron only |
| Renderer | `renderer.js` | DOM APIs, `window.api` only |
| Services | `src/services/` | db, resolvers, other services |
| Resolvers | `src/resolvers/` | provider SDKs, http clients |
| Database | `src/db/` | better-sqlite3 only |
| Repositories (future) | `src/repositories/` | db |

**Forbidden:**

- Renderer importing from `src/`
- Resolvers importing from renderer or preload
- Services importing from `renderer.js`

---

## Naming Conventions

| Entity | Convention | Example |
|--------|------------|---------|
| Files (modules) | camelCase | `playlist.js`, `youtubeResolver.js` |
| IPC channels | kebab-case | `search-all`, `get-playlist-tracks` |
| Preload API | camelCase | `searchAll`, `getPlaylistTracks` |
| Functions | camelCase | `createPlaylist`, `getStreamUrl` |
| Constants | UPPER_SNAKE_CASE | `MAX_QUERY_LENGTH` |
| DB tables | snake_case plural | `playlists`, `playlist_tracks` |
| DB columns | snake_case | `playlist_id`, `track_id` |
| Platform keys | lowercase | `youtube`, `soundcloud` |
| Display source labels | Title Case | `YouTube`, `SoundCloud` |

---

## Electron Security

Always configure new `BrowserWindow` instances with:

```javascript
webPreferences: {
  preload: path.join(__dirname, "preload.js"),
  contextIsolation: true,
  nodeIntegration: false
}
```

When adding preload methods:

1. Add `ipcMain.handle` in `main.js`.
2. Add wrapper in `preload.js` `contextBridge.exposeInMainWorld`.
3. Document in [api-contract.md](./api-contract.md).

Never expose raw `ipcRenderer` or `require` to the renderer.

---

## IPC Guidelines

- Use `invoke` / `handle` for request-response patterns.
- Keep payloads JSON-serializable.
- Validate arguments at the start of each handler.
- Return `null` or structured errors — avoid throwing for expected failures (e.g. stream not found).

```javascript
// Good
ipcMain.handle("get-stream", async (_, track) => {
  if (!track?.platform) return null;
  return resolver.getStreamUrl(track);
});

// Avoid
ipcMain.handle("get-stream", async (_, track) => {
  return resolver.getStreamUrl(track); // unvalidated
});
```

---

## Database Access

- All SQL lives in services today; move to repositories as they are introduced.
- Always use **prepared statements**:

```javascript
db.prepare(`SELECT * FROM playlists WHERE id = ?`).get(id);
```

- Never interpolate user input into SQL strings.
- Enable foreign keys (`PRAGMA foreign_keys = ON`).
- Schema changes require a numbered migration file (once migration system exists).

---

## Resolver / Provider Guidelines

Each provider gets one file: `src/resolvers/<name>Resolver.js`.

Required exports:

- Search function returning normalized tracks with `platform` set.
- `getStreamUrl(track)` returning URL or `null`.

Normalized track shape:

```javascript
{
  id: string,
  title: string,
  thumbnail?: string,
  duration?: string,
  source: string,    // human label
  platform: string   // router key
}
```

Register new providers in `src/resolvers/index.js` for both `searchAll` and `getStreamUrl`.

---

## Error Handling

| Layer | Approach |
|-------|----------|
| Resolvers | Catch provider errors; log; return `[]` or `null` |
| Services | Validate inputs; propagate or wrap errors |
| IPC handlers | Return safe values to renderer |
| Renderer | Show user-friendly messages; log details to console in dev |

Avoid empty `catch` blocks. Log with context:

```javascript
console.error("[youtubeResolver] search failed:", err.message);
```

---

## Logging

MVP: `console.log` / `console.error` with prefixed tags.

Production target: structured logger with levels (`debug`, `info`, `warn`, `error`) and file rotation in main process only.

Format: `[moduleName] message`

Remove debug logs (e.g. in `src/services/search.js`) before release builds.

---

## CSS & HTML

- Semantic HTML where practical (`nav`, `main`, `section`, `footer`).
- Prefer class-based styling over inline styles (except dynamic highlight states).
- Dark theme as default; use CSS variables for colors:

```css
:root {
  --bg-primary: #121212;
  --text-primary: #ffffff;
}
```

- BEM-style class names encouraged: `player-bar__progress`, `sidebar__item--active`.

---

## Renderer JavaScript

- Initialize DOM references after `window.onload` or `DOMContentLoaded`.
- Avoid global pollution; migrate from `window.togglePlay` to event listeners over time.
- Async UI handlers should handle failures:

```javascript
const url = await window.api.getStream(track);
if (!url) {
  alert("Stream tidak tersedia");
  return;
}
```

---

## Dependencies

- Prefer well-maintained packages with compatible licenses.
- New dependencies require justification in PR description.
- Avoid duplicate libraries for the same concern (one HTTP client, one SQLite driver).
- Pin major versions; run `npm audit` periodically.

---

## Git & Commits

- Branch naming: `feature/queue-ui`, `fix/playlist-platform`, `docs/api-contract`
- Commits: imperative mood, concise subject (`Add platform column to playlist tracks`)
- One logical change per commit when possible
- Do not commit `moomuss.db` with personal test data (consider gitignore for local DB)

---

## Testing (Target)

| Layer | Tool | Focus |
|-------|------|-------|
| Resolvers | unit tests with mocked HTTP | normalization, error paths |
| Services / repos | in-memory SQLite | CRUD correctness |
| IPC | integration tests | channel contracts |
| Renderer | manual / future E2E | critical user flows |

Test files: `tests/` or `__tests__/` mirroring `src/` structure.

---

## Code Review Checklist

- [ ] Renderer does not access Node or DB
- [ ] New IPC documented in api-contract.md
- [ ] SQL uses parameterized queries
- [ ] Track objects include `platform` for playback
- [ ] No secrets in source or commits
- [ ] Changes match folder-structure conventions
- [ ] User-visible errors are handled gracefully

---

## Related Documents

- [folder-structure.md](./folder-structure.md) — where files belong
- [contributor-guide.md](./contributor-guide.md) — setup and PR workflow
- [api-contract.md](./api-contract.md) — IPC specifications
