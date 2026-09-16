const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

const saveLoadCode = `
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
`;

// Add variables and persistence
code = code.replace("let isSeeking = false;\nlet lastVolume = 80;", "let isSeeking = false;\nlet lastVolume = 80;\nlet manualQueue = [];\n" + saveLoadCode);

// Fix window.onload and add event listener
const newInit = `window.addEventListener("DOMContentLoaded", async () => {
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
`;
code = code.replace(/window\.onload = \(\) => \{[\s\S]+?bindVolumeEvents\(\);/, newInit);

// Fix the closing brace of window.onload (it was };) and add toggleMiniPlayerUI
const closingBraceRepl = `  window.toggleShuffle = toggleShuffle;
  window.toggleRepeat = toggleRepeat;
  window.toggleMiniPlayerUI = toggleMiniPlayerUI;
});

let isMiniPlayer = false;
function toggleMiniPlayerUI() {
  isMiniPlayer = !isMiniPlayer;
  if (isMiniPlayer) {
    document.body.classList.add("mini-player-active");
  } else {
    document.body.classList.remove("mini-player-active");
  }
  if (window.api.toggleMiniPlayer) {
    window.api.toggleMiniPlayer(isMiniPlayer);
  }
}`;
code = code.replace(/window\.toggleRepeat = toggleRepeat;\n\};/, closingBraceRepl);

// Update showTab
const showTabRepl = `function showTab(tabName) {
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
    renderQueue();
  }
  if (typeof saveState === 'function') saveState();
}`;
code = code.replace(/function showTab\(tabName\) \{[\s\S]+?navPlaylist\?\.classList\.add\("active"\);\n  \}\n\}/, showTabRepl);


// Inject saveState to functions
code = code.replace(/(volumeSlider\.addEventListener\("input", \(\) => \{[\s\S]+?)(  \}\);)/, "$1    if (typeof saveState === 'function') saveState();\n$2");
code = code.replace(/(if \(muteBtn\) muteBtn\.innerHTML = .*;\n  \}\n\})/g, "$1\n  if (typeof saveState === 'function') saveState();\n}");
code = code.replace(/(if \(btn\) btn\.classList\.toggle\("active-state", isShuffle\);[\s\S]+?\}\n  \})/g, "$1\n  if (typeof saveState === 'function') saveState();\n}");
code = code.replace(/(btn\.title = "Ulangi Satu";\n  \})/g, "$1\n  if (typeof saveState === 'function') saveState();\n}");
code = code.replace(/(renderPlaylistTracks\(\);\n\})/g, "$1\n  if (typeof saveState === 'function') saveState();\n}");


// Fix nextSong
const nextSongRepl = `function nextSong() {
  if (manualQueue.length > 0) {
    const track = manualQueue.shift();
    playTrack(track, 0);
    renderQueue();
    if (typeof saveState === 'function') saveState();
    return;
  }
  if (currentPlaylist.length === 0) return;`;
code = code.replace("function nextSong() {\n  if (currentPlaylist.length === 0) return;", nextSongRepl);

// Update renderQueue and Add To Queue
const renderQueueRepl = `function highlightActiveTrack() {
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
  renderQueue();
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
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\' viewBox=\\'0 0 44 44\\'><rect width=\\'44\\' height=\\'44\\' fill=\\'%231565c0\\'/><path d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\' fill=\\'%23ffffff\\' transform=\\'translate(10, 10) scale(1)\\'/></svg>";
    
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
    delBtn.innerHTML = "<svg viewBox=\\'0 0 24 24\\' width=\\'16\\' height=\\'16\\' fill=\\'currentColor\\'><path d=\\'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z\\'/></svg>";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      manualQueue.splice(i, 1);
      renderQueue();
    };

    actionsDiv.appendChild(delBtn);
    li.appendChild(thumbImg);
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);
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
    thumbImg.src = track.thumbnail || "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\' viewBox=\\'0 0 44 44\\'><rect width=\\'44\\' height=\\'44\\' fill=\\'%231565c0\\'/><path d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\' fill=\\'%23ffffff\\' transform=\\'translate(10, 10) scale(1)\\'/></svg>";
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
    playBtn.innerHTML = "<svg viewBox=\\'0 0 24 24\\' width=\\'16\\' height=\\'16\\' fill=\\'currentColor\\' style=\\'vertical-align: middle;\\'><path d=\\'M8 5v14l11-7z\\'/></svg>";
    playBtn.onclick = (e) => { e.stopPropagation(); playFromPlaylist(idx, true); };
    actionsDiv.appendChild(playBtn);
    li.appendChild(thumbImg);
    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);
    ul.appendChild(li);
  });
}

window.addToQueue = function(track) {
  manualQueue.push(track);
  renderQueue();
  alert('Lagu "' + track.title + '" ditambahkan ke antrean.');
};
`;
code = code.replace(/function highlightActiveTrack\(\) \{[\s\S]+?\}\n  \}\);\n\}/, renderQueueRepl);


// Add Queue Button in search
const searchBtnRepl = `
      const addBtn = document.createElement("button");
      addBtn.className = "xp-btn";
      addBtn.innerHTML = "<svg viewBox=\\'0 0 24 24\\' width=\\'14\\' height=\\'14\\' fill=\\'currentColor\\' style=\\'vertical-align: middle; margin-right:4px;\\'><path d=\\'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z\\'/></svg>Playlist";
      addBtn.onclick = (e) => {
        e.stopPropagation();
        selectedTrackForPlaylist = track;
        openPlaylistModal();
      };

      const queueBtn = document.createElement("button");
      queueBtn.className = "xp-btn";
      queueBtn.innerHTML = "<svg viewBox=\\'0 0 24 24\\' width=\\'14\\' height=\\'14\\' fill=\\'currentColor\\' style=\\'vertical-align: middle; margin-right:4px;\\'><path d=\\'M4 10h12v2H4zm0-4h16v2H4zm0 8h8v2H4z\\'/></svg>Antre";
      queueBtn.onclick = (e) => {
        e.stopPropagation();
        addToQueue(track);
      };

      actionsDiv.appendChild(playBtn);
      actionsDiv.appendChild(queueBtn);
      actionsDiv.appendChild(addBtn);
`;
code = code.replace(/const addBtn = document\.createElement\("button"\);[\s\S]+?actionsDiv\.appendChild\(addBtn\);/, searchBtnRepl);

fs.writeFileSync("renderer.js", code);
console.log("Renderer rebuilt successfully!");
