"use client";

import { useState } from "react";
import { CATEGORIES, Category, Expense, ParsedReceipt } from "@/lib/types";
import { todayIso } from "@/lib/format";

interface Props {
  parsed?: ParsedReceipt;
  rawText?: string;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

export default function ExpenseForm({ parsed, rawText, onSave, onCancel }: Props) {
  const [merchant, setMerchant] = useState(parsed?.merchant ?? "");
  const [date, setDate] = useState(parsed?.date ?? todayIso());
  const [amount, setAmount] = useState(
    parsed?.amount !== undefined ? String(parsed.amount) : ""
  );
  const [category, setCategory] = useState<Category>(parsed?.category ?? "Lainnya");
  const [note, setNote] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const amountNum = Number(amount.replace(/[^\d]/g, ""));
  const valid = amountNum > 0 && !!date;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSave({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      merchant: merchant.trim() || "Tanpa nama",
      date,
      amount: amountNum,
      category,
      note: note.trim() || undefined,
      rawText,
      createdAt: Date.now(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-1 text-lg font-semibold text-slate-800">
        Cek &amp; simpan pengeluaran
      </h2>
      <p className="mb-5 text-sm text-slate-500">
        Hasil pembacaan sudah diisi otomatis. Perbaiki bila ada yang kurang pas.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Nama toko / merchant
          </span>
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="mis. Indomaret"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Total (Rp)
          </span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="mis. 50000"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Tanggal
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Kategori
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Catatan (opsional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="mis. belanja mingguan"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      {rawText && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-sm text-brand-600 underline"
          >
            {showRaw ? "Sembunyikan" : "Lihat"} teks hasil pembacaan
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              {rawText}
            </pre>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 rounded-xl bg-brand-600 px-5 py-3 font-medium text-white transition enabled:hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
