# 🎵 MooMussic - Classic Edition

MooMussic adalah aplikasi pemutar musik *desktop* modern yang dibalut dengan antarmuka retro bernuansa **Windows XP / Vista**. Dibangun menggunakan teknologi Electron, MooMussic memungkinkan Anda untuk mencari, memutar, dan mengelola lagu langsung dari YouTube dan SoundCloud tanpa harus membuka *browser*.

![Windows XP Theme](https://img.shields.io/badge/Theme-Windows%20XP%20%2F%20Vista-003399?style=flat-square&logo=windowsxp)
![Electron](https://img.shields.io/badge/Platform-Electron-47848F?style=flat-square&logo=electron)
![Database](https://img.shields.io/badge/Database-SQLite3-003B57?style=flat-square&logo=sqlite)

---

## ✨ Fitur Utama

- **Pencarian Terintegrasi**: Cari dan putar lagu dari YouTube atau SoundCloud secara instan.
- **Manajemen Playlist (Lokal)**: Buat *playlist* sendiri. Data disimpan dengan aman secara lokal di komputer Anda menggunakan SQLite.
- **Antrean Interaktif (Play Queue)**: Atur lagu apa yang akan diputar selanjutnya. Dilengkapi dengan fitur *Drag and Drop* untuk mengubah urutan lagu semudah menggeser kursor.
- **Mini Player Mode**: Ubah tampilan pemutar menjadi mode ringkas (Mini Player) yang melayang di atas jendela lain (*Always on Top*).
- **State Persistence**: Aplikasi cerdas yang selalu mengingat preferensi terakhir Anda (Volume, mode Shuffle, mode Repeat, dan Tab terakhir).
- **Dukungan Media Keyboard**: Kendalikan musik (Play, Pause, Next, Prev) langsung dari tombol media di *keyboard* Anda meskipun aplikasi berjalan di latar belakang.

---

## 🛠 Spesifikasi Teknis (Tech Stack)

- **Framework Utama**: [Electron](https://www.electronjs.org/) & Node.js
- **Database**: `better-sqlite3`
- **Streaming Engine**: `play-dl`, `yt-dlp-wrap`, dan `ffmpeg-static`
- **Antarmuka**: HTML5, CSS3 murni (Native DOM), dan ikon SVG Material Design.

---

## 📋 Persyaratan Sistem (System Requirements)

Jika Anda hanya ingin **menggunakan** aplikasinya, silakan unduh file `.exe` di menu **Releases**. Namun, jika Anda ingin memodifikasi atau mengembangkan kodenya, Anda membutuhkan:

- **OS**: Windows 10 atau 11 (Mendukung MacOS/Linux dengan sedikit penyesuaian *build*).
- **Node.js**: Versi `18.x` atau yang lebih baru.
- **NPM**: Versi `8.x` atau yang lebih baru.
- **Koneksi Internet**: Wajib (untuk melakukan pencarian dan *streaming* lagu).
- **Penyimpanan (Storage)**: Tersedia ruang kosong minimal **±500 MB** (untuk file instalasi, Chromium *engine*, dan *cache*).

---

## 🚀 Cara Menjalankan Aplikasi (Development)

Untuk menjalankan aplikasi ini di mode pengembangan, ikuti langkah berikut:

1. **Clone repository ini**
   ```bash
   git clone https://github.com/fafaalbari5/MooMussic.git
   cd MooMussic
   ```

2. **Instal dependensi**
   ```bash
   npm install
   ```

3. **Re-compile modul native (Wajib!)**
   Karena aplikasi ini menggunakan `better-sqlite3` (C++), Anda harus mengompilasi ulangnya agar cocok dengan *environment* Electron.
   ```bash
   npm run postinstall
   ```

4. **Jalankan Aplikasi**
   ```bash
   npm start
   ```

---

## 📦 Cara Mem-build Aplikasi (Production)

Untuk mengemas aplikasi ini menjadi file instalasi `.exe` yang siap dibagikan:

1. Pastikan Anda sudah menginstal alat *build*-nya:
   ```bash
   npm install electron-builder --save-dev
   ```
2. Jalankan perintah kompilasi:
   ```bash
   npm run build
   ```
3. Tunggu hingga proses selesai. File *installer* akan muncul di dalam folder `dist/` (contoh: `MooMussic Setup 1.0.0.exe`).

---

*Dibuat untuk mengenang era keemasan pemutar media klasik.* 💿
