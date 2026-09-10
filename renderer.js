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
let volumeSlider;
let volumeValue;
let muteBtn;
let lastVolume = 80;

// =========================
// INIT
// =========================
window.onload = () => {
  audio = document.getElementById("player");
  progress = document.getElementById("progress");
  time = document.getElementById("time");
  volumeSlider = document.getElementById("volume");
  volumeValue = document.getElementById("volumeValue");
  muteBtn = document.getElementById("muteBtn");

  if (audio && volumeSlider) {
    audio.volume = volumeSlider.value / 100;
  }

  loadPlaylists();
  bindPlayerEvents();
  bindVolumeEvents();

  // expose global functions (IMPORTANT)
  window.togglePlay = togglePlay;
  window.toggleMute = toggleMute;
  window.nextSong = nextSong;
  window.prevSong = prevSong;
  window.showTab = showTab;
  window.search = search;
  window.createPlaylist = createPlaylist;
  window.createPlaylistInstant = createPlaylistInstant;
  window.openRenameModal = openRenameModal;
  window.closeRenameModal = closeRenameModal;
  window.submitRenamePlaylist = submitRenamePlaylist;
  window.deleteCurrentPlaylist = deleteCurrentPlaylist;
  window.playCurrentPlaylistAll = playCurrentPlaylistAll;
  window.createPlaylistAndAddCurrentTrack = createPlaylistAndAddCurrentTrack;
  window.closePlaylistModal = closePlaylistModal;
  window.closeConfirmModal = closeConfirmModal;
};

// =========================
// TAB SWITCHING
// =========================
function showTab(tabName) {
  const searchView = document.getElementById("searchView");
  const playlistView = document.getElementById("playlistView");
  const navSearch = document.getElementById("navSearch");
  const navPlaylist = document.getElementById("navPlaylist");

  if (tabName === "search") {
    searchView?.classList.remove("hidden");
    playlistView?.classList.add("hidden");
    navSearch?.classList.add("active");
    navPlaylist?.classList.remove("active");
  } else {
    searchView?.classList.add("hidden");
    playlistView?.classList.remove("hidden");
    navSearch?.classList.remove("active");
    navPlaylist?.classList.add("active");
  }
}

// =========================
// VOLUME & MUTE
// =========================
function bindVolumeEvents() {
  if (!volumeSlider || !audio) return;

  volumeSlider.addEventListener("input", () => {
    const val = parseInt(volumeSlider.value, 10);
    audio.volume = val / 100;
    if (volumeValue) volumeValue.textContent = `${val}%`;
    if (muteBtn) muteBtn.textContent = val === 0 ? "🔇" : "🔊";
  });
}

function toggleMute() {
  if (!audio || !volumeSlider) return;

  if (audio.volume > 0) {
    lastVolume = volumeSlider.value > 0 ? volumeSlider.value : 80;
    audio.volume = 0;
    volumeSlider.value = 0;
    if (volumeValue) volumeValue.textContent = "0%";
    if (muteBtn) muteBtn.textContent = "🔇";
  } else {
    const restoreVal = lastVolume > 0 ? lastVolume : 80;
    audio.volume = restoreVal / 100;
    volumeSlider.value = restoreVal;
    if (volumeValue) volumeValue.textContent = `${restoreVal}%`;
    if (muteBtn) muteBtn.textContent = "🔊";
  }
}

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

function updateNowPlayingUI(track, statusText) {
  const defaultArt = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%231565c0'/><text x='50%' y='55%' font-size='48' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff'>🎵</text></svg>";
  const thumb = track?.thumbnail || defaultArt;
  const title = track?.title ? `${statusText}: ${track.title}` : "Belum ada lagu";
  const platform = track?.source || track?.platform || "-";

  const playerArt = document.getElementById("playerAlbumArt");
  const cardArt = document.getElementById("cardArt");
  const cardTitle = document.getElementById("cardTitle");
  const cardPlatform = document.getElementById("cardPlatform");
  const nowPlayingEl = document.getElementById("nowPlaying");

  if (playerArt) playerArt.src = thumb;
  if (cardArt) cardArt.src = thumb;
  if (cardTitle) cardTitle.textContent = track?.title || "Belum ada lagu";
  if (cardPlatform) cardPlatform.textContent = platform;
  if (nowPlayingEl) nowPlayingEl.textContent = title;
}

// =========================
// PLAY TRACK
// =========================
async function playTrack(track, startTime = 0) {
  const token = ++loadToken;

  nowPlayingTrack = track;
  playbackOffset = startTime;
  rememberTrackDuration(track);

  updateNowPlayingUI(track, startTime > 0 ? "Seeking" : "Loading");

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
    } catch {}
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
    updateNowPlayingUI(track, "Now Playing");

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
  list.innerHTML = "<li class='empty-state'>Searching YouTube & SoundCloud...</li>";

  try {
    const results = await window.api.searchAll(query);
    list.innerHTML = "";

    if (!results || results.length === 0) {
      list.innerHTML = "<li class='empty-state'>Tidak ada hasil ditemukan.</li>";
      return;
    }

    results.forEach((track) => {
      const li = document.createElement("li");
      li.className = "track-item";

      const thumbImg = document.createElement("img");
      thumbImg.className = "track-thumb";
      thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%231565c0'/><text x='50%' y='55%' font-size='22' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff'>🎵</text></svg>";
      thumbImg.alt = "Thumb";

      const detailsDiv = document.createElement("div");
      detailsDiv.className = "track-details";

      const titleSpan = document.createElement("span");
      titleSpan.className = "track-title-text";
      titleSpan.textContent = track.title;

      const metaRow = document.createElement("div");
      metaRow.className = "track-meta-row";

      const platformClass = (track.platform || track.source || "").toLowerCase();
      const badge = document.createElement("span");
      badge.className = `badge-platform ${platformClass.includes("youtube") ? "youtube" : "soundcloud"}`;
      badge.textContent = track.source || "Audio";

      const durSpan = document.createElement("span");
      durSpan.textContent = track.duration ? `⏱ ${track.duration}` : "";

      metaRow.appendChild(badge);
      metaRow.appendChild(durSpan);

      detailsDiv.appendChild(titleSpan);
      detailsDiv.appendChild(metaRow);

      detailsDiv.onclick = async () => {
        try {
          await playTrack(track, 0);
        } catch (err) {
          console.error(err);
          alert("Gagal memutar lagu: " + err.message);
          updateNowPlayingUI(null, "Now Playing");
        }
      };

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "track-actions";

      const addBtn = document.createElement("button");
      addBtn.className = "xp-btn";
      addBtn.textContent = "➕ Playlist";
      addBtn.onclick = (e) => {
        e.stopPropagation();
        selectedTrackForPlaylist = track;
        openPlaylistModal();
      };

      actionsDiv.appendChild(addBtn);

      li.appendChild(thumbImg);
      li.appendChild(detailsDiv);
      li.appendChild(actionsDiv);
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = "<li class='empty-state'>Gagal mencari lagu: " + err.message + "</li>";
  }
}

// =========================
// =========================
// PLAYLIST (Spotify Style UX Flow)
// =========================
async function createPlaylist() {
  return createPlaylistInstant();
}

async function createPlaylistInstant() {
  const playlists = await window.api.getPlaylists();
  const nextNum = (playlists ? playlists.length : 0) + 1;
  const defaultName = `Playlist Baru #${nextNum}`;

  const res = await window.api.createPlaylist(defaultName);
  await loadPlaylists();

  if (res && res.lastInsertRowid) {
    showTab("playlist");
    await openPlaylist(res.lastInsertRowid, defaultName);
  }
}

async function loadPlaylists() {
  const playlists = await window.api.getPlaylists();

  const ul = document.getElementById("playlists");
  if (!ul) return;
  ul.innerHTML = "";

  if (!playlists || playlists.length === 0) {
    ul.innerHTML = "<li class='empty-state'>Belum ada playlist</li>";
    document.getElementById("playlistActions")?.classList.add("hidden");
    return;
  }

  playlists.forEach((p) => {
    const li = document.createElement("li");
    li.dataset.id = p.id;
    li.className = "sidebar-playlist-item";
    if (selectedPlaylistId === p.id) {
      li.classList.add("active");
      document.getElementById("playlistActions")?.classList.remove("hidden");
    }

    const iconSpan = document.createElement("span");
    iconSpan.className = "playlist-icon";
    iconSpan.textContent = "🎵";

    const nameSpan = document.createElement("span");
    nameSpan.className = "playlist-name-text";
    nameSpan.textContent = p.name;

    li.appendChild(iconSpan);
    li.appendChild(nameSpan);

    li.onclick = () => {
      showTab("playlist");
      openPlaylist(p.id, p.name);
      document.querySelectorAll("#playlists li").forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
    };

    ul.appendChild(li);
  });
}

async function openPlaylist(id, name) {
  selectedPlaylistId = id;
  currentPlaylist = await window.api.getPlaylistTracks(id);
  currentIndex = 0;

  const titleEl = document.getElementById("selectedPlaylistTitle");
  if (titleEl && name) titleEl.textContent = name;

  const countEl = document.getElementById("heroTrackCount");
  if (countEl) {
    const count = currentPlaylist ? currentPlaylist.length : 0;
    countEl.textContent = `${count} lagu`;
  }

  document.getElementById("playlistActions")?.classList.remove("hidden");
  renderPlaylistTracks();
}

function playCurrentPlaylistAll() {
  if (!currentPlaylist || currentPlaylist.length === 0) {
    alert("Playlist ini tidak memiliki lagu.");
    return;
  }
  playFromPlaylist(0);
}

function openRenameModal() {
  if (!selectedPlaylistId) return;
  const modal = document.getElementById("renameModal");
  const input = document.getElementById("renameInput");
  const titleEl = document.getElementById("selectedPlaylistTitle");
  const currentName = titleEl ? titleEl.textContent : "";

  if (input) input.value = currentName;
  modal?.classList.remove("hidden");
  setTimeout(() => input?.focus(), 100);
}

function closeRenameModal() {
  document.getElementById("renameModal")?.classList.add("hidden");
}

async function submitRenamePlaylist() {
  if (!selectedPlaylistId) return;
  const input = document.getElementById("renameInput");
  const newName = input?.value?.trim();
  if (!newName) return;

  await window.api.renamePlaylist(selectedPlaylistId, newName);
  closeRenameModal();

  const titleEl = document.getElementById("selectedPlaylistTitle");
  if (titleEl) titleEl.textContent = newName;

  await loadPlaylists();
}

async function deleteCurrentPlaylist() {
  if (!selectedPlaylistId) return;
  const titleEl = document.getElementById("selectedPlaylistTitle");
  const currentName = titleEl ? titleEl.textContent : "playlist ini";

  if (!confirm(`Apakah Anda yakin ingin menghapus "${currentName}"?`)) return;

  await window.api.deletePlaylist(selectedPlaylistId);
  selectedPlaylistId = null;

  document.getElementById("playlistActions")?.classList.add("hidden");
  if (titleEl) titleEl.textContent = "Pilih Playlist";

  const countEl = document.getElementById("heroTrackCount");
  if (countEl) countEl.textContent = "Pilih playlist di sidebar untuk melihat lagu";

  const ul = document.getElementById("playlistTracks");
  if (ul) ul.innerHTML = "<li class='empty-state'>Pilih playlist di sebelah kiri untuk melihat daftar lagu.</li>";

  await loadPlaylists();
}

async function createPlaylistAndAddCurrentTrack() {
  if (!selectedTrackForPlaylist) return;

  const playlists = await window.api.getPlaylists();
  const nextNum = (playlists ? playlists.length : 0) + 1;
  const defaultName = `Playlist Baru #${nextNum}`;

  const res = await window.api.createPlaylist(defaultName);
  if (res && res.lastInsertRowid) {
    await window.api.addTrack(res.lastInsertRowid, selectedTrackForPlaylist);
    closePlaylistModal();
    alert(`Playlist "${defaultName}" berhasil dibuat dan lagu telah ditambahkan!`);
    await loadPlaylists();
  }
}

// =========================
// RENDER PLAYLIST TRACKS
// =========================
function renderPlaylistTracks() {
  const ul = document.getElementById("playlistTracks");
  if (!ul) return;
  ul.innerHTML = "";

  if (!currentPlaylist || currentPlaylist.length === 0) {
    ul.innerHTML = "<li class='empty-state'>Playlist ini belum memiliki lagu.</li>";
    return;
  }

  currentPlaylist.forEach((track, index) => {
    const li = document.createElement("li");
    li.className = "track-item";

    const thumbImg = document.createElement("img");
    thumbImg.className = "track-thumb";
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%231565c0'/><text x='50%' y='55%' font-size='22' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff'>🎵</text></svg>";
    thumbImg.alt = "Thumb";

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "track-details";

    const titleSpan = document.createElement("span");
    titleSpan.className = "track-title-text";
    titleSpan.textContent = track.title;

    const metaRow = document.createElement("div");
    metaRow.className = "track-meta-row";

    const platformClass = (track.platform || track.source || "").toLowerCase();
    const badge = document.createElement("span");
    badge.className = `badge-platform ${platformClass.includes("youtube") ? "youtube" : "soundcloud"}`;
    badge.textContent = track.source || "Audio";

    const durSpan = document.createElement("span");
    durSpan.textContent = track.duration ? `⏱ ${track.duration}` : "";

    metaRow.appendChild(badge);
    metaRow.appendChild(durSpan);

    detailsDiv.appendChild(titleSpan);
    detailsDiv.appendChild(metaRow);

    detailsDiv.onclick = () => playFromPlaylist(index);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "track-actions";

    const playBtn = document.createElement("button");
    playBtn.className = "xp-btn primary";
    playBtn.textContent = "▶";
    playBtn.onclick = (e) => {
      e.stopPropagation();
      playFromPlaylist(index);
    };

    const delBtn = document.createElement("button");
    delBtn.className = "xp-btn danger";
    delBtn.textContent = "❌";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      openConfirmModal(track);
    };

    actionsDiv.appendChild(playBtn);
    actionsDiv.appendChild(delBtn);

    li.appendChild(thumbImg);
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);
    ul.appendChild(li);
  });

  highlightActiveTrack();
}

// =========================
// PLAY QUEUE
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
    updateNowPlayingUI(null, "Now Playing");
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
    if (i === currentIndex) {
      el.style.borderLeft = "4px solid #1565c0";
      el.style.background = "#e3f2fd";
    } else {
      el.style.borderLeft = "";
      el.style.background = "";
    }
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

  playlists.forEach((p) => {
    const li = document.createElement("li");
    li.textContent = p.name;

    li.onclick = async () => {
      await window.api.addTrack(p.id, selectedTrackForPlaylist);
      closePlaylistModal();
      alert(`Lagu berhasil ditambahkan ke playlist: ${p.name}`);
    };

    list.appendChild(li);
  });

  modal?.classList.remove("hidden");
}

function closePlaylistModal() {
  document.getElementById("playlistModal")?.classList.add("hidden");
  selectedTrackForPlaylist = null;
}

// =========================
// CONFIRM DELETE
// =========================
function openConfirmModal(track) {
  trackToDelete = track;

  document.getElementById("confirmModal")?.classList.remove("hidden");
  const confirmText = document.getElementById("confirmText");
  if (confirmText) confirmText.textContent = `Apakah kamu yakin ingin menghapus "${track.title}" dari playlist?`;
}

function closeConfirmModal() {
  document.getElementById("confirmModal")?.classList.add("hidden");
  trackToDelete = null;
}

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