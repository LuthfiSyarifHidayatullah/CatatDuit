import { Expense } from "./types";

const KEY = "catatduit:expenses:v1";

export function loadExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Expense[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(expenses));
}

export function addExpense(expense: Expense): Expense[] {
  const all = loadExpenses();
  const next = [expense, ...all];
  saveExpenses(next);
  return next;
}

export function deleteExpense(id: string): Expense[] {
  const next = loadExpenses().filter((e) => e.id !== id);
  saveExpenses(next);
  return next;
}
