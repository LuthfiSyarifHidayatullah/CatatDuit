# CatatDuit 💸

Web pencatat pengeluaran yang **membaca struk secara otomatis dari foto** — tanpa perlu input manual yang merepotkan.

Foto struk → data dibaca otomatis → terisi (termasuk rincian item) → tinggal cek & simpan.

## ✨ Fitur

- 📷 **Scan struk otomatis** — foto atau unggah gambar struk
- ✨ **Dua mode pembacaan** yang bisa dipilih per-scan:
  - **Gemini (akurat)** — AI Vision, membaca total **dan rincian item**. Butuh API key gratis.
  - **OCR gratis (offline)** — Tesseract.js di browser, tanpa API key. Akurasi lebih terbatas.
- 🧾 **Rincian item** — daftar barang + harga terbaca otomatis (Gemini) dan bisa diedit/ditambah manual
- ✍️ **Catat manual** — input pengeluaran tanpa struk sama sekali
- 🧠 **Ekstraksi pintar** — menebak nama toko, tanggal, total, dan kategori
- ✏️ **Review & edit** — cek hasil pembacaan sebelum menyimpan
- 📊 **Ringkasan** — total pengeluaran bulan ini & keseluruhan
- 🔒 **Data lokal** — semua tersimpan di perangkatmu (localStorage), tanpa database

## 🛠️ Teknologi

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Google Gemini](https://ai.google.dev/) (mode akurat) via server route
- [Tesseract.js](https://tesseract.projectnaptha.com/) (mode offline, OCR di browser)
- [Tailwind CSS](https://tailwindcss.com/)
- `localStorage` untuk penyimpanan data

## 🔑 Setup API key Gemini (GRATIS, untuk mode akurat)

Mode Gemini butuh API key gratis dari **Google AI Studio** (bukan langganan Google One):

1. Buka **[aistudio.google.com](https://aistudio.google.com)** dan login akun Google.
2. Klik **Get API key** → **Create API key** (gratis, tanpa kartu kredit).
3. Salin key-nya.
4. Di folder project, salin `.env.local.example` menjadi `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
5. Buka `.env.local` dan isi:
   ```
   GEMINI_API_KEY=key_kamu_di_sini
   ```
6. Jalankan ulang `npm run dev`.

> Tanpa API key, aplikasi tetap jalan — cukup pilih mode **OCR gratis (offline)**.

## 🚀 Menjalankan

```bash
npm install
npm run dev
```

Lalu buka [http://localhost:3000](http://localhost:3000).

> **Catatan mode offline:** saat pertama kali memakai mode OCR gratis,
> Tesseract.js mengunduh model bahasa (±beberapa MB) dari CDN — butuh koneksi
> internet **sekali**, lalu tersimpan di cache browser.

## 📝 Cara pakai

1. Pilih mode pembacaan (**Gemini** untuk akurasi terbaik, atau **OCR gratis**).
2. Klik **Foto struk** / **Unggah gambar** — atau **Catat manual** jika tanpa struk.
3. Tunggu proses pembacaan selesai.
4. Periksa data & rincian item yang terisi otomatis — perbaiki/tambah bila perlu.
5. Klik **Simpan**. Selesai! 🎉

## 💡 Tips agar hasil lebih akurat

- Pakai **mode Gemini** untuk struk nyata — jauh lebih akurat dan bisa membaca item.
- Pastikan foto terang, tidak buram, dan struk tidak terlipat.
- Hasil selalu bisa dikoreksi di halaman review sebelum disimpan.

## Keterbatasan

- Mode **OCR offline** (Tesseract) gratis & privat, tapi akurasinya terbatas untuk
  struk termal yang kusut/pudar — gunakan mode Gemini bila butuh akurasi tinggi.
- Mode **Gemini** mengirim gambar struk ke API Google untuk diproses (lewat server
  route; API key tidak terekspos ke browser). Pakai mode offline bila ingin data
  tidak keluar dari perangkat.
