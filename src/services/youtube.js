const yts = require("yt-search");

async function searchYouTube(query) {
  try {
    const result = await yts.search(query);

    return result.videos.slice(0, 20).map(v => ({
      id: v.videoId,
      videoId: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      source: "YouTube"
    }));
  } catch (err) {
    console.error("YouTube search error:", err);
    return [];
  }
}

async function getStreamUrl(track) {
  console.log("getStreamUrl:", track);

  // sementara pakai mp3 dummy
  return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
}

module.exports = {
  searchYouTube,
  getStreamUrl
};