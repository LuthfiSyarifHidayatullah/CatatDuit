import type { Category, ParsedReceipt, ReceiptItem } from "./types";

/**
 * Parser heuristik untuk struk belanja Indonesia.
 * OCR menghasilkan teks yang berantakan, jadi kita pakai beberapa aturan
 * untuk menebak merchant, tanggal, dan total. Semua hasilnya tetap bisa
 * diedit manual oleh user di halaman review.
 */

// Kata kunci yang menandai baris total pembayaran.
const TOTAL_KEYWORDS = [
  "grand total",
  "total belanja",
  "total bayar",
  "total akhir",
  "total",
  "jumlah",
  "tagihan",
];

// Kata kunci yang HARUS diabaikan walau mengandung "total" / angka besar.
const TOTAL_EXCLUDE = [
  "subtotal",
  "sub total",
  "total item",
  "total qty",
  "total diskon",
  "ppn",
  "pajak",
  "kembali",
  "kembalian",
  "tunai",
  "cash",
  "bayar tunai",
];

// Petunjuk kategori berdasarkan nama merchant / isi struk.
const CATEGORY_HINTS: { keywords: string[]; category: Category }[] = [
  {
    category: "Makanan & Minuman",
    keywords: [
      "resto",
      "restaurant",
      "cafe",
      "kopi",
      "coffee",
      "kedai",
      "warung",
      "bakery",
      "roti",
      "mcd",
      "kfc",
      "pizza",
      "burger",
      "ayam",
      "bakso",
      "mie",
      "food",
      "catering",
    ],
  },
  {
    category: "Belanja",
    keywords: [
      "indomaret",
      "alfamart",
      "alfamidi",
      "superindo",
      "hypermart",
      "transmart",
      "carrefour",
      "giant",
      "lotte",
      "minimarket",
      "supermarket",
      "toko",
      "mart",
      "retail",
      "swalayan",
    ],
  },
  {
    category: "Transportasi",
    keywords: [
      "pertamina",
      "shell",
      "spbu",
      "bensin",
      "pertalite",
      "pertamax",
      "solar",
      "parkir",
      "tol",
      "grab",
      "gojek",
      "taksi",
      "mrt",
      "krl",
    ],
  },
  {
    category: "Kesehatan",
    keywords: [
      "apotek",
      "apotik",
      "farma",
      "kimia farma",
      "guardian",
      "watson",
      "klinik",
      "rumah sakit",
      "rs ",
      "dokter",
    ],
  },
  {
    category: "Tagihan",
    keywords: ["pln", "pdam", "listrik", "token", "pulsa", "indihome", "wifi", "tagihan"],
  },
];

function normalize(line: string): string {
  return line.toLowerCase().trim();
}

/**
 * Ambil angka Rupiah dari sepotong teks.
 * Menangani format "Rp 50.000", "50,000", "50.000,00", "Rp50000".
 */
function extractAmount(text: string): number | undefined {
  // Buang simbol mata uang dan spasi dulu untuk fokus ke angka.
  const cleaned = text.replace(/rp\.?/gi, " ");

  // Cari gugus angka yang mengandung pemisah ribuan/desimal.
  const matches = cleaned.match(/\d[\d.,]*\d|\d/g);
  if (!matches) return undefined;

  let best: number | undefined;
  for (const m of matches) {
    const value = parseIndoNumber(m);
    if (value === undefined) continue;
    // Abaikan angka terlalu kecil (kemungkinan nomor item / qty).
    if (value < 100) continue;
    if (best === undefined || value > best) best = value;
  }
  return best;
}

/**
 * Ubah string angka format Indonesia menjadi number.
 * Contoh: "50.000" -> 50000, "50.000,00" -> 50000, "1,234,567" -> 1234567
 */
function parseIndoNumber(raw: string): number | undefined {
  let s = raw.trim();
  if (!s) return undefined;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Format "50.000,00" (titik = ribuan, koma = desimal) ATAU
    // "1,234,567.00" (koma = ribuan, titik = desimal).
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // koma di belakang -> koma desimal (format Indonesia)
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // titik di belakang -> titik desimal (format internasional)
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Hanya koma. Jika "50,00" anggap desimal; jika "50,000" anggap ribuan.
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length === 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    // Hanya titik. "50.000" -> ribuan; "50.00" -> desimal.
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length === 2) {
      // biarkan sebagai desimal
    } else {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n);
}

/** Cari tanggal dan kembalikan dalam format ISO YYYY-MM-DD. */
function extractDate(text: string): string | undefined {
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const dmy = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    const iso = toIso(Number(y), Number(m), Number(d));
    if (iso) return iso;
  }

  // yyyy-mm-dd
  const ymd = text.match(/\b(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})\b/);
  if (ymd) {
    const [, y, m, d] = ymd;
    const iso = toIso(Number(y), Number(m), Number(d));
    if (iso) return iso;
  }

  // dd Namabulan yyyy  (mis. "12 Januari 2026")
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
    jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
  };
  const named = text
    .toLowerCase()
    .match(/\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b/);
  if (named) {
    const [, d, monName, y] = named;
    const key = monName.slice(0, 3);
    const m = months[key];
    if (m) {
      const iso = toIso(Number(y), m, Number(d));
      if (iso) return iso;
    }
  }

  return undefined;
}

function toIso(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  if (y < 2000 || y > 2100) return undefined;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function guessCategory(fullText: string, merchant?: string): Category | undefined {
  // Prioritaskan nama merchant (baris atas struk). Nama toko lebih menentukan
  // daripada item individual — mis. "Indomaret" yang menjual "roti" tetap
  // masuk kategori Belanja, bukan Makanan.
  if (merchant) {
    const m = merchant.toLowerCase();
    for (const hint of CATEGORY_HINTS) {
      if (hint.keywords.some((k) => m.includes(k))) {
        return hint.category;
      }
    }
  }

  // Fallback: periksa seluruh teks struk.
  const t = fullText.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.some((k) => t.includes(k))) {
      return hint.category;
    }
  }
  return undefined;
}

/** Tebak nama merchant: biasanya di baris paling atas struk. */
function guessMerchant(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;
    // Lewati baris yang didominasi angka (biasanya alamat/telepon/tanggal).
    const digits = (trimmed.match(/\d/g) || []).length;
    if (digits > trimmed.length / 2) continue;
    // Lewati baris yang terlihat seperti kata kunci umum.
    const low = trimmed.toLowerCase();
    if (low.includes("struk") || low.includes("nota") || low.includes("receipt")) {
      continue;
    }
    // Rapikan: judul struk biasanya huruf kapital.
    return trimmed.replace(/\s+/g, " ").slice(0, 60);
  }
  return undefined;
}

/**
 * Coba ekstrak baris item dari struk (best-effort untuk mode OCR offline).
 * Heuristik: baris yang diakhiri angka harga, bukan baris total/keyword,
 * dan bukan baris yang terlalu pendek. Hasilnya tetap bisa diedit manual.
 */
function extractItems(lines: string[], total?: number): ReceiptItem[] {
  const items: ReceiptItem[] = [];
  const SKIP = [
    ...TOTAL_KEYWORDS,
    ...TOTAL_EXCLUDE,
    "npwp",
    "no.",
    "kasir",
    "terima kasih",
    "struk",
    "nota",
    "faktur",
    "jl",
    "telp",
    "diskon",
    "hemat",
  ];

  for (const line of lines) {
    const low = normalize(line);
    if (low.length < 4) continue;
    if (SKIP.some((k) => low.includes(k))) continue;

    // Harus ada harga di bagian akhir baris.
    const priceMatch = line.match(/([\d.,]+)\s*$/);
    if (!priceMatch) continue;
    const price = parseIndoNumber(priceMatch[1]);
    if (price === undefined || price < 100) continue;
    // Lewati jika harga ini justru sama dengan total (kemungkinan baris total).
    if (total !== undefined && price === total) continue;

    // Nama item = bagian sebelum harga, buang angka qty/harga satuan di tengah.
    let name = line.slice(0, priceMatch.index).trim();
    // Buang pola "2 x 5.000" atau "@5.000" di nama.
    name = name
      .replace(/\b\d+\s*[xX@]\s*[\d.,]+/g, "")
      .replace(/[\d.,]{3,}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (name.length < 2) continue;

    // Deteksi qty sederhana dari pola "2 x ..." di awal baris.
    let qty = 1;
    const qtyMatch = line.match(/\b(\d+)\s*[xX]/);
    if (qtyMatch) {
      const q = Number(qtyMatch[1]);
      if (q > 0 && q < 1000) qty = q;
    }

    items.push({ name: name.slice(0, 60), qty, price });
  }

  // Batasi agar tidak kebanjiran noise.
  return items.slice(0, 40);
}

export function parseReceipt(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // --- Total ---
  let amount: number | undefined;
  // Prioritaskan baris yang mengandung keyword total (dari bawah ke atas,
  // karena "grand total" biasanya di bagian bawah struk).
  for (let i = lines.length - 1; i >= 0; i--) {
    const low = normalize(lines[i]);
    if (TOTAL_EXCLUDE.some((k) => low.includes(k))) continue;
    if (TOTAL_KEYWORDS.some((k) => low.includes(k))) {
      const found = extractAmount(lines[i]);
      if (found !== undefined) {
        amount = found;
        break;
      }
    }
  }
  // Fallback: ambil angka terbesar di seluruh struk.
  if (amount === undefined) {
    for (const line of lines) {
      const low = normalize(line);
      if (TOTAL_EXCLUDE.some((k) => low.includes(k))) continue;
      const v = extractAmount(line);
      if (v !== undefined && (amount === undefined || v > amount)) amount = v;
    }
  }

  // --- Tanggal ---
  let date: string | undefined;
  for (const line of lines) {
    date = extractDate(line);
    if (date) break;
  }

  // --- Merchant & kategori ---
  const merchant = guessMerchant(lines);
  const category = guessCategory(rawText, merchant);

  // --- Item ---
  const items = extractItems(lines, amount);

  return { merchant, date, amount, category, items: items.length ? items : undefined };
}
