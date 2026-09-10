let selectedPlaylistId = null;
let selectedTrackForPlaylist = null;
let currentPlaylist = [];
let currentIndex = 0;
let trackToDelete = null;

let isPlaying = false;
let isSeeking = false;
let playbackOffset = 0;
let nowPlayingTrack = null;
let trackDurationSec = 0;
let loadToken = 0;
let pendingPlay = null;

// =========================
// DOM (HARUS di dalam window.onload)
// =========================
let audio;
let progress;
let time;

// =========================
// INIT
// =========================
window.onload = () => {
  audio = document.getElementById("player");
  progress = document.getElementById("progress");
  time = document.getElementById("time");

  loadPlaylists();
  bindPlayerEvents();

  // expose global function (IMPORTANT)
  window.togglePlay = togglePlay;
  window.nextSong = nextSong;
  window.prevSong = prevSong;
};

function togglePlay() {
  if (!audio) return console.error("Audio not ready");

  if (audio.paused) {
    audio.play();
    isPlaying = true;
  } else {
    audio.pause();
    isPlaying = false;
  }
}

function parseDuration(value) {
  if (!value) return 0;
  if (typeof value === "number" && isFinite(value)) return value;

  const parts = String(value).split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function rememberTrackDuration(track) {
  const fromMeta = parseDuration(track?.duration);
  trackDurationSec = fromMeta > 0 ? fromMeta : 0;
}

function getTotalDuration() {
  if (trackDurationSec > 0) return trackDurationSec;

  const remaining = audio.duration;
  if (isFinite(remaining) && remaining > 0) {
    return playbackOffset + remaining;
  }

  return 0;
}

function getDisplayTime() {
  return playbackOffset + audio.currentTime;
}

// =========================
// PLAYER EVENTS
// =========================
function bindPlayerEvents() {
  audio.addEventListener("timeupdate", () => {
    if (!isSeeking) {
      const total = getTotalDuration();
      const current = getDisplayTime();

      progress.value = total > 0 ? (current / total) * 100 : 0;

      time.textContent =
        `${formatTime(current)} / ${formatTime(total)}`;
    }
  });

  audio.onended = () => {
    nextSong();
  };

  progress.addEventListener("input", () => {
    isSeeking = true;

    const total = getTotalDuration();
    const seekTime = (progress.value / 100) * total;

    time.textContent =
      `${formatTime(seekTime)} / ${formatTime(total)}`;
  });

  progress.addEventListener("change", async () => {
    if (!nowPlayingTrack) {
      isSeeking = false;
      return;
    }

    const total = getTotalDuration();
    if (total <= 0) {
      isSeeking = false;
      return;
    }

    const seekTime = (progress.value / 100) * total;
    const current = getDisplayTime();

    isSeeking = false;

    // Hindari reload stream jika perubahan terlalu kecil
    if (Math.abs(seekTime - current) < 1.5) return;

    // Fast local seek jika target ada dalam buffer HTML5 audio
    const localTime = seekTime - playbackOffset;
    if (localTime >= 0 && isTimeBuffered(audio, localTime)) {
      audio.currentTime = localTime;
      return;
    }

    try {
      await playTrack(nowPlayingTrack, seekTime);
    } catch (err) {
      if (isIgnorablePlayError(err)) return;
      console.warn("[Seeking failed, attempting fallback play from 0]", err.message);
      try {
        await playTrack(nowPlayingTrack, 0);
      } catch (fallbackErr) {
        if (isIgnorablePlayError(fallbackErr)) return;
        console.error("[Fallback play failed]", fallbackErr);
      }
    }
  });
}

function isTimeBuffered(audioEl, timeSec) {
  if (!audioEl || !audioEl.buffered) return false;
  for (let i = 0; i < audioEl.buffered.length; i++) {
    if (
      timeSec >= audioEl.buffered.start(i) &&
      timeSec <= audioEl.buffered.end(i)
    ) {
      return true;
    }
  }
  return false;
}

function isIgnorablePlayError(err) {
  if (!err) return true;
  if (err.name === "AbortError") return true;

  const msg = err.message || "";
  return (
    msg.includes("interrupted") ||
    msg.includes("aborted") ||
    msg.includes("cancelled")
  );
}

function waitForCanPlay(audioEl, token, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    if (token !== loadToken) {
      reject(new Error("cancelled"));
      return;
    }

    const cleanup = () => {
      clearTimeout(timer);
      audioEl.removeEventListener("canplay", onReady);
      audioEl.removeEventListener("loadeddata", onReady);
      audioEl.removeEventListener("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      const code = audioEl.error?.code;
      const msg =
        code === 4
          ? "Format audio tidak didukung"
          : code === 2
            ? "Jaringan error saat memuat stream"
            : "Gagal memuat audio";
      reject(new Error(msg));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Stream timeout — coba lagi"));
    }, timeoutMs);

    if (audioEl.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      cleanup();
      resolve();
      return;
    }

    audioEl.addEventListener("canplay", onReady);
    audioEl.addEventListener("loadeddata", onReady);
    audioEl.addEventListener("error", onError);
  });
}

// =========================
// PLAY TRACK
// =========================
async function playTrack(track, startTime = 0) {
  const token = ++loadToken;

  nowPlayingTrack = track;
  playbackOffset = startTime;
  rememberTrackDuration(track);

  document.getElementById("nowPlaying").textContent =
    startTime > 0 ? "Seeking: " + track.title : "Loading: " + track.title;

  const url = await window.api.getStream(track, startTime);
  if (!url) {
    alert("Stream tidak tersedia");
    return false;
  }

  if (token !== loadToken) return false;

  audio.pause();

  if (pendingPlay) {
    try {
      await pendingPlay;
    } catch {
      // play() interrupted by new load — expected during seek
    }
    pendingPlay = null;
  }

  audio.src = url;
  audio.load();

  const onMetadata = () => {
    if (
      playbackOffset === 0 &&
      isFinite(audio.duration) &&
      audio.duration > 0 &&
      trackDurationSec === 0
    ) {
      trackDurationSec = audio.duration;
    }
  };

  audio.addEventListener("loadedmetadata", onMetadata, { once: true });

  try {
    await waitForCanPlay(audio, token);
    if (token !== loadToken) return false;

    pendingPlay = audio.play();
    await pendingPlay;
    pendingPlay = null;

    if (token !== loadToken) return false;

    isPlaying = true;
    document.getElementById("nowPlaying").textContent =
      "Now Playing: " + track.title;

    return true;
  } catch (err) {
    pendingPlay = null;
    if (token !== loadToken || isIgnorablePlayError(err)) return false;
    throw err;
  }
}

// =========================
// SEARCH
// =========================
async function search() {
  const query = document.getElementById("search").value;
  if (!query || !query.trim()) return;

  const list = document.getElementById("results");
  list.innerHTML = "<li>Searching YouTube & SoundCloud...</li>";

  try {
    const results = await window.api.searchAll(query);
    list.innerHTML = "";

    if (!results || results.length === 0) {
      list.innerHTML = "<li>Tidak ada hasil ditemukan.</li>";
      return;
    }

    results.forEach(track => {
      const li = document.createElement("li");

      const title = document.createElement("span");
      const durStr = track.duration ? ` (${track.duration})` : "";
      title.textContent = `${track.title} - ${track.source}${durStr}`;

      title.onclick = async () => {
        try {
          await playTrack(track, 0);
        } catch (err) {
          console.error(err);
          alert("Gagal memutar lagu: " + err.message);
          document.getElementById("nowPlaying").textContent = "Now Playing: -";
        }
      };

    const btn = document.createElement("button");
    btn.textContent = "+";

    btn.onclick = (e) => {
      e.stopPropagation();
      selectedTrackForPlaylist = track;
      openPlaylistModal();
    };

    li.appendChild(title);
    li.appendChild(btn);
    list.appendChild(li);
  });
  } catch (err) {
    console.error(err);
    list.innerHTML = "<li>Gagal mencari lagu: " + err.message + "</li>";
  }
}

// =========================
// PLAYLIST
// =========================
async function createPlaylist() {
  const name = document.getElementById("playlistName").value;

  await window.api.createPlaylist(name);
  loadPlaylists();
}

async function loadPlaylists() {
  const playlists = await window.api.getPlaylists();

  const ul = document.getElementById("playlists");
  ul.innerHTML = "";

  playlists.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name;

    li.onclick = () => {
      selectedPlaylistId = p.id;
      openPlaylist(p.id);
    };

    ul.appendChild(li);
  });
}

async function openPlaylist(id) {
  currentPlaylist = await window.api.getPlaylistTracks(id);
  currentIndex = 0;

  renderPlaylistTracks();
}

// =========================
// RENDER PLAYLIST
// =========================
function renderPlaylistTracks() {
  const ul = document.getElementById("playlistTracks");
  ul.innerHTML = "";

  currentPlaylist.forEach((track, index) => {
    const li = document.createElement("li");

    const title = document.createElement("span");
    const durStr = track.duration ? ` (${track.duration})` : "";
    title.textContent = `${track.title} - ${track.source}${durStr}`;

    title.onclick = () => playFromPlaylist(index);

    const del = document.createElement("button");
    del.textContent = "❌";

    del.onclick = (e) => {
      e.stopPropagation();
      openConfirmModal(track);
    };

    li.appendChild(title);
    li.appendChild(del);
    ul.appendChild(li);
  });

  highlightActiveTrack();
}

// =========================
// PLAY
// =========================
async function playFromPlaylist(index) {
  currentIndex = index;

  const track = currentPlaylist[index];

  if (window.api.setQueue) {
    await window.api.setQueue(currentPlaylist, index);
  }

  try {
    await playTrack(track, 0);
    highlightActiveTrack();
  } catch (err) {
    console.error(err);
    alert("Gagal memutar lagu: " + err.message);
    document.getElementById("nowPlaying").textContent = "Now Playing: -";
  }
}

function nextSong() {
  if (currentIndex < currentPlaylist.length - 1) {
    playFromPlaylist(currentIndex + 1);
  }
}

function prevSong() {
  if (currentIndex > 0) {
    playFromPlaylist(currentIndex - 1);
  }
}

function highlightActiveTrack() {
  const items = document.querySelectorAll("#playlistTracks li");

  items.forEach((el, i) => {
    el.style.background = i === currentIndex ? "#444" : "";
    el.style.color = i === currentIndex ? "white" : "";
  });
}

// =========================
// MODAL PLAYLIST
// =========================
async function openPlaylistModal() {
  const playlists = await window.api.getPlaylists();

  const modal = document.getElementById("playlistModal");
  const list = document.getElementById("playlistSelection");

  list.innerHTML = "";

  playlists.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.name;

    li.onclick = async () => {
      await window.api.addTrack(p.id, selectedTrackForPlaylist);
      closePlaylistModal();
      alert(`Lagu berhasil ditambahkan ke playlist: ${p.name}`);
    };

    list.appendChild(li);
  });

  modal.classList.remove("hidden");
}

function closePlaylistModal() {
  document.getElementById("playlistModal").classList.add("hidden");
  selectedTrackForPlaylist = null;
}

// =========================
// CONFIRM DELETE
// =========================
function openConfirmModal(track) {
  trackToDelete = track;

  document.getElementById("confirmModal")
    .classList.remove("hidden");

  document.getElementById("confirmText")
    .textContent = `Hapus "${track.title}"?`;
}

function closeConfirmModal() {
  document.getElementById("confirmModal")
    .classList.add("hidden");

  trackToDelete = null;
}

// attach once (IMPORTANT FIX)
document.getElementById("confirmYes").onclick = async () => {
  if (!trackToDelete) return;

  await window.api.deleteTrack(trackToDelete.id);

  await openPlaylist(selectedPlaylistId);

  closeConfirmModal();
};

// =========================
// UTIL
// =========================
function formatTime(sec) {
  if (!sec) return "0:00";

  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);

  return `${m}:${s.toString().padStart(2, "0")}`;
}