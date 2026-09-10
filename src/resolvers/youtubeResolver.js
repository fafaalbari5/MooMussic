const play = require("play-dl");
const { buildStreamUrl, ensureYtDlp } = require("../services/streamService");

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function searchYouTubeViaYtDlp(query) {
  try {
    const ytDlp = await ensureYtDlp();
    const output = await ytDlp.execPromise([
      `ytsearch15:${query}`,
      "--flat-playlist",
      "-j",
      "--no-warnings"
    ]);

    const lines = output.trim().split("\n");
    return lines
      .map((line) => {
        try {
          const v = JSON.parse(line);
          if (!v || !v.id) return null;

          const dur =
            v.duration_string ||
            (typeof v.duration === "number"
              ? formatDuration(v.duration)
              : "0:00");

          return {
            id: v.id,
            title: v.title,
            thumbnail:
              v.thumbnails?.[0]?.url ||
              v.thumbnail ||
              `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            duration: dur,
            source: "YouTube",
            platform: "youtube"
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (err) {
    console.error("[youtubeResolver] yt-dlp fallback search failed:", err.message);
    return [];
  }
}

async function searchYouTube(query) {
  if (!query?.trim()) return [];

  try {
    const results = await play.search(query, {
      limit: 15,
      source: { youtube: "video" }
    });

    if (results && results.length > 0) {
      return results.map((v) => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnails?.[0]?.url || v.thumbnail,
        duration: v.durationRaw || "0:00",
        source: "YouTube",
        platform: "youtube"
      }));
    }
  } catch (err) {
    console.warn(
      "[youtubeResolver] play.search failed, falling back to yt-dlp:",
      err.message
    );
  }

  // Fallback ke yt-dlp jika play.search gagal atau melempar error
  return searchYouTubeViaYtDlp(query);
}

function getStreamUrl(track, startTime = 0) {
  const id = track?.streamId || track?.track_id || track?.id;
  if (!id) return null;

  return buildStreamUrl(
    { platform: "youtube", id },
    startTime
  );
}

module.exports = {
  searchYouTube,
  getStreamUrl
};
