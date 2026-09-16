const fs = require('fs');
let code = fs.readFileSync('renderer.js', 'utf8');

// Replace safely
code = code.replace(/(if \(muteBtn\) muteBtn\.innerHTML = .*;\n  \}\);)/, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(if \(muteBtn\) muteBtn\.innerHTML = .*;\n  \}\n\})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(if \(btn\) btn\.classList\.toggle\("active-state", isShuffle\);[\s\S]+?\}\n  \})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(btn\.title = "Ulangi Satu";\n  \})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(document\.getElementById\(tabId \+ "View"\)\?\.classList\.remove\("hidden"\);\n\})/g, "\n  if(typeof saveState==='function') saveState();");
code = code.replace(/(renderPlaylistTracks\(\);\n\})/g, "\n  if(typeof saveState==='function') saveState();");

fs.writeFileSync('renderer.js', code);
console.log('Hooks injected safely');
