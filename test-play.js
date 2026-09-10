const play = require("play-dl");
play.search("test", { limit: 2, source: { youtube: "video" } }).then(res => console.log(res)).catch(console.error);
