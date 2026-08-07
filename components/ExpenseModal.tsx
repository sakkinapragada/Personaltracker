"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/lib/types";
import { pickUniqueColor } from "@/lib/colorPalette";

type Initial = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  categoryId: string;
};

type Props = {
  categories: Category[];
  initial?: Initial;
  onClose: () => void;
  onSaved: () => void;
  onCategoryCreated: (category: Category) => void;
};

export function ExpenseModal({ categories, initial, onClose, onSaved, onCategoryCreated }: Props) {
  const [amount, setAmount] = useState(initial ? (initial.amount / 100).toString() : "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    initial?.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#10b981");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openNewCategory() {
    setNewCategoryColor(pickUniqueColor(categories.map((c) => c.color)));
    setShowNewCategory(true);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor }),
    });
    if (res.ok) {
      const category = await res.json();
      onCategoryCreated(category);
      setCategoryId(category.id);
      setNewCategoryName("");
      setShowNewCategory(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add category");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !categoryId || !date) {
      setError("Enter a valid amount, category, and date");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      amount: Math.round(parsedAmount * 100),
      categoryId,
      description: description.trim() || null,
      date,
    };
    const res = await fetch(initial ? `/api/expenses/${initial.id}` : "/api/expenses", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not save expense");
    }
  }

  async function handleDelete() {
    if (!initial) return;
    setSaving(true);
    const res = await fetch(`/api/expenses/${initial.id}`, { method: "DELETE" });
    setSaving(false);
    if (res.ok) onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-ink">
          {initial ? "Edit Expense" : "Add Expense"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
              placeholder="0.00"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Category</label>
            {!showNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={openNewCategory}
                  className="whitespace-nowrap rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:bg-paper"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="h-9 w-9 rounded border border-rule"
                />
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="whitespace-nowrap rounded-full bg-accent px-3 py-2 text-sm text-white hover:bg-accent-deep"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  className="whitespace-nowrap rounded-lg border border-rule px-3 py-2 text-sm text-ink-soft hover:bg-paper"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-rose">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              {initial && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-sm text-rose hover:text-rose-deep"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-rule px-4 py-2 text-sm text-ink-soft hover:bg-paper"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
