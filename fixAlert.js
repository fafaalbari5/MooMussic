const fs = require("fs");
let code = fs.readFileSync("renderer.js", "utf8");

code = code.replace(/alert\("Lagu "" \+ track\.title \+ "" ditambahkan ke antrean\."\);/, "alert('Lagu \"' + track.title + '\" ditambahkan ke antrean.');");

fs.writeFileSync("renderer.js", code);
