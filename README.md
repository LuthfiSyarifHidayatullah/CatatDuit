# CatatDuit 💸

Web pencatat pengeluaran yang **membaca struk secara otomatis dari foto** — tanpa perlu input manual yang merepotkan.

Foto struk → teks dibaca otomatis (OCR) → data terisi → tinggal cek & simpan.

## ✨ Fitur

- 📷 **Scan struk otomatis** — foto atau unggah gambar struk, teks dibaca langsung di browser
- 🧠 **Ekstraksi pintar** — otomatis menebak nama toko, tanggal, total, dan kategori
- ✏️ **Review & edit** — cek hasil pembacaan sebelum menyimpan (OCR tidak selalu 100% akurat)
- 📊 **Ringkasan** — total pengeluaran bulan ini & keseluruhan
- 🔒 **Privat & gratis** — semua diproses di perangkatmu, **tanpa server, tanpa API key, tanpa biaya**

## 🛠️ Teknologi

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR yang berjalan sepenuhnya di browser
- [Tailwind CSS](https://tailwindcss.com/)
- `localStorage` untuk penyimpanan data (tanpa database)

## 🚀 Menjalankan

```bash
npm install
npm run dev
```

Lalu buka [http://localhost:3000](http://localhost:3000).

> **Catatan:** Saat pertama kali memindai struk, Tesseract.js mengunduh model
> bahasa Indonesia + Inggris (±beberapa MB) dari CDN. Jadi dibutuhkan koneksi
> internet **sekali** di awal. Setelah itu bisa berjalan dari cache browser.

## 📝 Cara pakai

1. Klik **Foto struk** (kamera) atau **Unggah gambar**.
2. Tunggu proses pembacaan selesai.
3. Periksa data yang terisi otomatis — perbaiki bila perlu.
4. Klik **Simpan**. Selesai! 🎉

## 💡 Tips agar hasil OCR lebih akurat

- Pastikan foto terang dan tidak buram.
- Ratakan struk (hindari lipatan/lengkungan).
- Potong bagian yang tidak perlu agar fokus ke teks struk.

## Keterbatasan & rencana ke depan

OCR di browser (Tesseract) gratis & privat, tapi akurasinya terbatas untuk
struk yang kusut/pudar. Halaman review ada untuk mengoreksi hasil. Jika di
kemudian hari butuh akurasi lebih tinggi, pembacaan bisa diupgrade ke AI Vision
(mis. Gemini) tanpa mengubah alur aplikasi.
