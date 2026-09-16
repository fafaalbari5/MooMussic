const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

code = code.replace(/function nextSong\(\) \{\r?\n  if \(currentPlaylist\.length === 0\) return;/, `function nextSong() {
  if (manualQueue.length > 0) {
    const track = manualQueue.shift();
    playTrack(track, 0);
    if(typeof renderQueue === 'function') renderQueue();
    if(typeof saveState === 'function') saveState();
    return;
  }
  if (currentPlaylist.length === 0) return;`);

fs.writeFileSync("renderer.js", code);
