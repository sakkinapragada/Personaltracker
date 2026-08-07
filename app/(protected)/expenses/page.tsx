"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, Expense } from "@/lib/types";
import { currentMonthKey, formatDayLabel } from "@/lib/month";
import { formatCents } from "@/lib/money";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { ExpenseModal } from "@/components/ExpenseModal";

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/expenses?month=${month}`);
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }, [month]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.date.slice(0, 10);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeModal();
    loadExpenses();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <MonthSwitcher month={month} onChange={setMonth} />
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add Expense
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Total this month
        </p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{formatCents(total)}</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : days.length === 0 ? (
        <p className="text-sm text-gray-500">No expenses yet for this month.</p>
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <div key={day}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                {formatDayLabel(day)}
              </p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
                {grouped[day].map((e) => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setEditing(e);
                      setModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: e.category.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {e.description || e.category.name}
                        </p>
                        <p className="text-xs text-gray-500">{e.category.name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCents(e.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ExpenseModal
          categories={categories}
          initial={
            editing
              ? {
                  id: editing.id,
                  amount: editing.amount,
                  description: editing.description,
                  date: editing.date,
                  categoryId: editing.categoryId,
                }
              : undefined
          }
          onClose={closeModal}
          onSaved={handleSaved}
          onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
        />
      )}
    </div>
  );
}
