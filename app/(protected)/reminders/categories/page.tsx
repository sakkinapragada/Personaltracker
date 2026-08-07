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
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Categories</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-10 w-10 rounded border border-gray-300"
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3">
              {editingId === c.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="h-8 w-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <button onClick={saveEdit} className="text-sm font-medium text-emerald-600">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-500">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    {c.isDefault && <span className="text-xs text-gray-400">default</span>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-sm text-gray-500 hover:text-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-sm text-red-500 hover:text-red-700"
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
