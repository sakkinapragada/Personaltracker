"use client";

import { useState } from "react";
import { ChevronUpDownIcon } from "@/components/icons";

export type SortDirection = "asc" | "desc" | null;

export function SortableHeaderCell({
  id,
  label,
  align = "left",
  sortable = true,
  sortDirection,
  onSort,
  onReorder,
}: {
  id: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  sortDirection: SortDirection;
  onSort: () => void;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <th
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== id) onReorder(draggedId, id);
      }}
      className={`cursor-grab px-4 py-3 text-xs uppercase tracking-wide text-ink-soft select-none ${
        align === "right" ? "text-right" : "text-left"
      } ${dragOver ? "bg-accent-soft" : ""}`}
    >
      <button
        type="button"
        onClick={sortable ? onSort : undefined}
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${
          sortable ? "hover:text-ink" : "cursor-default"
        }`}
      >
        {label}
        {sortable &&
          (sortDirection === "asc" ? (
            <span className="text-[10px] text-accent">▲</span>
          ) : sortDirection === "desc" ? (
            <span className="text-[10px] text-accent">▼</span>
          ) : (
            <ChevronUpDownIcon className="h-3 w-3 text-ink-faint" />
          ))}
      </button>
    </th>
  );
}
