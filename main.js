const { app, BrowserWindow, ipcMain } = require("electron");

const resolver = require("./src/resolvers");
const playlist = require("./src/services/playlist");

function registerIpc() {

  ipcMain.handle("search-all", (_, q) => {
    return resolver.searchAll(q);
  });
ipcMain.handle("get-stream", async (_, track) => {
  return resolver.getStreamUrl(track);
});

  ipcMain.handle("set-queue", (_, tracks, i) => {
    player.setQueue(tracks, i);
    return true;
  });

  ipcMain.handle("create-playlist", (_, name) =>
    playlist.createPlaylist(name)
  );

  ipcMain.handle("get-playlists", () =>
    playlist.getPlaylists()
  );

  ipcMain.handle("add-track", (_, id, track) =>
    playlist.addTrackToPlaylist(id, track)
  );

  ipcMain.handle("get-playlist-tracks", (_, id) =>
    playlist.getPlaylistTracks(id)
  );

  ipcMain.handle("delete-track", (_, id) =>
    playlist.deleteTrack(id)
  );
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: require("path").join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  registerIpc();
  win.loadFile("index.html");
});