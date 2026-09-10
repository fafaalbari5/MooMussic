const play = require("play-dl");
async function test() {
    try {
        const url = 'https://www.youtube.com/watch?v=e4RJ_nTSKmI';
        const streamData = await play.stream(url, { seek: 10 });
        console.log(streamData.type);
    } catch (e) { console.error(e); }
}
test();
