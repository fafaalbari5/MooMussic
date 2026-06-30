const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  searchAll: (q) => ipcRenderer.invoke("search-all", q),

  getStream: (track) =>
    ipcRenderer.invoke("get-stream", track),

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
});