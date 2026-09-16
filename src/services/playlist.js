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
    ORDER BY order_seq ASC, id ASC
  `).all(playlistId);
}

function reorderPlaylistTracks(playlistId, trackIds) {
  const stmt = db.prepare(`
    UPDATE playlist_tracks
    SET order_seq = ?
    WHERE id = ? AND playlist_id = ?
  `);
  const transaction = db.exec('BEGIN TRANSACTION');
  try {
    trackIds.forEach((id, index) => {
      stmt.run(index, id, playlistId);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function deleteTrack(trackId) {
  return db.prepare(`
    DELETE FROM playlist_tracks
    WHERE id = ?
  `).run(trackId);
}

function renamePlaylist(playlistId, name) {
  return db.prepare(`
    UPDATE playlists
    SET name = ?
    WHERE id = ?
  `).run(name, playlistId);
}

function deletePlaylist(playlistId) {
  return db.prepare(`
    DELETE FROM playlists
    WHERE id = ?
  `).run(playlistId);
}

module.exports = {
  createPlaylist,
  getPlaylists,
  addTrackToPlaylist,
  getPlaylistTracks,
  reorderPlaylistTracks,
  deleteTrack,
  renamePlaylist,
  deletePlaylist
};