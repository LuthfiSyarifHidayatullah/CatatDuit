"use client";

import { Expense } from "@/lib/types";
import { formatDateID, formatRupiah } from "@/lib/format";

const CATEGORY_EMOJI: Record<string, string> = {
  "Makanan & Minuman": "🍜",
  Belanja: "🛒",
  Transportasi: "🚗",
  Tagihan: "🧾",
  Kesehatan: "💊",
  Hiburan: "🎬",
  Lainnya: "📦",
};

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <div className="mb-2 text-4xl">🧾</div>
        <p className="text-slate-500">
          Belum ada catatan. Foto struk pertamamu untuk mulai mencatat.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl">
            {CATEGORY_EMOJI[e.category] ?? "📦"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-800">{e.merchant}</div>
            <div className="text-xs text-slate-500">
              {formatDateID(e.date)} · {e.category}
              {e.note ? ` · ${e.note}` : ""}
            </div>
          </div>
          <div className="text-right font-semibold text-slate-800">
            {formatRupiah(e.amount)}
          </div>
          <button
            onClick={() => onDelete(e.id)}
            aria-label="Hapus"
            className="ml-1 shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
