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

/** Satu baris item pada struk */
export interface ReceiptItem {
  name: string;
  /** Jumlah/kuantitas; default 1 jika tidak diketahui */
  qty: number;
  /** Harga total untuk baris ini (qty x harga satuan) dalam Rupiah */
  price: number;
}

export interface Expense {
  id: string;
  merchant: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  /** Total dalam Rupiah (angka bulat) */
  amount: number;
  category: Category;
  note?: string;
  /** Rincian item yang dibeli (opsional) */
  items?: ReceiptItem[];
  /** Teks mentah hasil OCR, disimpan untuk referensi */
  rawText?: string;
  createdAt: number;
}

/** Hasil parsing dari struk — semua opsional karena pembacaan bisa gagal sebagian */
export interface ParsedReceipt {
  merchant?: string;
  date?: string;
  amount?: number;
  category?: Category;
  items?: ReceiptItem[];
}
