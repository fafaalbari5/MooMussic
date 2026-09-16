const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

const showTabRepl = `function showTab(tabName) {
  const searchView = document.getElementById("searchView");
  const playlistView = document.getElementById("playlistView");
  const navSearch = document.getElementById("navSearch");
  const navPlaylist = document.getElementById("navPlaylist");

  if (tabName === "search") {
    searchView?.classList.remove("hidden");
    playlistView?.classList.add("hidden");
    document.getElementById("queueView")?.classList.add("hidden");
    navSearch?.classList.add("active");
    navPlaylist?.classList.remove("active");
  } else if (tabName === "playlist") {
    searchView?.classList.add("hidden");
    playlistView?.classList.remove("hidden");
    document.getElementById("queueView")?.classList.add("hidden");
    navSearch?.classList.remove("active");
    navPlaylist?.classList.add("active");
  } else if (tabName === "queue") {
    searchView?.classList.add("hidden");
    playlistView?.classList.add("hidden");
    document.getElementById("queueView")?.classList.remove("hidden");
    navSearch?.classList.remove("active");
    navPlaylist?.classList.remove("active");
    if(typeof renderQueue === 'function') renderQueue();
  }
  if (typeof saveState === 'function') saveState();
}`;

code = code.replace(/function showTab\(tabName\) \{[\s\S]+?navPlaylist\?\.classList\.add\("active"\);\r?\n  \}\r?\n\}/, showTabRepl);

fs.writeFileSync("renderer.js", code);
