const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  searchAll: (q) => ipcRenderer.invoke("search-all", q),

  getStream: (track, startTime = 0) =>
    ipcRenderer.invoke("get-stream", track, startTime),

  createPlaylist: (name) =>
    ipcRenderer.invoke("create-playlist", name),

  getPlaylists: () =>
    ipcRenderer.invoke("get-playlists"),

  addTrack: (playlistId, track) =>
    ipcRenderer.invoke("add-track", playlistId, track),

  getPlaylistTracks: (playlistId) =>
    ipcRenderer.invoke("get-playlist-tracks", playlistId),

  deleteTrack: (trackId) =>
    ipcRenderer.invoke("delete-track", trackId),

  renamePlaylist: (id, name) =>
    ipcRenderer.invoke("rename-playlist", id, name),

  deletePlaylist: (id) =>
    ipcRenderer.invoke("delete-playlist", id),

  toggleMiniPlayer: (isMini) => 
    ipcRenderer.send("toggle-mini-player", isMini),

  minimizeWin: () => ipcRenderer.invoke("win-minimize"),
  maximizeWin: () => ipcRenderer.invoke("win-maximize"),
  closeWin: () => ipcRenderer.invoke("win-close"),
});