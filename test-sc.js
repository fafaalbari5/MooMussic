const play = require("play-dl");
play.getFreeClientID().then(id => console.log('ID:', id)).catch(console.error);
