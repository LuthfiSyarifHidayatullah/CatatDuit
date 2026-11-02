import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES, ParsedReceipt, ReceiptItem } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

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

  let geminiRes: Response;
  try {
    geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghubungi Gemini. Cek koneksi internet." },
      { status: 502 }
    );
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "");
    let msg = `Gemini menolak permintaan (HTTP ${geminiRes.status}).`;
    if (geminiRes.status === 400 && detail.includes("API_KEY_INVALID")) {
      msg = "API key tidak valid. Periksa GEMINI_API_KEY di .env.local.";
    } else if (geminiRes.status === 429) {
      msg = "Kuota Gemini habis sementara (rate limit). Coba lagi beberapa saat.";
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
