const fs = require('fs');
let content = fs.readFileSync('renderer.js', 'utf8');

// Insert saveState() after state changes carefully

// 1. volumeSlider input
content = content.replace(/(volumeSlider\.addEventListener\(\"input\", \(\) => \{[\s\S]+?)(  \}\);)/, (match, p1, p2) => {
    return p1 + "    if (typeof saveState === 'function') saveState();\n" + p2;
});

// 2. toggleMute
content = content.replace(/(function toggleMute\(\) \{[\s\S]+?)(}\r?\n)/, (match, p1, p2) => {
    return p1 + "  if (typeof saveState === 'function') saveState();\n" + p2;
});

// 3. toggleShuffle
content = content.replace(/(function toggleShuffle\(\) \{[\s\S]+?)(}\r?\n)/, (match, p1, p2) => {
    return p1 + "  if (typeof saveState === 'function') saveState();\n" + p2;
});

// 4. toggleRepeat
content = content.replace(/(function toggleRepeat\(\) \{[\s\S]+?)(}\r?\n)/, (match, p1, p2) => {
    return p1 + "  if (typeof saveState === 'function') saveState();\n" + p2;
});

// 5. showTab
content = content.replace(/(function showTab\(tabId\) \{[\s\S]+?)(}\r?\n)/, (match, p1, p2) => {
    return p1 + "  if (typeof saveState === 'function') saveState();\n" + p2;
});

// 6. openPlaylist
content = content.replace(/(async function openPlaylist\(id, name\) \{[\s\S]+?)(}\r?\n)/, (match, p1, p2) => {
    return p1 + "  if (typeof saveState === 'function') saveState();\n" + p2;
});

fs.writeFileSync('renderer.js', content);
console.log('Injected saveState calls successfully');
