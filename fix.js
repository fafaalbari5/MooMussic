const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

code = code.replace(/window\.toggleRepeat = toggleRepeat;\r?\n\};/, "  window.toggleRepeat = toggleRepeat;\n  window.toggleMiniPlayerUI = toggleMiniPlayerUI;\n});");

// also I need to define toggleMiniPlayerUI and isMiniPlayer because they were completely missed earlier due to the same regex fail!
const miniPlayerCode = `
let isMiniPlayer = false;
window.toggleMiniPlayerUI = function() {
  isMiniPlayer = !isMiniPlayer;
  if (isMiniPlayer) {
    document.body.classList.add("mini-player-active");
  } else {
    document.body.classList.remove("mini-player-active");
  }
  if (window.api.toggleMiniPlayer) {
    window.api.toggleMiniPlayer(isMiniPlayer);
  }
};
`;
if (!code.includes("isMiniPlayer = false;")) {
  code = code + miniPlayerCode;
}

fs.writeFileSync("renderer.js", code);
