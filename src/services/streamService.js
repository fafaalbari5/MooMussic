const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const { Readable } = require("stream");
const { spawn } = require("child_process");
const YTDlpWrap = require("yt-dlp-wrap").default;
const play = require("play-dl");
const ffmpegPath = require("ffmpeg-static");

let ytDlpWrap = null;
let soundcloudReady = false;

const youtubeUrlCache = new Map();

function getFfmpegDir() {
  return path.dirname(ffmpegPath);
}

function attachProcessCleanup(outputStream, childProcess = null, inputStream = null) {
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (childProcess && !childProcess.killed) {
      try {
        childProcess.kill("SIGKILL");
      } catch {}
    }

    if (inputStream && !inputStream.destroyed) {
      try {
        inputStream.destroy();
      } catch {}
    }
  };

  outputStream.on("close", cleanup);
  outputStream.on("end", cleanup);
  outputStream.on("error", cleanup);
  outputStream.on("finish", cleanup);
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

  let userDataPath;
  try {
    userDataPath = app?.getPath ? app.getPath("userData") : null;
  } catch {
    userDataPath = null;
  }

  const baseDir =
    userDataPath ||
    path.join(process.env.APPDATA || process.cwd(), "moomussic");

  const binDir = path.join(baseDir, "bin");
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const binaryPath = path.join(binDir, binaryName);

  if (!fs.existsSync(binaryPath)) {
    console.log("[streamService] Mengunduh yt-dlp...");
    await YTDlpWrap.downloadFromGithub(binaryPath);
    console.log("[streamService] yt-dlp siap.");
  }

  ytDlpWrap = new YTDlpWrap(binaryPath);
  return ytDlpWrap;
}

async function getYouTubeDirectMediaUrl(videoId) {
  const cached = youtubeUrlCache.get(videoId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const ytDlp = await ensureYtDlp();
  const line = await ytDlp.execPromise([
    `https://www.youtube.com/watch?v=${videoId}`,
    "-f",
    "bestaudio[ext=webm]/bestaudio",
    "-j"
  ]);

  const info = JSON.parse(line);
  const data = {
    url: info.url,
    userAgent:
      info.http_headers?.["User-Agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    expiresAt: Date.now() + 3600 * 1000 * 2
  };

  youtubeUrlCache.set(videoId, data);
  return data;
}

async function createYouTubeStream(videoId, startSeconds = 0) {
  const startSec = Math.floor(startSeconds);

  try {
    const { url, userAgent } = await getYouTubeDirectMediaUrl(videoId);

    const ffmpegArgs = [
      "-user_agent",
      userAgent,
      ...(startSec > 0 ? ["-ss", String(startSec)] : []),
      "-i",
      url,
      "-c",
      "copy",
      "-f",
      "webm",
      "pipe:1"
    ];

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      highWaterMark: 1024 * 1024
    });

    ffmpeg.on("error", (err) => {
      console.warn("[streamService] direct ffmpeg YouTube error:", err.message);
      youtubeUrlCache.delete(videoId);
    });

    attachProcessCleanup(ffmpeg.stdout, ffmpeg);

    return { stream: ffmpeg.stdout, mimeType: "audio/webm" };
  } catch (err) {
    console.warn(
      "[streamService] direct ffmpeg YouTube failed, fallback to yt-dlp execStream:",
      err.message
    );
    youtubeUrlCache.delete(videoId);

    const ytDlp = await ensureYtDlp();
    const args = [
      `https://www.youtube.com/watch?v=${videoId}`,
      "-f",
      "bestaudio[ext=webm]/bestaudio",
      "--no-playlist",
      "--no-warnings",
      "--ffmpeg-location",
      getFfmpegDir(),
      "-o",
      "-"
    ];

    if (startSec > 0) {
      args.push("--downloader", "ffmpeg");
      args.push(
        "--downloader-args",
        `ffmpeg_i:-ss ${startSec} -nostdin`
      );
    }

    const ytStream = ytDlp.execStream(args);
    return { stream: ytStream, mimeType: "audio/webm" };
  }
}

async function createSoundCloudStream(trackUrl, startSeconds = 0) {
  await ensureSoundCloud();
  const startSec = Math.floor(startSeconds);

  try {
    // Selalu ambil streamData segar dari play-dl (tanpa cache URL HLS yang kedaluwarsa)
    const streamData = await play.stream(trackUrl);

    const mimeType =
      streamData.type === "opus" || streamData.type === "webm"
        ? "audio/webm"
        : "audio/mpeg";

    if (startSec <= 0) {
      attachProcessCleanup(streamData.stream, null, streamData.stream);
      return { stream: streamData.stream, mimeType };
    }

    // Pipe stream segar ke ffmpeg dengan -ss startSec
    const ffmpegArgs = [
      "-ss",
      String(startSec),
      "-i",
      "pipe:0",
      "-c",
      "copy",
      "-f",
      "mp3",
      "pipe:1"
    ];

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      highWaterMark: 1024 * 1024
    });

    streamData.stream.pipe(ffmpeg.stdin);

    ffmpeg.on("error", (err) => {
      console.error("[streamService] SoundCloud ffmpeg error:", err.message);
    });

    attachProcessCleanup(ffmpeg.stdout, ffmpeg, streamData.stream);

    return { stream: ffmpeg.stdout, mimeType: "audio/mpeg" };
  } catch (err) {
    console.error("[streamService] SoundCloud stream error:", err.message);
    throw err;
  }
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
    params.set("id", track.id || track.track_id || track.streamId);
  } else if (track.platform === "soundcloud") {
    params.set("url", track.url || track.track_id || track.streamId);
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
  toWebStream: (nodeStream) =>
    Readable.toWeb(nodeStream, { strategy: { highWaterMark: 1024 * 1024 } })
};
