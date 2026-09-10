const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");

const resolver = require("./src/resolvers");
const playlist = require("./src/services/playlist");
const player = require("./src/services/playerservices");
const streamService = require("./src/services/streamService");

app.commandLine.appendSwitch("ignore-certificate-errors");
app.commandLine.appendSwitch("allow-insecure-localhost");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "moomuss",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true
    }
  }
]);

function registerProtocol() {
  protocol.handle("moomuss", async (request) => {
    try {
      const url = new URL(request.url);

      if (url.hostname !== "stream") {
        return new Response("Not found", { status: 404 });
      }

      const platform = url.searchParams.get("platform");
      const id = url.searchParams.get("id");
      const scUrl = url.searchParams.get("url");
      const startSeconds = parseInt(url.searchParams.get("t") || "0", 10);

      const { stream, mimeType } = await streamService.createStream(platform, {
        id,
        url: scUrl,
        startSeconds
      });

      return new Response(streamService.toWebStream(stream), {
        headers: { "Content-Type": mimeType }
      });
    } catch (err) {
      console.error("[moomuss protocol] error:", err.message);
      return new Response(err.message, { status: 500 });
    }
  });
}

function registerIpc() {
  ipcMain.handle("search-all", (_, q) => resolver.searchAll(q));

  ipcMain.handle("get-stream", async (_, track, startTime = 0) => {
    return resolver.getStreamUrl(track, startTime);
  });

  ipcMain.handle("set-queue", (_, tracks, i) => {
    player.setQueue(tracks, i);
    return true;
  });

  ipcMain.handle("create-playlist", (_, name) =>
    playlist.createPlaylist(name)
  );

  ipcMain.handle("get-playlists", () => playlist.getPlaylists());

  ipcMain.handle("add-track", (_, id, track) =>
    playlist.addTrackToPlaylist(id, track)
  );

  ipcMain.handle("get-playlist-tracks", (_, id) =>
    playlist.getPlaylistTracks(id)
  );

  ipcMain.handle("delete-track", (_, id) => playlist.deleteTrack(id));

  ipcMain.handle("rename-playlist", (_, id, name) =>
    playlist.renamePlaylist(id, name)
  );

  ipcMain.handle("delete-playlist", (_, id) =>
    playlist.deletePlaylist(id)
  );

  ipcMain.handle("win-minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.handle("win-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.handle("win-close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });
}

app.whenReady().then(() => {
  registerProtocol();
  registerIpc();

  app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
  });

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  win.loadFile("index.html");
});
