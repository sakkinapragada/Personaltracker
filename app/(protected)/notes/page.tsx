"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Note, NoteBlock } from "@/lib/types";
import { ReadAloudButton } from "@/components/ReadAloudButton";

function newBlock(type: NoteBlock["type"] = "text"): NoteBlock {
  return { id: crypto.randomUUID(), type, text: "", checked: false };
}

function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function ChecklistGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <rect x="3" y="4" width="14" height="14" rx="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.5 11 2 2 4-4" />
    </svg>
  );
}

function BulletGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5">
      <circle cx="5" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="5" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M10 6h10M10 12h10M10 18h10" />
    </svg>
  );
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
  const [focusTarget, setFocusTarget] = useState<{ id: string; caret?: number } | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const notesRef = useRef<Note[]>([]);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

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
    if (!focusTarget) return;
    const el = blockRefs.current[focusTarget.id];
    if (el) {
      el.focus();
      if (focusTarget.caret !== undefined) {
        el.setSelectionRange(focusTarget.caret, focusTarget.caret);
      }
    }
    setFocusTarget(null);
  }, [focusTarget]);

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
      if (note.content[0]) setFocusTarget({ id: note.content[0].id });
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

  function setBlockType(note: Note, blockId: string, type: NoteBlock["type"]) {
    const blocks = note.content.map((b) => (b.id === blockId ? { ...b, type, checked: false } : b));
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
    e: KeyboardEvent<HTMLTextAreaElement>,
    note: Note,
    index: number,
  ) {
    const block = note.content[index];
    const el = e.currentTarget;
    const noMods = !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (block.type !== "text" && block.text === "") {
        setBlockType(note, block.id, "text");
        return;
      }
      const created = newBlock(block.type);
      const blocks = [...note.content];
      blocks.splice(index + 1, 0, created);
      updateBlocks(note.id, blocks);
      setFocusTarget({ id: created.id });
      return;
    }

    if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0) {
      const prevBlock = note.content[index - 1];
      if (!prevBlock) return;
      e.preventDefault();
      const blocks = note.content
        .filter((b) => b.id !== block.id)
        .map((b) => (b.id === prevBlock.id ? { ...b, text: prevBlock.text + block.text } : b));
      updateBlocks(note.id, blocks);
      setFocusTarget({ id: prevBlock.id, caret: prevBlock.text.length });
      return;
    }

    if (e.key === "Delete" && el.selectionStart === block.text.length && el.selectionEnd === block.text.length) {
      const nextBlock = note.content[index + 1];
      if (!nextBlock) return;
      e.preventDefault();
      const blocks = note.content
        .filter((b) => b.id !== nextBlock.id)
        .map((b) => (b.id === block.id ? { ...b, text: block.text + nextBlock.text } : b));
      updateBlocks(note.id, blocks);
      return;
    }

    if (e.key === "ArrowUp" && noMods && el.selectionStart === 0 && el.selectionEnd === 0) {
      const prevBlock = note.content[index - 1];
      if (!prevBlock) return;
      e.preventDefault();
      setFocusTarget({ id: prevBlock.id, caret: prevBlock.text.length });
      return;
    }

    if (
      e.key === "ArrowDown" &&
      noMods &&
      el.selectionStart === block.text.length &&
      el.selectionEnd === block.text.length
    ) {
      const nextBlock = note.content[index + 1];
      if (!nextBlock) return;
      e.preventDefault();
      setFocusTarget({ id: nextBlock.id, caret: 0 });
    }
  }

  function appendBlock(note: Note, type: NoteBlock["type"]) {
    const created = newBlock(type);
    updateBlocks(note.id, [...note.content, created]);
    setFocusTarget({ id: created.id });
  }

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const haystack = `${n.title} ${previewText(n)}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const noteSpeechText = selected
    ? [selected.title, ...selected.content.map((b) => b.text)].filter(Boolean).join("\n")
    : "";

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Notes</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Every note starts as a plain paragraph, just like Apple Notes — turn any line into a
        bulleted or checklist item (and back) whenever you need to, and listen back to a note
        with the read-aloud button.
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
                <div className="flex items-center gap-3">
                  <ReadAloudButton text={noteSpeechText} />
                  <button
                    onClick={() => appendBlock(selected, "bullet")}
                    title="Add bulleted item"
                    className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    <BulletGlyph /> Bullets
                  </button>
                  <button
                    onClick={() => appendBlock(selected, "todo")}
                    title="Add checklist item"
                    className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    <ChecklistGlyph /> Checklist
                  </button>
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
                    {block.type === "todo" && (
                      <button
                        onClick={() => toggleChecked(selected, block.id)}
                        aria-label="Toggle done"
                        className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-xs leading-none ${
                          block.checked ? "border-accent bg-accent text-white" : "border-ink-soft"
                        }`}
                      >
                        {block.checked ? "✓" : ""}
                      </button>
                    )}
                    {block.type === "bullet" && (
                      <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center text-ink-soft">
                        •
                      </span>
                    )}
                    <textarea
                      ref={(el) => {
                        blockRefs.current[block.id] = el;
                        autoResize(el);
                      }}
                      rows={1}
                      value={block.text}
                      onChange={(e) => {
                        updateBlockText(selected, block.id, e.target.value);
                        autoResize(e.target);
                      }}
                      onKeyDown={(e) => handleBlockKeyDown(e, selected, index)}
                      placeholder={index === 0 ? "Start typing…" : ""}
                      className={`min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-0.5 text-sm leading-snug focus:outline-none ${
                        block.type === "todo" && block.checked
                          ? "text-ink-soft line-through"
                          : "text-ink"
                      }`}
                    />
                    <select
                      value={block.type}
                      onChange={(e) => setBlockType(selected, block.id, e.target.value as NoteBlock["type"])}
                      aria-label="Line format"
                      title="Line format"
                      className="mt-1 flex-shrink-0 cursor-pointer rounded border-none bg-transparent text-[11px] font-medium text-ink-soft/70 hover:text-ink focus:outline-none"
                    >
                      <option value="text">Aa</option>
                      <option value="bullet">•</option>
                      <option value="todo">☑</option>
                    </select>
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
