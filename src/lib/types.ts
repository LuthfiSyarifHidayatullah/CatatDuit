export type Category =
  | "Makanan & Minuman"
  | "Belanja"
  | "Transportasi"
  | "Tagihan"
  | "Kesehatan"
  | "Hiburan"
  | "Lainnya";

export const CATEGORIES: Category[] = [
  "Makanan & Minuman",
  "Belanja",
  "Transportasi",
  "Tagihan",
  "Kesehatan",
  "Hiburan",
  "Lainnya",
];

export interface Expense {
  id: string;
  merchant: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** Total dalam Rupiah (angka bulat) */
  amount: number;
  category: Category;
  note?: string;
  /** Teks mentah hasil OCR, disimpan untuk referensi */
  rawText?: string;
  createdAt: number;
}

/** Hasil parsing dari teks OCR — semua opsional karena OCR bisa gagal sebagian */
export interface ParsedReceipt {
  merchant?: string;
  date?: string;
  amount?: number;
  category?: Category;
}
