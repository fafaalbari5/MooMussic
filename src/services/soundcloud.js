async function searchSoundCloud(query) {
  return [
    {
      title: `${query} Remix`,
      source: "SoundCloud",
      id: null
    }
  ];
}

async function getStreamUrl(track) {
  return null; // belum implement API real
}

module.exports = {
  searchSoundCloud,
  getStreamUrl
};