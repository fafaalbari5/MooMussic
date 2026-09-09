const db = require("../db/database");

function createPlaylist(name) {
  return db.prepare(`
    INSERT INTO playlists (name)
    VALUES (?)
  `).run(name);
}

function getPlaylists() {
  return db.prepare(`
    SELECT * FROM playlists
  `).all();
}

function addTrackToPlaylist(playlistId, track) {
  const trackId =
    track.platform === "soundcloud"
      ? track.url || track.id
      : track.id || track.track_id;

  return db.prepare(`
    INSERT INTO playlist_tracks
    (playlist_id, title, source, platform, track_id, thumbnail, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    playlistId,
    track.title,
    track.source,
    track.platform,
    trackId,
    track.thumbnail || null,
    track.duration || null
  );
}

function getPlaylistTracks(playlistId) {
  return db.prepare(`
    SELECT * FROM playlist_tracks
    WHERE playlist_id = ?
  `).all(playlistId);
}

function deleteTrack(trackId) {
  return db.prepare(`
    DELETE FROM playlist_tracks
    WHERE id = ?
  `).run(trackId);
}

module.exports = {
  createPlaylist,
  getPlaylists,
  addTrackToPlaylist,
  getPlaylistTracks,
  deleteTrack
};