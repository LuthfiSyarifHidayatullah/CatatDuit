import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES, ParsedReceipt, ReceiptItem } from "@/lib/types";

export const runtime = "nodejs";

// Daftar model yang dicoba berurutan. Jika satu model tidak tersedia (404) atau
// kuotanya habis (429), otomatis lanjut ke model berikutnya.
// Bisa diganti lewat GEMINI_MODEL (satu model, atau beberapa dipisah koma).
// Catatan: gemini-2.5-flash sudah dibatasi untuk pengguna baru (404).
const DEFAULT_MODELS = [
  "gemini-3.8-flash", // paling akurat, kuota gratis kecil
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite", // kuota gratis paling longgar
];
const MODELS = process.env.GEMINI_MODEL
  ? process.env.GEMINI_MODEL.split(",").map((m) => m.trim()).filter(Boolean)
  : DEFAULT_MODELS;

const PROMPT = `Kamu adalah asisten pembaca struk belanja Indonesia.
Baca gambar struk ini dan ekstrak datanya seakurat mungkin.
Aturan:
- "amount" adalah TOTAL akhir yang dibayar (grand total), dalam angka Rupiah bulat tanpa titik/koma (contoh: 21500). Abaikan subtotal, kembalian, dan tunai.
- "date" dalam format YYYY-MM-DD. Jika tidak ada, kosongkan.
- "merchant" adalah nama toko/penjual.
- "items" adalah daftar barang yang dibeli, masing-masing dengan name, qty (angka, default 1), dan price (harga total baris itu dalam Rupiah bulat).
- "category" pilih salah satu dari daftar kategori yang diberikan, tebak dari jenis toko.
Jika suatu field tidak terbaca, boleh dikosongkan.`;

// Skema output terstruktur supaya Gemini mengembalikan JSON yang konsisten.
const responseSchema = {
  type: "object",
  properties: {
    merchant: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD" },
    amount: { type: "number" },
    category: { type: "string", enum: CATEGORIES },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          qty: { type: "number" },
          price: { type: "number" },
        },
        required: ["name", "price"],
      },
    },
  },
};

function sanitizeNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY belum diset. Tambahkan di file .env.local lalu jalankan ulang server.",
      },
      { status: 500 }
    );
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64) {
    return NextResponse.json(
      { error: "Gambar tidak ada." },
      { status: 400 }
    );
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          {
            inline_data: {
              mime_type: mimeType || "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0,
    },
  };

  let geminiRes: Response | undefined;
  let lastStatus = 0;
  let lastDetail = "";
  const tried: string[] = [];

  for (const model of MODELS) {
    tried.push(model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        geminiRes = res;
        break;
      }
      lastStatus = res.status;
      lastDetail = await res.text().catch(() => "");
      // 404 = model tidak tersedia, 429 = kuota habis -> coba model berikutnya.
      if (res.status === 404 || res.status === 429) continue;
      // Error lain (mis. API key salah) tidak akan membaik dengan ganti model.
      break;
    } catch {
      return NextResponse.json(
        { error: "Gagal menghubungi Gemini. Cek koneksi internet." },
        { status: 502 }
      );
    }
  }

  if (!geminiRes) {
    let msg = `Gemini menolak permintaan (HTTP ${lastStatus}).`;
    if (lastStatus === 400 && lastDetail.includes("API_KEY_INVALID")) {
      msg = "API key tidak valid. Periksa GEMINI_API_KEY di .env.local.";
    } else if (lastStatus === 403) {
      msg = "Akses ditolak (HTTP 403). Periksa API key dan pastikan Gemini API aktif.";
    } else if (lastStatus === 429) {
      msg = "Kuota gratis Gemini hari ini habis. Coba lagi besok, atau pakai mode OCR gratis.";
    } else if (lastStatus === 404) {
      msg = `Tidak ada model Gemini yang tersedia (dicoba: ${tried.join(", ")}). Set GEMINI_MODEL di .env.local dengan model yang tersedia untuk akunmu.`;
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const data = await geminiRes.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") || "";

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Respons Gemini tidak bisa dibaca. Coba foto ulang struk." },
      { status: 502 }
    );
  }

  // Normalisasi ke bentuk ParsedReceipt yang dipakai aplikasi.
  const items: ReceiptItem[] = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[])
        .map((it) => ({
          name: String(it.name ?? "").trim(),
          qty: sanitizeNumber(it.qty) ?? 1,
          price: sanitizeNumber(it.price) ?? 0,
        }))
        .filter((it) => it.name.length > 0)
    : [];

  const category = CATEGORIES.includes(raw.category as never)
    ? (raw.category as ParsedReceipt["category"])
    : undefined;

  const parsed: ParsedReceipt = {
    merchant: typeof raw.merchant === "string" ? raw.merchant : undefined,
    date: typeof raw.date === "string" && raw.date ? raw.date : undefined,
    amount: sanitizeNumber(raw.amount),
    category,
    items: items.length ? items : undefined,
  };

  return NextResponse.json({ parsed, rawText: text });
}
