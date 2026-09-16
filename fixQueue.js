const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

const queueCode = `
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
  if(typeof renderQueue === 'function') renderQueue();
  alert("Lagu \"" + track.title + "\" ditambahkan ke antrean.");
};
`;

// Append to the end of the file safely, before toggleMiniPlayerUI so it doesn't look messy, but anywhere is fine
code = code.replace(/let isMiniPlayer = false;/, queueCode + "\nlet isMiniPlayer = false;");

fs.writeFileSync("renderer.js", code);
