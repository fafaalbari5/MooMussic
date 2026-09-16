const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const jsCode = fs.readFileSync('renderer.js', 'utf8');

const dom = new JSDOM(html, { runScripts: 'dangerously' });
dom.window.eval('window.api = { getPlaylists: async () => [{id:1, name:"test"}], getPlaylistTracks: async () => [] };');
dom.window.eval('localStorage = { getItem: () => null, setItem: () => {} };');
dom.window.eval('navigator.mediaSession = { setActionHandler: () => {} };');
dom.window.eval(jsCode);

setTimeout(() => {
    console.log(dom.window.document.getElementById('playlists').innerHTML);
}, 1000);
