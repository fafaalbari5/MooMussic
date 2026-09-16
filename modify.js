const fs = require('fs');
let code = fs.readFileSync('renderer.js', 'utf8');

const saveLoadCode = 
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
;

// Insert after let lastVolume = 80;
code = code.replace('let lastVolume = 80;', 'let lastVolume = 80;\n' + saveLoadCode);

// Modify window.onload
const newOnload = window.addEventListener('DOMContentLoaded', async () => {
  audio = document.getElementById("player");
  progress = document.getElementById("progress");
  time = document.getElementById("time");
  volumeSlider = document.getElementById("volume");
  volumeValue = document.getElementById("volumeValue");
  muteBtn = document.getElementById("muteBtn");

  if (audio) audio.volume = 0.8;
  await loadState();

  bindPlayerEvents();
  bindVolumeEvents();
  bindKeyboardShortcuts();
  await loadPlaylists();

  if (selectedPlaylistId) {
    const playlists = await window.api.getPlaylists();
    const pl = playlists.find(p => p.id === selectedPlaylistId);
    if (pl) await openPlaylist(pl.id, pl.name);
  }
;

code = code.replace(/window\.onload = \(\) => \{[\s\S]+?loadPlaylists\(\);/, newOnload);

// Add saveState calls safely inside functions
code = code.replace(/(if \(muteBtn\) muteBtn\.innerHTML = .*;\n  \}\);)/, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(if \(muteBtn\) muteBtn\.innerHTML = .*;\n  \}\n\})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(if \(btn\) btn\.classList\.toggle\("active-state", isShuffle\);[\s\S]+?\}\n  \})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(btn\.title = "Ulangi Satu";\n  \})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(document\.getElementById\(tabId \+ "View"\)\?\.classList\.remove\("hidden"\);\n\})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(renderPlaylistTracks\(\);\n\})/g, "\n  if(typeof saveState==='function') saveState();");

fs.writeFileSync('renderer.js', code);
console.log('Done');
