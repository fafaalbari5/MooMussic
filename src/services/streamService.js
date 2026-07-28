const path = require("path");
const fs = require("fs");
const https = require("https");
const { app } = require("electron");
const { Readable } = require("stream");
const YTDlpWrap = require("yt-dlp-wrap").default;
const play = require("play-dl");
const ffmpegPath = require("ffmpeg-static");

const YOUTUBE_FORMAT =
  "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best";

let ytDlpWrap = null;
let soundcloudReady = false;
const youtubeMimeCache = new Map();

function getFfmpegDir() {
  return path.dirname(ffmpegPath);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject);
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function ensureSoundCloud() {
  if (soundcloudReady) return;

  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    soundcloudReady = true;
  } catch (err) {
    console.error("[streamService] getFreeClientID failed:", err.message);
    throw err;
  }
}

async function ensureYtDlp() {
  if (ytDlpWrap) return ytDlpWrap;

  const binDir = path.join(app.getPath("userData"), "bin");
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const binaryPath = path.join(binDir, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.log("[streamService] Mengunduh yt-dlp (sekali saja)...");
    await YTDlpWrap.downloadFromGithub(binaryPath);
    console.log("[streamService] yt-dlp siap.");
  }

  ytDlpWrap = new YTDlpWrap(binaryPath);
  return ytDlpWrap;
}

function extToMime(ext) {
  if (ext === "webm") return "audio/webm";
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "opus" || ext === "ogg") return "audio/ogg";
  return "audio/mp4";
}

async function getYouTubeMimeType(ytDlp, videoUrl, videoId) {
  if (youtubeMimeCache.has(videoId)) {
    return youtubeMimeCache.get(videoId);
  }

  try {
    const line = await ytDlp.execPromise([
      videoUrl,
      "-f",
      YOUTUBE_FORMAT,
      "--no-playlist",
      "-j"
    ]);

    const info = JSON.parse(line);
    const mimeType = extToMime(info.ext);
    youtubeMimeCache.set(videoId, mimeType);
    return mimeType;
  } catch (err) {
    console.warn("[streamService] mime probe failed:", err.message);
    return "audio/mp4";
  }
}

async function createYouTubeStream(videoId, startSeconds = 0) {
  const ytDlp = await ensureYtDlp();
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const mimeType = await getYouTubeMimeType(ytDlp, url, videoId);

  const args = [
    url,
    "-f",
    YOUTUBE_FORMAT,
    "--no-playlist",
    "--no-warnings",
    "--ffmpeg-location",
    getFfmpegDir(),
    "-o",
    "-"
  ];

  if (startSeconds > 0) {
    args.push("--downloader", "ffmpeg");
    args.push(
      "--downloader-args",
      `ffmpeg_i:-ss ${Math.floor(startSeconds)} -nostdin`
    );
  }

  const stream = ytDlp.execStream(args);

  stream.on("error", (err) => {
    console.error("[streamService] yt-dlp stream error:", err.message);
  });

  return { stream, mimeType };
}

async function createSoundCloudStream(trackUrl, startSeconds = 0) {
  const ytDlp = await ensureYtDlp();
  const mimeType = await getYouTubeMimeType(ytDlp, trackUrl, trackUrl);

  const args = [
    trackUrl,
    "-f",
    YOUTUBE_FORMAT,
    "--no-playlist",
    "--no-warnings",
    "--ffmpeg-location",
    getFfmpegDir(),
    "-o",
    "-"
  ];

  if (startSeconds > 0) {
    args.push("--downloader", "ffmpeg");
    args.push(
      "--downloader-args",
      `ffmpeg_i:-ss ${Math.floor(startSeconds)} -nostdin`
    );
  }

  const stream = ytDlp.execStream(args);

  stream.on("error", (err) => {
    console.error("[streamService] SC stream error:", err.message);
  });

  return { stream, mimeType };
}

async function createStream(platform, { id, url, startSeconds = 0 }) {
  switch (platform) {
    case "youtube":
      if (!id) throw new Error("YouTube video ID tidak ada");
      return createYouTubeStream(id, startSeconds);

    case "soundcloud": {
      const trackUrl = url || id;
      if (!trackUrl) throw new Error("SoundCloud URL tidak ada");
      return createSoundCloudStream(trackUrl, startSeconds);
    }

    default:
      throw new Error(`Platform tidak didukung: ${platform}`);
  }
}

function buildStreamUrl(track, startSeconds = 0) {
  const params = new URLSearchParams();
  params.set("platform", track.platform);

  if (track.platform === "youtube") {
    params.set("id", track.id);
  } else if (track.platform === "soundcloud") {
    params.set("url", track.url);
  }

  if (startSeconds > 0) {
    params.set("t", String(Math.floor(startSeconds)));
  }

  return `moomuss://stream?${params.toString()}`;
}

module.exports = {
  createStream,
  buildStreamUrl,
  ensureSoundCloud,
  ensureYtDlp,
  toWebStream: (nodeStream) => Readable.toWeb(nodeStream)
};
