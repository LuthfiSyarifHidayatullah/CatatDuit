"use client";

import { Expense } from "@/lib/types";
import { formatRupiah, monthKey, todayIso } from "@/lib/format";

interface Props {
  expenses: Expense[];
}

export default function SummaryCard({ expenses }: Props) {
  const thisMonth = monthKey(todayIso());
  const monthTotal = expenses
    .filter((e) => monthKey(e.date) === thisMonth)
    .reduce((sum, e) => sum + e.amount, 0);
  const allTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-5 text-white shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-brand-50/90">
          Bulan ini
        </div>
        <div className="mt-1 text-2xl font-bold">{formatRupiah(monthTotal)}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Total semua
        </div>
        <div className="mt-1 text-2xl font-bold text-slate-800">
          {formatRupiah(allTotal)}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {expenses.length} transaksi
        </div>
      </div>
    </div>
  );
}
