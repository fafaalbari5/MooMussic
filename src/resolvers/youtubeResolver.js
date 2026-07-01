const yts = require("yt-search");
const { buildStreamUrl } = require("../services/streamService");

async function searchYouTube(query) {
  if (!query?.trim()) return [];

  try {
    const result = await yts.search(query);

    return result.videos.slice(0, 20).map((v) => ({
      id: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      duration: v.timestamp,
      source: "YouTube",
      platform: "youtube"
    }));
  } catch (err) {
    console.error("[youtubeResolver] search failed:", err.message);
    return [];
  }
}

function getStreamUrl(track, startTime = 0) {
  const id = track?.streamId || track?.track_id || track?.id;
  if (!id) return null;

  return buildStreamUrl(
    { platform: "youtube", id },
    startTime
  );
}

module.exports = {
  searchYouTube,
  getStreamUrl
};
