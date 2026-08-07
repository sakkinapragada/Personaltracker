"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ReminderCategory } from "@/lib/types";
import { pickUniqueColor } from "@/lib/colorPalette";

export default function ReminderCategoriesPage() {
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#10b981");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reminder-categories");
    if (res.ok) {
      const data: ReminderCategory[] = await res.json();
      setCategories(data);
      setNewColor(pickUniqueColor(data.map((c) => c.color)));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    const res = await fetch("/api/reminder-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add category");
    }
  }

  function startEdit(c: ReminderCategory) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
  }

  async function saveEdit() {
    if (!editingId) return;
    const res = await fetch(`/api/reminder-categories/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not update category");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/reminder-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not delete category");
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Categories</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Organize reminders into categories like Personal, Work, or Health. New categories get a
        unique color automatically — rename or recolor anytime.
      </p>

      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-10 w-10 rounded border border-rule"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="divide-y divide-rule rounded-xl border border-rule bg-surface shadow-sm">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-8 w-8 rounded border border-rule"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-rule px-2 py-1 text-sm focus:border-accent focus:outline-none"
                  />
                  <button onClick={saveEdit} className="text-sm font-medium text-accent">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-ink-soft">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm font-medium text-ink">{c.name}</span>
                    {c.isDefault && <span className="text-xs text-ink-soft">default</span>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-sm text-ink-soft hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-sm text-rose hover:text-rose-deep"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
