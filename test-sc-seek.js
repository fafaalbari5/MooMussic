const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");
const binaryPath = path.join(process.cwd(), "test-bin", "yt-dlp.exe");

async function test() {
    const yt = new YTDlpWrap(binaryPath);
    const args = [
        "https://soundcloud.com/postmalone/rockstar-feat-21-savage",
        "-f", "bestaudio[ext=webm]/bestaudio",
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
