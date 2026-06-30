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
  return db.prepare(`
    INSERT INTO playlist_tracks
    (playlist_id, title, source, track_id, thumbnail)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    playlistId,
    track.title,
    track.source,
    track.id,
    track.thumbnail
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