const youtube = require("./youtube");
const soundcloud = require("./soundcloud");

console.log("youtube module =", youtube);
console.log("soundcloud module =", soundcloud);

async function searchAll(query) {
  const [yt, sc] = await Promise.all([
    youtube.searchYouTube(query),
    soundcloud.searchSoundCloud(query)
  ]);

  return [...yt, ...sc];
}

module.exports = {
  searchAll
};