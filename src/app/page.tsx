"use client";

import { useEffect, useState } from "react";
import ReceiptScanner from "@/components/ReceiptScanner";
import ExpenseForm from "@/components/ExpenseForm";
import ExpenseList from "@/components/ExpenseList";
import SummaryCard from "@/components/SummaryCard";
import { Expense, ParsedReceipt } from "@/lib/types";
import { addExpense, deleteExpense, loadExpenses } from "@/lib/storage";

type View =
  | { mode: "scan" }
  | { mode: "manual" }
  | { mode: "review"; parsed: ParsedReceipt; rawText: string };

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [view, setView] = useState<View>({ mode: "scan" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExpenses(loadExpenses());
    setMounted(true);
  }, []);

  const handleSave = (expense: Expense) => {
    setExpenses(addExpense(expense));
    setView({ mode: "scan" });
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
          Foto struk untuk input otomatis, atau catat manual. Tinggal simpan.
        </p>
      </header>

      {mounted && (
        <div className="mb-6">
          <SummaryCard expenses={expenses} />
        </div>
      )}

      <section className="mb-8">
        {view.mode === "scan" && (
          <>
            <ReceiptScanner
              onResult={({ parsed, rawText }) =>
                setView({ mode: "review", parsed, rawText })
              }
            />
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              atau
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <button
              onClick={() => setView({ mode: "manual" })}
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ✍️ Catat manual (tanpa struk)
            </button>
          </>
        )}

        {view.mode === "manual" && (
          <ExpenseForm
            onSave={handleSave}
            onCancel={() => setView({ mode: "scan" })}
          />
        )}

        {view.mode === "review" && (
          <ExpenseForm
            parsed={view.parsed}
            rawText={view.rawText}
            onSave={handleSave}
            onCancel={() => setView({ mode: "scan" })}
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
