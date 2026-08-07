"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Reminder, ReminderCategory, Recurrence } from "@/lib/types";
import { RECURRENCE_LABELS, RECURRENCE_OPTIONS } from "@/lib/reminderSchedule";
import { pickUniqueColor } from "@/lib/colorPalette";

function todayDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function formatReminderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [recurrence, setRecurrence] = useState<Recurrence>("DAILY");
  const [categoryId, setCategoryId] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#10b981");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reminders");
    if (res.ok) setReminders(await res.json());
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch("/api/reminder-categories");
    if (res.ok) {
      const data: ReminderCategory[] = await res.json();
      setCategories(data);
      setCategoryId((prev) => prev || data[0]?.id || "");
    }
  }

  useEffect(() => {
    load();
    loadCategories();
  }, []);

  function openNewCategory() {
    setNewCategoryColor(pickUniqueColor(categories.map((c) => c.color)));
    setShowNewCategory(true);
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/reminder-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim(), color: newCategoryColor }),
    });
    if (res.ok) {
      const category: ReminderCategory = await res.json();
      setCategories((prev) => [...prev, category]);
      setCategoryId(category.id);
      setNewCategoryName("");
      setShowNewCategory(false);
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add category");
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !categoryId) return;
    setError(null);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        notes: notes.trim() || null,
        date,
        recurrence,
        categoryId,
      }),
    });
    if (res.ok) {
      setTitle("");
      setNotes("");
      setDate(todayDateInputValue());
      setRecurrence("DAILY");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add reminder");
    }
  }

  async function toggleActive(r: Reminder) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    if (res.ok) load();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Reminders</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Active reminders due on a given day are included in that day&apos;s email digest.
      </p>

      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <form
        onSubmit={handleAdd}
        className="mb-6 space-y-2 rounded-xl border border-rule bg-surface p-4 shadow-sm"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Reminder title"
          className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            className="w-full rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

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

        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep"
        >
          Add Reminder
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-ink-soft">No reminders yet.</p>
      ) : (
        <div className="divide-y divide-rule rounded-xl border border-rule bg-surface shadow-sm">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={() => toggleActive(r)}
                  className="h-4 w-4 accent-accent"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: r.category.color }}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      r.isActive ? "text-ink" : "text-ink-soft line-through"
                    }`}
                  >
                    {r.title}
                  </p>
                  {r.notes && <p className="text-xs text-ink-soft">{r.notes}</p>}
                  <p className="text-xs text-ink-soft">
                    {r.category.name} · {formatReminderDate(r.date)} ·{" "}
                    {RECURRENCE_LABELS[r.recurrence]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="text-sm text-rose hover:text-rose-deep"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
