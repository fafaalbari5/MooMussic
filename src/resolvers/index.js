const youtube = require("./youtubeResolver");
const soundcloud = require("./soundcloudResolver");

async function searchAll(query) {
  const [yt, sc] = await Promise.all([
    youtube.searchYouTube(query),
    soundcloud.searchSoundCloud(query)
  ]);

  return [...yt, ...sc];
}

async function getStreamUrl(track) {
  if (!track?.platform) return null;

  switch (track.platform) {
    case "youtube":
      return youtube.getStreamUrl(track);

    case "soundcloud":
      return soundcloud.getStreamUrl(track);

    default:
      return null;
  }
}

module.exports = {
  searchAll,
  getStreamUrl
};