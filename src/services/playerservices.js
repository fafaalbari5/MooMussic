const resolver = require("../resolvers");

let queue = [];
let currentIndex = -1;

async function playTrack(track) {
  if (!track) return null;

  const url = await resolver.getStreamUrl(track);

  if (!url) return null;

  return {
    url,
    track
  };
}

function setQueue(tracks, startIndex = 0) {
  queue = tracks || [];
  currentIndex = startIndex;
}

function next() {
  if (currentIndex < queue.length - 1) {
    currentIndex++;
    return queue[currentIndex];
  }
  return null;
}

function prev() {
  if (currentIndex > 0) {
    currentIndex--;
    return queue[currentIndex];
  }
  return null;
}

function getCurrent() {
  return queue[currentIndex] || null;
}

module.exports = {
  playTrack,
  setQueue,
  next,
  prev,
  getCurrent
};