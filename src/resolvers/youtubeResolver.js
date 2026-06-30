const yts = require("yt-search");

async function searchYouTube(query) {
  const result = await yts.search(query);

  return result.videos.map(v => ({
    id: v.videoId,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.timestamp,
    source: "YouTube",
    platform: "youtube"
  }));
}

async function getStreamUrl(track) {
  if (!track?.id) return null;

  // MVP dummy stream (biar audio jalan dulu)
  return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
}

module.exports = {
  searchYouTube,
  getStreamUrl
};