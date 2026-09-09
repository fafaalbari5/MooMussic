const yts = require("yt-search");
const { buildStreamUrl } = require("../services/streamService");

async function searchYouTube(query) {
  if (!query?.trim()) return [];

  try {
    const r = await yts(query);
    const videos = r.videos || [];

    return videos.slice(0, 20).map(v => ({
      id: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail || v.image,
      duration: v.timestamp || "0:00",
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
