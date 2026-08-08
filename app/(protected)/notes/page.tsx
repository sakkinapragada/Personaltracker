"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Note, NoteBlock } from "@/lib/types";

function newBlock(type: NoteBlock["type"] = "text"): NoteBlock {
  return { id: crypto.randomUUID(), type, text: "", checked: false };
}

function previewText(note: Note): string {
  return note.content
    .map((b) => b.text)
    .filter(Boolean)
    .join(" ");
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const notesRef = useRef<Note[]>([]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const blockRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data: Note[]) => {
        setNotes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (focusBlockId) {
      blockRefs.current[focusBlockId]?.focus();
      setFocusBlockId(null);
    }
  }, [focusBlockId]);

  const scheduleSave = useCallback((noteId: string) => {
    clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(() => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return;
      fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: note.title, content: note.content }),
      });
    }, 500);
  }, []);

  function updateNote(id: string, patch: Partial<Note>) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    scheduleSave(id);
  }

  function updateBlocks(id: string, blocks: NoteBlock[]) {
    updateNote(id, { content: blocks });
  }

  async function handleNewNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: [newBlock()] }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setSelectedId(note.id);
      setMobileView("editor");
      setFocusBlockId(note.content[0]?.id ?? null);
    }
  }

  async function handleTogglePin(note: Note) {
    const pinned = !note.pinned;
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === note.id ? { ...n, pinned } : n));
      return [...updated].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
  }

  async function handleDelete(note: Note) {
    if (!window.confirm(`Delete "${note.title || "Untitled"}"? This can't be undone.`)) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (selectedId === note.id) {
      const remaining = notes.filter((n) => n.id !== note.id);
      setSelectedId(remaining[0]?.id ?? null);
    }
    setMobileView("list");
  }

  function toggleBlockType(note: Note, blockId: string) {
    const blocks = note.content.map((b) =>
      b.id === blockId
        ? b.type === "text"
          ? { ...b, type: "todo" as const, checked: false }
          : { ...b, type: "text" as const, checked: false }
        : b,
    );
    updateBlocks(note.id, blocks);
  }

  function toggleChecked(note: Note, blockId: string) {
    const blocks = note.content.map((b) =>
      b.id === blockId && b.type === "todo" ? { ...b, checked: !b.checked } : b,
    );
    updateBlocks(note.id, blocks);
  }

  function updateBlockText(note: Note, blockId: string, text: string) {
    const blocks = note.content.map((b) => (b.id === blockId ? { ...b, text } : b));
    updateBlocks(note.id, blocks);
  }

  function handleBlockKeyDown(
    e: KeyboardEvent<HTMLInputElement>,
    note: Note,
    index: number,
  ) {
    const block = note.content[index];
    if (e.key === "Enter") {
      e.preventDefault();
      const created = newBlock(block.type);
      const blocks = [...note.content];
      blocks.splice(index + 1, 0, created);
      updateBlocks(note.id, blocks);
      setFocusBlockId(created.id);
    } else if (e.key === "Backspace" && block.text === "" && note.content.length > 1) {
      e.preventDefault();
      const blocks = note.content.filter((b) => b.id !== block.id);
      updateBlocks(note.id, blocks);
      const prevBlock = note.content[index - 1];
      if (prevBlock) setFocusBlockId(prevBlock.id);
    }
  }

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const haystack = `${n.title} ${previewText(n)}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Notes</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Quick notes for daily thoughts and to-do lists — everything autosaves as you type. Click
        the checkbox next to any line to turn it into a to-do; click it again to check it off.
      </p>

      <div className="flex h-[75vh] overflow-hidden rounded-xl border border-rule bg-surface shadow-sm">
        <div
          className={`${
            mobileView === "editor" ? "hidden" : "flex"
          } w-full flex-col md:flex md:w-72 md:flex-shrink-0 md:border-r md:border-rule`}
        >
          <div className="flex items-center gap-2 border-b border-rule p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes"
              className="w-full rounded-lg border border-rule px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleNewNote}
              aria-label="New note"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-lg font-medium text-white hover:bg-accent-deep"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-ink-soft">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">
                {notes.length === 0 ? "No notes yet — create one above." : "No matches."}
              </p>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedId(note.id);
                    setMobileView("editor");
                  }}
                  className={`group flex w-full flex-col gap-0.5 border-b border-rule px-3 py-2.5 text-left ${
                    note.id === selectedId ? "bg-accent-soft" : "hover:bg-paper"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {note.pinned && <span className="text-xs text-accent-deep">📌</span>}
                    <p className="flex-1 truncate text-sm font-semibold text-ink">
                      {note.title || "Untitled"}
                    </p>
                  </div>
                  <p className="truncate text-xs text-ink-soft">
                    {formatRelativeDate(note.updatedAt)}
                    {previewText(note) ? ` — ${previewText(note)}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div
          className={`${
            mobileView === "list" ? "hidden" : "block"
          } flex-1 overflow-y-auto md:block`}
        >
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <button
                onClick={() => setMobileView("list")}
                className="text-xs font-medium text-ink-soft hover:text-ink md:hidden"
              >
                ← Notes
              </button>
              <p className="text-sm text-ink-soft">Select a note, or create a new one.</p>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView("list")}
                    className="text-xs font-medium text-ink-soft hover:text-ink md:hidden"
                  >
                    ← Notes
                  </button>
                  <p className="text-xs text-ink-soft">{formatRelativeDate(selected.updatedAt)}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleTogglePin(selected)}
                    className="text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    {selected.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    className="text-xs font-medium text-rose hover:text-rose-deep"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={selected.title}
                onChange={(e) => updateNote(selected.id, { title: e.target.value })}
                placeholder="Title"
                className="mb-3 w-full font-display text-2xl font-extrabold text-ink placeholder:text-ink-soft focus:outline-none"
              />

              <div className="space-y-1">
                {selected.content.map((block, index) => (
                  <div key={block.id} className="flex items-start gap-2">
                    <button
                      onClick={() =>
                        block.type === "todo"
                          ? toggleChecked(selected, block.id)
                          : toggleBlockType(selected, block.id)
                      }
                      aria-label={block.type === "todo" ? "Toggle done" : "Turn into to-do"}
                      className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-xs leading-none ${
                        block.type === "todo"
                          ? block.checked
                            ? "border-accent bg-accent text-white"
                            : "border-ink-soft"
                          : "border-rule"
                      }`}
                    >
                      {block.type === "todo" && block.checked ? "✓" : ""}
                    </button>
                    <input
                      ref={(el) => {
                        blockRefs.current[block.id] = el;
                      }}
                      type="text"
                      value={block.text}
                      onChange={(e) => updateBlockText(selected, block.id, e.target.value)}
                      onKeyDown={(e) => handleBlockKeyDown(e, selected, index)}
                      placeholder={index === 0 ? "Start typing…" : ""}
                      className={`min-w-0 flex-1 bg-transparent py-0.5 text-sm focus:outline-none ${
                        block.type === "todo" && block.checked
                          ? "text-ink-soft line-through"
                          : "text-ink"
                      }`}
                    />
                    {block.type === "todo" && (
                      <button
                        onClick={() => toggleBlockType(selected, block.id)}
                        aria-label="Turn into text"
                        className="mt-1 flex-shrink-0 text-[10px] font-medium text-ink-soft/70 hover:text-ink"
                      >
                        Aa
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
