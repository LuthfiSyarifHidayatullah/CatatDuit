"use client";

import { useEffect, useState } from "react";
import ReceiptScanner from "@/components/ReceiptScanner";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import SummaryCard from "@/components/SummaryCard";
import { Expense, ParsedReceipt } from "@/lib/types";
import { addExpense, deleteExpense, loadExpenses } from "@/lib/storage";

type Draft = {
  parsed: ParsedReceipt;
  rawText: string;
} | null;

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [draft, setDraft] = useState<Draft>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses());
    setMounted(true);
  }, []);

  const handleSave = (expense: Expense) => {
    setExpenses(addExpense(expense));
    setDraft(null);
  };

  const handleDelete = (id: string) => {
    setExpenses(deleteExpense(id));
  };

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          Catat<span className="text-brand-600">Duit</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Foto struk, biarkan terbaca otomatis, tinggal simpan.
        </p>
      </header>

      {mounted && (
        <div className="mb-6">
          <SummaryCard expenses={expenses} />
        </div>
      )}

      <section className="mb-8">
        {draft ? (
          <ExpenseForm
            parsed={draft.parsed}
            rawText={draft.rawText}
            onSave={handleSave}
            onCancel={() => setDraft(null)}
          />
        ) : (
          <ReceiptScanner
            onResult={({ parsed, rawText }) => setDraft({ parsed, rawText })}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Riwayat pengeluaran
        </h2>
        {mounted && <ExpenseList expenses={expenses} onDelete={handleDelete} />}
      </section>

      <footer className="mt-10 text-center text-xs text-slate-400">
        Semua data tersimpan di perangkatmu (localStorage). Tanpa server, tanpa
        API, tanpa biaya.
      </footer>
    </main>
  );
}
