# Kstream - User App (Next.js App Router)

Implementasi area pengguna ala Netflix dengan Next.js App Router, Firebase, Tailwind CSS, dan integrasi Mux opsional. Struktur ini siap dipasangkan dengan dashboard admin untuk mengelola konten streaming.

## Tampilan Netflix

- Tema gelap full dengan gradien dan tipografi mirip Netflix
- Navbar adaptif yang mengambil daftar genre dari koleksi `kstream-settings`
- Hero banner mengikuti konfigurasi `kstream-settings/hero`
- Slider horizontal dengan poster campuran portrait/landscape (atur via field `orientation` di Firestore bila perlu)
- Hover di kartu konten (desktop) menampilkan pop-up preview dan memutar trailer/gif dari Mux
- Halaman detail & watch menampilkan backdrop besar, badge metadata, dan favorit/riwayat tersinkronisasi

## Fitur

- Beranda dengan hero banner, deret trending, dan rilis terbaru
- Detail film/series dengan rekomendasi dan daftar episode
- Pemutar video (HLS Mux atau URL custom) plus pemilihan subtitle
- Autentikasi pengguna (login, register, lupa password) via Firebase Auth
- Halaman profil: riwayat tonton, favorit, pengaturan profil
- Pencarian konten melalui API route `/api/search`
- Halaman genre, upgrade premium, dan about
- Login modern dengan opsi Google OAuth
- Pemutar kustom ala Netflix (controls overlay, HLS support, resume riwayat)

## Struktur Direktori

- `app/` - Routing App Router (auth, movies, series, profile, api, dll.)
- `components/` - Komponen UI reusable (Navbar, Slider, Player, dll.)
- `hooks/` - Context dan hooks (misalnya `useAuth`)
- `lib/` - Utilitas Firebase (client & admin), Firestore, Mux, helpers
- `public/` - Placeholder aset statis
- `styles/` - Tailwind dan global styles

## Konfigurasi Lingkungan

Buat `.env.local` lalu isi variabel berikut:

```bash
# Firebase Web (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server) untuk query Firestore di server/API
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Mux (opsional)
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_SIGNING_KEY=
MUX_SIGNING_KEY_ID=
```

> Gunakan `\n` untuk baris baru di `FIREBASE_PRIVATE_KEY`.

## Menjalankan Proyek

```bash
npm install
npm run dev
```

## Struktur Firestore yang Dipakai

| Koleksi | Field penting | Catatan |
| --- | --- | --- |
| `movies` | `title`, `description`, `category`, `thumbnail`/`posterUrl`, `mux_playback_id` atau `movieUrl`, `subtitles`, `orientation` (opsional `'portrait'`/`'landscape'`) | Digunakan untuk semua konten bertipe film. Jika tidak memakai Mux, isi `movieUrl` dengan link `.m3u8` atau MP4. |
| `series` | Field di atas + `episodes` (array) dengan `episodeId`, `epNumber`, `title`, `description`, `mux_playback_id`/`streamUrl`, `subtitles` | Episode dibaca langsung dari array `episodes` sehingga tidak perlu subkoleksi. |
| `kstream-settings` | Doc `platform` dengan `hero` (`backgroundUrl`, `title`, `subtitle`, `contentId`, `badge`), `categories` (array), `theme` | `hero.contentId` dicocokkan ke `movies`/`series`. Jika tidak ada, hero diambil dari konten trending. |
| `users/{uid}` | `displayName`, `photoUrl`, `role`, `plan`, `expiresAt`, `favorites` (array of konten), `history` (array riwayat) | App menyimpan favorit & riwayat langsung di dokumen pengguna. |

> Untuk poster campuran, tambahkan field `orientation` pada dokumen konten (`'portrait'` atau `'landscape'`). Jika tidak diisi, sistem akan mencoba menebak berdasarkan nama file/tipe konten (default landscape).

## Integrasi Konten

- Hero/banner otomatis membaca `kstream-settings/platform`.
- Beranda memuat trending & rilis baru (gabungan movies/series) + 3 genre pertama dari `settings.categories`.
- Halaman detail tampilkan poster besar dengan tombol tonton, favorit, dan daftar episode (untuk series).
- Pencarian menggunakan endpoint `/api/search` yang melakukan filter judul/deskripsi pada client.
- Hover preview ala Netflix menampilkan trailer/gif, sedangkan watch page memakai playback Mux atau URL custom.
- Halaman pengaturan profil memungkinkan update nama tampilan + foto profil (upload ke Firebase Storage atau tempel URL).

### Premium & Role

- Akses premium diberikan otomatis untuk role `super-admin`, `admin`, atau `editor`.
- Role `pelanggan` membutuhkan `expiresAt` yang lebih besar dari waktu saat ini agar tetap aktif.
- Pastikan rules Firestore Anda (contoh pada permintaan) konsisten dengan logika aplikasi.

Dengan konfigurasi di atas aplikasi siap dipakai: jalankan `npm run dev`, login/daftar pengguna, unggah konten via admin (Mux), lalu pengguna dapat streaming, menyimpan favorit, dan melanjutkan tontonan.
