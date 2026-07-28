const { buildStreamUrl, ensureYtDlp } = require("../services/streamService");

async function searchYouTube(query) {
  if (!query?.trim()) return [];

  try {
    const ytDlp = await ensureYtDlp();
    const result = await ytDlp.execPromise([`ytsearch20:${query}`, "-j"]);

    const lines = result.trim().split("\n");
    return lines.map(line => {
      try {
        const v = JSON.parse(line);
        return {
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail,
          duration: v.duration_string || "0:00",
          source: "YouTube",
          platform: "youtube"
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.error("[youtubeResolver] search failed:", err.message);
    return [];
  }
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
