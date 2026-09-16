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

let isShuffle = false;
let repeatMode = 0; // 0 = Off, 1 = All, 2 = One
let shuffledIndices = [];

let manualQueue = [];

// =========================
// STATE PERSISTENCE
// =========================
function saveState() {
  const state = {
    volume: volumeSlider ? volumeSlider.value : 80,
    isShuffle,
    repeatMode,
    selectedPlaylistId,
    activeTab: document.querySelector('.tab-view.active')?.id.replace('View', '') || 'search'
  };
  localStorage.setItem('moomussic_state', JSON.stringify(state));
}

async function loadState() {
  const saved = localStorage.getItem('moomussic_state');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      if (state.volume !== undefined && volumeSlider && audio) {
        volumeSlider.value = state.volume;
        audio.volume = state.volume / 100;
        if (volumeValue) volumeValue.textContent = state.volume + '%';
        const volUpSVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        const volOffSVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
        if (muteBtn) muteBtn.innerHTML = state.volume == 0 ? volOffSVG : volUpSVG;
      }
      if (state.isShuffle) {
        isShuffle = false; 
        toggleShuffle();
      }
      if (state.repeatMode) {
        repeatMode = state.repeatMode - 1; 
        toggleRepeat();
      }
      if (state.selectedPlaylistId) {
        selectedPlaylistId = state.selectedPlaylistId;
      }
      if (state.activeTab) {
        showTab(state.activeTab);
      }
    } catch (e) {
      console.error(e);
    }
  }
}


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
window.addEventListener("DOMContentLoaded", async () => {
  audio = document.getElementById("player");
  progress = document.getElementById("progress");
  time = document.getElementById("time");
  volumeSlider = document.getElementById("volume");
  volumeValue = document.getElementById("volumeValue");
  muteBtn = document.getElementById("muteBtn");

  if (audio) {
    audio.volume = 0.8;
  }

  await loadState();

  bindPlayerEvents();
  bindVolumeEvents();
  await loadPlaylists();

  if (selectedPlaylistId) {
    const playlists = await window.api.getPlaylists();
    const pl = playlists.find(p => p.id === selectedPlaylistId);
    if (pl) await openPlaylist(pl.id, pl.name);
  }


  // Media Session Controls
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);
  }

  // Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    // Ignore if typing in input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    
    switch(e.code) {
      case "Space":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (audio && isPlaying) audio.currentTime += 5;
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (audio && isPlaying) audio.currentTime -= 5;
        break;
    }
  });

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
  window.toggleShuffle = toggleShuffle;
    window.toggleRepeat = toggleRepeat;
  window.toggleMiniPlayerUI = toggleMiniPlayerUI;
});

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
    document.getElementById("queueView")?.classList.add("hidden");
    navSearch?.classList.add("active");
    navPlaylist?.classList.remove("active");
  } else if (tabName === "playlist") {
    searchView?.classList.add("hidden");
    playlistView?.classList.remove("hidden");
    document.getElementById("queueView")?.classList.add("hidden");
    navSearch?.classList.remove("active");
    navPlaylist?.classList.add("active");
  } else if (tabName === "queue") {
    searchView?.classList.add("hidden");
    playlistView?.classList.add("hidden");
    document.getElementById("queueView")?.classList.remove("hidden");
    navSearch?.classList.remove("active");
    navPlaylist?.classList.remove("active");
    if(typeof renderQueue === 'function') renderQueue();
  }
  if (typeof saveState === 'function') saveState();
}

// =========================
// VOLUME & MUTE
// =========================
function bindVolumeEvents() {
  if (!volumeSlider || !audio) return;

  const volUpSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const volOffSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  volumeSlider.addEventListener("input", () => {
    const val = parseInt(volumeSlider.value, 10);
    audio.volume = val / 100;
    if (volumeValue) volumeValue.textContent = `${val}%`;
    if (muteBtn) muteBtn.innerHTML = val === 0 ? volOffSVG : volUpSVG;
    if (typeof saveState === 'function') saveState();
  });
}

function toggleMute() {
  if (!audio || !volumeSlider) return;

  const volUpSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const volOffSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

  if (audio.volume > 0) {
    lastVolume = volumeSlider.value > 0 ? volumeSlider.value : 80;
    audio.volume = 0;
    volumeSlider.value = 0;
    if (volumeValue) volumeValue.textContent = "0%";
    if (muteBtn) muteBtn.innerHTML = volOffSVG;
  } else {
    const restoreVal = lastVolume > 0 ? lastVolume : 80;
    audio.volume = restoreVal / 100;
    volumeSlider.value = restoreVal;
    if (volumeValue) volumeValue.textContent = `${restoreVal}%`;
    if (muteBtn) muteBtn.innerHTML = volUpSVG;
  }
}

function togglePlay() {
  if (!audio) return console.error("Audio not ready");

  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");

  if (audio.paused) {
    audio.play();
    isPlaying = true;
    if (iconPlay) iconPlay.classList.add("hidden");
    if (iconPause) iconPause.classList.remove("hidden");
  } else {
    audio.pause();
    isPlaying = false;
    if (iconPlay) iconPlay.classList.remove("hidden");
    if (iconPause) iconPause.classList.add("hidden");
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

  audio.addEventListener("play", () => {
    isPlaying = true;
    const iconPlay = document.getElementById("iconPlay");
    const iconPause = document.getElementById("iconPause");
    if (iconPlay) iconPlay.classList.add("hidden");
    if (iconPause) iconPause.classList.remove("hidden");
  });

  audio.addEventListener("pause", () => {
    isPlaying = false;
    const iconPlay = document.getElementById("iconPlay");
    const iconPause = document.getElementById("iconPause");
    if (iconPlay) iconPlay.classList.remove("hidden");
    if (iconPause) iconPause.classList.add("hidden");
  });

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

  if (
    err.message?.includes("The play() request was interrupted") ||
    err.message?.includes("The fetching process for the media resource was aborted") ||
    err.message?.includes("PIPELINE_ERROR_ABORT") ||
    err.message?.includes("Failed to load because no supported source was found") ||
    err.message?.includes("net::ERR_ABORTED") ||
    err.message?.includes("fetch stream failed")
  ) {
    return true;
  }

  return false;
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
// UI UPDATES
// =========================
function updateNowPlayingUI(track, statusText) {
  const defaultArt = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%231565c0'/><path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' fill='%23ffffff' transform='translate(36, 36) scale(2)'/></svg>";
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

  if ('mediaSession' in navigator && track) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: platform,
      artwork: [{ src: thumb, sizes: '512x512', type: 'image/png' }]
    });
  }
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
      thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%231565c0'/><path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' fill='%23ffffff' transform='translate(10, 10) scale(1)'/></svg>";
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

      const playBtn = document.createElement("button");
      playBtn.className = "xp-btn primary";
      playBtn.textContent = "▶";
      playBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          await playTrack(track, 0);
        } catch (err) {
          console.error(err);
          alert("Gagal memutar lagu: " + err.message);
          updateNowPlayingUI(null, "Now Playing");
        }
      };

      
      const addBtn = document.createElement("button");
      addBtn.className = "xp-btn";
      addBtn.innerHTML = "<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'currentColor\' style=\'vertical-align: middle; margin-right:4px;\'><path d=\'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\'/></svg>Playlist";
      addBtn.onclick = (e) => {
        e.stopPropagation();
        selectedTrackForPlaylist = track;
        openPlaylistModal();
      };

      const queueBtn = document.createElement("button");
      queueBtn.className = "xp-btn";
      queueBtn.innerHTML = "<svg viewBox=\'0 0 24 24\' width=\'14\' height=\'14\' fill=\'currentColor\' style=\'vertical-align: middle; margin-right:4px;\'><path d=\'M4 10h12v2H4zm0-4h16v2H4zm0 8h8v2H4z\'/></svg>Antre";
      queueBtn.onclick = (e) => {
        e.stopPropagation();
        addToQueue(track);
      };

      actionsDiv.appendChild(playBtn);
      actionsDiv.appendChild(queueBtn);
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
    iconSpan.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;

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

    li.draggable = true;
    li.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', i);
      e.dataTransfer.setData('type', 'playlist');
      li.style.opacity = '0.5';
    };
    li.ondragend = (e) => {
      li.style.opacity = '1';
    };
    li.ondragover = (e) => {
      e.preventDefault();
      li.style.borderTop = "2px dashed #1565c0";
    };
    li.ondragleave = (e) => {
      li.style.borderTop = "";
    };
    li.ondrop = async (e) => {
      e.preventDefault();
      li.style.borderTop = "";
      const type = e.dataTransfer.getData('type');
      if (type !== 'playlist') return;
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = i;
      if (fromIdx === toIdx) return;
      
      const track = currentPlaylist.splice(fromIdx, 1)[0];
      currentPlaylist.splice(toIdx, 0, track);
      
      // Update DB
      const trackIds = currentPlaylist.map(t => t.id);
      await window.api.reorderPlaylistTracks(selectedPlaylistId, trackIds);
      
      // Update currentIndex if needed
      if (currentIndex === fromIdx) {
        currentIndex = toIdx;
      } else if (currentIndex > fromIdx && currentIndex <= toIdx) {
        currentIndex--;
      } else if (currentIndex < fromIdx && currentIndex >= toIdx) {
        currentIndex++;
      }
      
      renderPlaylistTracks();
    };

    ul.appendChild(li);
  });
}

async function openPlaylist(id, name) {
  selectedPlaylistId = id;
  await loadPlaylists();

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
  playFromPlaylist(0, true);
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

  if (confirm("Apakah kamu yakin ingin menghapus playlist ini secara permanen?")) {
    await window.api.deletePlaylist(selectedPlaylistId);
    selectedPlaylistId = null;
    currentPlaylist = [];
    document.getElementById("playlistActions")?.classList.add("hidden");
    await loadPlaylists();

    const tracksUl = document.getElementById("playlistTracks");
    if (tracksUl) tracksUl.innerHTML = "<li class='empty-state'>Pilih playlist di menu samping.</li>";

    const titleEl = document.getElementById("selectedPlaylistTitle");
    if (titleEl) titleEl.textContent = "Pilih Playlist";

    const countEl = document.getElementById("heroTrackCount");
    if (countEl) countEl.textContent = "0 lagu";
  }
}

async function createPlaylistAndAddCurrentTrack() {
  if (!selectedTrackForPlaylist) return;

  const playlists = await window.api.getPlaylists();
  const nextNum = (playlists ? playlists.length : 0) + 1;
  const defaultName = `Playlist Baru #${nextNum}`;

  const res = await window.api.createPlaylist(defaultName);
  if (res && res.lastInsertRowid) {
    await window.api.addTrack(res.lastInsertRowid, selectedTrackForPlaylist);
    alert(`Sukses membuat "${defaultName}" dan menambahkan lagu.`);
    await loadPlaylists();
    closePlaylistModal();
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
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'><rect width='44' height='44' fill='%231565c0'/><path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' fill='%23ffffff' transform='translate(10, 10) scale(1)'/></svg>";
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

    detailsDiv.onclick = () => playFromPlaylist(index, true);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "track-actions";

    const playBtn = document.createElement("button");
    playBtn.className = "xp-btn primary";
    playBtn.textContent = "▶";
    playBtn.onclick = (e) => {
      e.stopPropagation();
      playFromPlaylist(index, true);
    };

    const delBtn = document.createElement("button");
    delBtn.className = "xp-btn danger";
    delBtn.textContent = "🗑 Hapus";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      openConfirmModal(track);
    };

    actionsDiv.appendChild(playBtn);
    actionsDiv.appendChild(delBtn);

    li.draggable = true;
    li.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", index);
      e.dataTransfer.setData("type", "playlist");
      li.style.opacity = "0.5";
    };
    li.ondragend = (e) => {
      li.style.opacity = "1";
    };
    li.ondragover = (e) => {
      e.preventDefault();
      li.style.borderTop = "2px dashed #1565c0";
    };
    li.ondragleave = (e) => {
      li.style.borderTop = "";
    };
    li.ondrop = async (e) => {
      e.preventDefault();
      li.style.borderTop = "";
      const type = e.dataTransfer.getData("type");
      if (type !== "playlist") return;
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const toIdx = index;
      if (fromIdx === toIdx) return;
      
      const track = currentPlaylist.splice(fromIdx, 1)[0];
      currentPlaylist.splice(toIdx, 0, track);
      
      const trackIds = currentPlaylist.map(t => t.id);
      await window.api.reorderPlaylistTracks(selectedPlaylistId, trackIds);
      
      if (currentIndex === fromIdx) {
        currentIndex = toIdx;
      } else if (currentIndex > fromIdx && currentIndex <= toIdx) {
        currentIndex--;
      } else if (currentIndex < fromIdx && currentIndex >= toIdx) {
        currentIndex++;
      }
      
      renderPlaylistTracks();
    };

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
async function playFromPlaylist(index, isUserInteraction = false) {
  currentIndex = index;

  if (isUserInteraction && isShuffle && currentPlaylist.length > 0) {
    if (shuffledIndices.length === 0) {
      shuffledIndices = Array.from({length: currentPlaylist.length}, (_, i) => i);
      for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
      }
    }
    const currentIdxPos = shuffledIndices.indexOf(currentIndex);
    if (currentIdxPos > -1) {
      shuffledIndices.splice(currentIdxPos, 1);
      shuffledIndices.unshift(currentIndex);
    }
  }

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

// =========================
// SHUFFLE & REPEAT
// =========================
function toggleShuffle() {
  isShuffle = !isShuffle;
  const btn = document.getElementById("btnShuffle");
  if (btn) btn.classList.toggle("active-state", isShuffle);
  
  if (isShuffle && currentPlaylist.length > 0) {
    shuffledIndices = Array.from({length: currentPlaylist.length}, (_, i) => i);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    const currentIdxPos = shuffledIndices.indexOf(currentIndex);
    if (currentIdxPos > -1) {
      shuffledIndices.splice(currentIdxPos, 1);
      shuffledIndices.unshift(currentIndex);
    }
  }
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  const btn = document.getElementById("btnRepeat");
  const iconAll = document.getElementById("iconRepeatAll");
  const iconOne = document.getElementById("iconRepeatOne");
  if (!btn || !iconAll || !iconOne) return;
  
  if (repeatMode === 0) {
    btn.classList.remove("active-state");
    iconAll.classList.remove("hidden");
    iconOne.classList.add("hidden");
    btn.title = "Ulangi (Mati)";
  } else if (repeatMode === 1) {
    btn.classList.add("active-state");
    iconAll.classList.remove("hidden");
    iconOne.classList.add("hidden");
    btn.title = "Ulangi Semua";
  } else if (repeatMode === 2) {
    btn.classList.add("active-state");
    iconAll.classList.add("hidden");
    iconOne.classList.remove("hidden");
    btn.title = "Ulangi Satu";
  }
}

function nextSong() {
  if (manualQueue.length > 0) {
    const track = manualQueue.shift();
    playTrack(track, 0);
    if(typeof renderQueue === 'function') renderQueue();
    if(typeof saveState === 'function') saveState();
    return;
  }
  if (currentPlaylist.length === 0) return;
  
  if (repeatMode === 2) {
    playFromPlaylist(currentIndex);
    return;
  }
  
  if (isShuffle) {
    let currentShuffledIdx = shuffledIndices.indexOf(currentIndex);
    if (currentShuffledIdx === -1 || currentShuffledIdx === shuffledIndices.length - 1) {
      if (repeatMode === 1) {
        toggleShuffle();
        toggleShuffle(); 
        playFromPlaylist(shuffledIndices[0]);
      }
    } else {
      playFromPlaylist(shuffledIndices[currentShuffledIdx + 1]);
    }
  } else {
    if (currentIndex >= currentPlaylist.length - 1) {
      if (repeatMode === 1) playFromPlaylist(0);
    } else {
      playFromPlaylist(currentIndex + 1);
    }
  }
}

function prevSong() {
  if (currentPlaylist.length === 0) return;
  
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  
  if (isShuffle) {
    let currentShuffledIdx = shuffledIndices.indexOf(currentIndex);
    if (currentShuffledIdx > 0) {
      playFromPlaylist(shuffledIndices[currentShuffledIdx - 1]);
    } else if (repeatMode === 1) {
      playFromPlaylist(shuffledIndices[shuffledIndices.length - 1]);
    }
  } else {
    if (currentIndex > 0) {
      playFromPlaylist(currentIndex - 1);
    } else if (repeatMode === 1) {
      playFromPlaylist(currentPlaylist.length - 1);
    }
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

// =========================
// RENDER QUEUE
// =========================
function renderQueue() {
  const ul = document.getElementById("queueTracks");
  if (!ul) return;
  ul.innerHTML = "";

  manualQueue.forEach((track, i) => {
    const li = document.createElement("li");
    li.className = "track-item";
    li.style.borderLeft = "4px solid #fbc02d";
    li.style.background = "#fff9c4";

    const thumbImg = document.createElement("img");
    thumbImg.className = "track-thumb";
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 44 44\'><rect width=\'44\' height=\'44\' fill=\'%231565c0\'/><path d=\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\' fill=\'%23ffffff\' transform=\'translate(10, 10) scale(1)\'/></svg>";
    
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "track-details";
    const titleSpan = document.createElement("span");
    titleSpan.className = "track-title-text";
    titleSpan.textContent = track.title;
    
    const metaRow = document.createElement("div");
    metaRow.className = "track-meta-row";
    const badge = document.createElement("span");
    badge.className = "badge-platform";
    badge.textContent = "Antrean Manual";
    metaRow.appendChild(badge);
    
    detailsDiv.appendChild(titleSpan);
    detailsDiv.appendChild(metaRow);
    detailsDiv.onclick = () => { manualQueue.splice(i, 1); playTrack(track, 0); renderQueue(); };

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "track-actions";
    
    const delBtn = document.createElement("button");
    delBtn.className = "xp-btn danger";
    delBtn.innerHTML = "<svg viewBox=\'0 0 24 24\' width=\'16\' height=\'16\' fill=\'currentColor\'><path d=\'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z\'/></svg>";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      manualQueue.splice(i, 1);
      renderQueue();
    };

    actionsDiv.appendChild(delBtn);
    li.appendChild(thumbImg);
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);

    li.draggable = true;
    li.ondragstart = (e) => {
      e.dataTransfer.setData('text/plain', i);
      e.dataTransfer.setData('type', 'queue');
      li.style.opacity = '0.5';
    };
    li.ondragend = (e) => {
      li.style.opacity = '1';
    };
    li.ondragover = (e) => {
      e.preventDefault();
      li.style.borderTop = "2px dashed #fbc02d";
    };
    li.ondragleave = (e) => {
      li.style.borderTop = "";
    };
    li.ondrop = (e) => {
      e.preventDefault();
      li.style.borderTop = "";
      const type = e.dataTransfer.getData('type');
      if (type !== 'queue') return;
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = i;
      if (fromIdx === toIdx) return;
      
      const track = manualQueue.splice(fromIdx, 1)[0];
      manualQueue.splice(toIdx, 0, track);
      
      renderQueue();
    };

    ul.appendChild(li);
  });

  let upcomingIndices = [];
  if (currentPlaylist.length > 0) {
    if (isShuffle) {
      const currentShuffledIdx = shuffledIndices.indexOf(currentIndex);
      if (currentShuffledIdx > -1) {
        upcomingIndices = shuffledIndices.slice(currentShuffledIdx + 1);
        if (repeatMode === 1) {
          upcomingIndices = upcomingIndices.concat(shuffledIndices.slice(0, currentShuffledIdx));
        }
      }
    } else {
      upcomingIndices = [];
      for (let i = currentIndex + 1; i < currentPlaylist.length; i++) upcomingIndices.push(i);
      if (repeatMode === 1) {
        for (let i = 0; i < currentIndex; i++) upcomingIndices.push(i);
      }
    }
  }

  if (upcomingIndices.length === 0 && manualQueue.length === 0) {
    ul.innerHTML = "<li class='empty-state'>Tidak ada lagu selanjutnya dalam antrean.</li>";
    return;
  }

  upcomingIndices.forEach((idx) => {
    const track = currentPlaylist[idx];
    if (!track) return;
    const li = document.createElement("li");
    li.className = "track-item";
    const thumbImg = document.createElement("img");
    thumbImg.className = "track-thumb";
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\' viewBox=\'0 0 44 44\'><rect width=\'44\' height=\'44\' fill=\'%231565c0\'/><path d=\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\' fill=\'%23ffffff\' transform=\'translate(10, 10) scale(1)\'/></svg>";
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "track-details";
    const titleSpan = document.createElement("span");
    titleSpan.className = "track-title-text";
    titleSpan.textContent = track.title;
    const metaRow = document.createElement("div");
    metaRow.className = "track-meta-row";
    const platformClass = (track.platform || track.source || "").toLowerCase();
    const badge = document.createElement("span");
    badge.className = "badge-platform " + (platformClass.includes("youtube") ? "youtube" : "soundcloud");
    badge.textContent = track.source || "Audio";
    const durSpan = document.createElement("span");
    durSpan.textContent = track.duration ? "? " + track.duration : "";
    metaRow.appendChild(badge);
    metaRow.appendChild(durSpan);
    detailsDiv.appendChild(titleSpan);
    detailsDiv.appendChild(metaRow);
    detailsDiv.onclick = () => playFromPlaylist(idx, true);
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "track-actions";
    const playBtn = document.createElement("button");
    playBtn.className = "xp-btn primary";
    playBtn.innerHTML = "<svg viewBox=\'0 0 24 24\' width=\'16\' height=\'16\' fill=\'currentColor\' style=\'vertical-align: middle;\'><path d=\'M8 5v14l11-7z\'/></svg>";
    playBtn.onclick = (e) => { e.stopPropagation(); playFromPlaylist(idx, true); };
    actionsDiv.appendChild(playBtn);

    li.draggable = true;
    li.ondragstart = (e) => {
      e.dataTransfer.setData("text/plain", idx);
      e.dataTransfer.setData("type", "upcoming");
      li.style.opacity = "0.5";
    };
    li.ondragend = (e) => {
      li.style.opacity = "1";
    };
    li.ondragover = (e) => {
      e.preventDefault();
      li.style.borderTop = "2px dashed #1565c0";
    };
    li.ondragleave = (e) => {
      li.style.borderTop = "";
    };
    li.ondrop = async (e) => {
      e.preventDefault();
      li.style.borderTop = "";
      const type = e.dataTransfer.getData("type");
      if (type !== "upcoming") return;
      
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const toIdx = idx;
      if (fromIdx === toIdx) return;

      if (isShuffle) {
        // Reorder shuffledIndices
        const fromPos = shuffledIndices.indexOf(fromIdx);
        const toPos = shuffledIndices.indexOf(toIdx);
        if (fromPos > -1 && toPos > -1) {
          const val = shuffledIndices.splice(fromPos, 1)[0];
          shuffledIndices.splice(toPos, 0, val);
        }
      } else {
        // Reorder currentPlaylist
        const track = currentPlaylist.splice(fromIdx, 1)[0];
        currentPlaylist.splice(toIdx, 0, track);
        
        // Update DB
        const trackIds = currentPlaylist.map(t => t.id);
        await window.api.reorderPlaylistTracks(selectedPlaylistId, trackIds);
        
        if (currentIndex === fromIdx) {
          currentIndex = toIdx;
        } else if (currentIndex > fromIdx && currentIndex <= toIdx) {
          currentIndex--;
        } else if (currentIndex < fromIdx && currentIndex >= toIdx) {
          currentIndex++;
        }
      }
      
      renderQueue();
    };

    li.appendChild(thumbImg);
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);
    ul.appendChild(li);
  });

}

window.addToQueue = function(track) {
  manualQueue.push(track);
  if(typeof renderQueue === 'function') renderQueue();
  alert('Lagu "' + track.title + '" ditambahkan ke antrean.');
};

let isMiniPlayer = false;
window.toggleMiniPlayerUI = function() {
  isMiniPlayer = !isMiniPlayer;
  if (isMiniPlayer) {
    document.body.classList.add("mini-player-active");
  } else {
    document.body.classList.remove("mini-player-active");
  }
  if (window.api.toggleMiniPlayer) {
    window.api.toggleMiniPlayer(isMiniPlayer);
  }
};
