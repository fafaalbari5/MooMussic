const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");
const binaryPath = path.join(process.cwd(), "test-bin", "yt-dlp.exe");
const yt = new YTDlpWrap(binaryPath);

async function test() {
    // Test SC
    const url = "https://soundcloud.com/postmalone/rockstar-feat-21-savage";
    try {
        const info = await yt.execPromise([url, "-j"]);
        console.log("SC Info Title:", JSON.parse(info).title);
    } catch (e) { console.error("SC fail", e); }

    // Test Search
    try {
        const search = await yt.execPromise(["ytsearch2:hello", "-j"]);
        const lines = search.trim().split("\n");
        console.log("Search result 1:", JSON.parse(lines[0]).title);
    } catch (e) { console.error("Search fail", e); }
}
test();
