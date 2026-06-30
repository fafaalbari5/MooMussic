let selectedPlaylistId = null;
let selectedTrackForPlaylist = null;
let currentPlaylist = [];
let currentIndex = 0;
let trackToDelete = null;

let isPlaying = false;
let isSeeking = false;

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

// =========================
// PLAYER EVENTS
// =========================
function bindPlayerEvents() {
  audio.addEventListener("timeupdate", () => {
    if (!isSeeking) {
      const current = audio.currentTime;
      const duration = audio.duration || 0;

      progress.value = (current / duration) * 100 || 0;

      time.textContent =
        `${formatTime(current)} / ${formatTime(duration)}`;
    }
  });

  audio.onended = () => {
    nextSong();
  };

  progress.addEventListener("input", () => {
    isSeeking = true;

    const seekTime =
      (progress.value / 100) * audio.duration;

    time.textContent =
      `${formatTime(seekTime)} / ${formatTime(audio.duration)}`;
  });

  progress.addEventListener("change", () => {
    audio.currentTime =
      (progress.value / 100) * audio.duration;

    isSeeking = false;
  });
}

// =========================
// SEARCH
// =========================
async function search() {
  const query = document.getElementById("search").value;

  const results = await window.api.searchAll(query);

  const list = document.getElementById("results");
  list.innerHTML = "";

  results.forEach(track => {
    const li = document.createElement("li");

    const title = document.createElement("span");
    title.textContent = `${track.title} - ${track.source}`;

    title.onclick = async () => {
  const url = await window.api.getStream(track);

  if (!url) return alert("Stream tidak tersedia");

  audio.src = url;
  await audio.play();
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
    title.textContent = `${track.title} - ${track.source}`;

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

  const url = await window.api.getStream(track);

  if (!url) {
    alert("Stream tidak tersedia");
    return;
  }

  audio.src = url;
  await audio.play();

  document.getElementById("nowPlaying").textContent =
    "Now Playing: " + track.title;

  highlightActiveTrack();
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