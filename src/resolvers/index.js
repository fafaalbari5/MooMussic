const youtube = require("./youtubeResolver");
const soundcloud = require("./soundcloudResolver");

function normalizeTrack(track) {
  if (!track) return null;

  const normalized = { ...track };

  if (!normalized.platform && normalized.source) {
    const source = normalized.source.toLowerCase();

    if (source.includes("youtube")) normalized.platform = "youtube";
    else if (source.includes("soundcloud")) normalized.platform = "soundcloud";
  }

  // Playlist DB rows use `id` as row PK — provider ID is in `track_id`
  if (normalized.track_id) {
    normalized.streamId = normalized.track_id;

    if (
      normalized.platform === "soundcloud" &&
      normalized.track_id.startsWith("http")
    ) {
      normalized.url = normalized.track_id;
    }
  } else {
    normalized.streamId = normalized.id;
  }

  if (
    normalized.platform === "soundcloud" &&
    !normalized.url &&
    typeof normalized.streamId === "string" &&
    normalized.streamId.startsWith("http")
  ) {
    normalized.url = normalized.streamId;
  }

  return normalized;
}

async function searchAll(query) {
  const [yt, sc] = await Promise.all([
    youtube.searchYouTube(query),
    soundcloud.searchSoundCloud(query)
  ]);

  return [...yt, ...sc];
}

async function getStreamUrl(track, startTime = 0) {
  const normalized = normalizeTrack(track);
  if (!normalized?.platform) return null;

  switch (normalized.platform) {
    case "youtube":
      return youtube.getStreamUrl(normalized, startTime);

    case "soundcloud":
      return soundcloud.getStreamUrl(normalized, startTime);

    default:
      return null;
  }
}

module.exports = {
  searchAll,
  getStreamUrl,
  normalizeTrack
};
