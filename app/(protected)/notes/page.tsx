"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import type { Note } from "@/lib/types";
import { EMPTY_DOC, extractPlainText, toEditorContent } from "@/lib/notesContent";
import { ReadAloudButton } from "@/components/ReadAloudButton";

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

function BoldGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6zM6 11h8a3.5 3.5 0 0 1 0 7H6z" />
    </svg>
  );
}

function ItalicGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M10 4h6M6 20h6M13 4 9 20" />
    </svg>
  );
}

function BulletListGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4 w-4">
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </svg>
  );
}

function ChecklistGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="4" width="5" height="5" rx="1" />
      <path d="m4 6.5 1 1 2-2" />
      <path d="M11 6.5h10" />
      <rect x="3" y="15" width="5" height="5" rx="1" />
      <path d="M11 17.5h10" />
    </svg>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition ${
        active ? "bg-accent-soft text-accent" : "text-ink-soft hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function previewText(note: Note): string {
  return extractPlainText(note.content);
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  const notesRef = useRef<Note[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const focusAfterLoadRef = useRef(false);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    fetch("/api/notes")
      .then((res) => res.json())
      .then((data: Note[]) => {
        setNotes(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      scheduleSave(id);
    },
    [scheduleSave],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start typing…" }),
    ],
    content: EMPTY_DOC,
    editorProps: {
      attributes: { class: "tiptap-note min-h-[45vh] text-sm text-ink" },
    },
    onUpdate: ({ editor }) => {
      const id = selectedIdRef.current;
      if (!id) return;
      updateNote(id, { content: editor.getJSON() });
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !selectedId) return;
    const note = notesRef.current.find((n) => n.id === selectedId);
    editor.commands.setContent(toEditorContent(note?.content), { emitUpdate: false });
    if (focusAfterLoadRef.current) {
      focusAfterLoadRef.current = false;
      editor.commands.focus();
    }
  }, [editor, selectedId]);

  const toolbarState = useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive("bold") ?? false,
      italic: ctx.editor?.isActive("italic") ?? false,
      bulletList: ctx.editor?.isActive("bulletList") ?? false,
      taskList: ctx.editor?.isActive("taskList") ?? false,
    }),
  }) ?? { bold: false, italic: false, bulletList: false, taskList: false };

  async function handleNewNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: EMPTY_DOC }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNotes((prev) => [note, ...prev]);
      focusAfterLoadRef.current = true;
      setSelectedId(note.id);
      setMobileView("editor");
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

  const filtered = notes.filter((n) => {
    if (!search.trim()) return true;
    const haystack = `${n.title} ${previewText(n)}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const noteSpeechText = selected ? `${selected.title}\n${editor?.getText() ?? ""}` : "";

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Notes</h1>
      <p className="mb-6 text-sm text-ink-soft">
        One continuous note, just like Apple Notes — type freely, and use the toolbar to turn any
        line into a bulleted or checklist item.
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
            mobileView === "list" ? "hidden" : "flex"
          } flex-1 flex-col overflow-y-auto md:flex`}
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
            <div className="flex flex-1 flex-col p-4 md:p-6">
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

              <div className="mb-2 flex items-center gap-1 border-b border-rule pb-2">
                <ToolbarButton
                  active={toolbarState.bold}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  label="Bold"
                >
                  <BoldGlyph />
                </ToolbarButton>
                <ToolbarButton
                  active={toolbarState.italic}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  label="Italic"
                >
                  <ItalicGlyph />
                </ToolbarButton>
                <ToolbarButton
                  active={toolbarState.bulletList}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  label="Bulleted list"
                >
                  <BulletListGlyph />
                </ToolbarButton>
                <ToolbarButton
                  active={toolbarState.taskList}
                  onClick={() => editor?.chain().focus().toggleTaskList().run()}
                  label="Checklist"
                >
                  <ChecklistGlyph />
                </ToolbarButton>
              </div>

              <div className="flex-1 cursor-text" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
