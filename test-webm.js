const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");
const binaryPath = path.join(process.cwd(), "test-bin", "yt-dlp.exe");

async function test() {
    const yt = new YTDlpWrap(binaryPath);
    const args = [
        "https://www.youtube.com/watch?v=e4RJ_nTSKmI",
        "-f", "bestaudio[ext=webm]",
        "--downloader", "ffmpeg",
        "--downloader-args", "ffmpeg_i:-ss 10 -nostdin",
        "-o", "-"
    ];
    const stream = yt.execStream(args);
    stream.on('data', chunk => process.stdout.write('.'));
    stream.on('error', err => console.error(err));
    stream.on('end', () => console.log('\nDONE'));
}
test();
