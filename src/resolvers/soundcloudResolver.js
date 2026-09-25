const play = require("play-dl");
const { buildStreamUrl, ensureSoundCloud } = require("../services/streamService");

function formatDuration(seconds) {
  if (!seconds) return undefined;

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function searchSoundCloud(query) {
  if (!query?.trim()) return [];

  try {
    await ensureSoundCloud();

    const results = await play.search(query, {
      limit: 10,
      source: { soundcloud: "tracks" }
    });

    return results.map((track) => ({
      id: String(track.id),
      url: track.permalink || track.url,
      title: track.name || track.title,
      artist: track.publisher?.artist || track.user?.name || track.author?.name || "Unknown Artist",
      thumbnail: track.thumbnail || track.thumbnails?.[0]?.url,
      duration: formatDuration(track.durationInSec) || "0:00",
      source: "SoundCloud",
      platform: "soundcloud"
    }));
  } catch (err) {
    console.error("[soundcloudResolver] search failed:", err.message);
    return [];
  }
}

function getStreamUrl(track, startTime = 0) {
  const url =
    track?.url ||
    (typeof track?.track_id === "string" && track.track_id.startsWith("http")
      ? track.track_id
      : null) ||
    (typeof track?.streamId === "string" && track.streamId.startsWith("http")
      ? track.streamId
      : null);

  if (!url) return null;

  return buildStreamUrl(
    { platform: "soundcloud", url },
    startTime
  );
}

module.exports = {
  searchSoundCloud,
  getStreamUrl
};
