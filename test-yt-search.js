const yt = require("./src/resolvers/youtubeResolver");
yt.searchYouTube("test").then(console.log).catch(console.error);
