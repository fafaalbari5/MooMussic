async function searchSoundCloud(query) {
  return [
    {
      id: "sc-" + Date.now(),
      title: `${query} (SoundCloud)`,
      source: "SoundCloud",
      platform: "soundcloud"
    }
  ];
}

async function getStreamUrl(track) {
  return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";
}

module.exports = {
  searchSoundCloud,
  getStreamUrl
};