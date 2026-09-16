const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

// Add manualQueue variable
code = code.replace("let isSeeking = false;", "let isSeeking = false;\nlet manualQueue = [];");

// Update nextSong to check manualQueue
const nextSongRepl = `function nextSong() {
  if (manualQueue.length > 0) {
    const track = manualQueue.shift();
    playTrack(track, 0);
    renderQueue();
    if (typeof saveState === "function") saveState();
    return;
  }
  
  if (currentPlaylist.length === 0) return;`;
code = code.replace("function nextSong() {\n  if (currentPlaylist.length === 0) return;", nextSongRepl);

// Update renderQueue
const renderQueueRepl = `function renderQueue() {
  const ul = document.getElementById("queueTracks");
  if (!ul) return;
  ul.innerHTML = "";

  let totalItems = 0;

  // 1. Render Manual Queue
  manualQueue.forEach((track, i) => {
    totalItems++;
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
    ul.appendChild(li);
  });

  let upcomingIndices = [];
  if (currentPlaylist.length > 0) {
`;
code = code.replace(/function renderQueue\(\) \{[\s\S]+?let upcomingIndices = \[\];\n  if \(currentPlaylist\.length > 0\) \{/, renderQueueRepl);

// Adjust renderQueue empty state check
code = code.replace(/if \(upcomingIndices\.length === 0\) \{[\s\S]+?return;\n  \}/, `if (upcomingIndices.length === 0 && manualQueue.length === 0) {
    ul.innerHTML = "<li class=\'empty-state\'>Tidak ada lagu selanjutnya dalam antrean.</li>";
    return;
  }`);

// Add addToQueue function
const addToQueueFunc = `
window.addToQueue = function(track) {
  manualQueue.push(track);
  renderQueue();
  alert('Lagu "' + track.title + '" ditambahkan ke antrean.');
};
`;
code = code + addToQueueFunc;

// Add Add to Queue button in search results
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
console.log("Done modifying renderer.js");
