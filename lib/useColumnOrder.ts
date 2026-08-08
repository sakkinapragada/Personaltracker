"use client";

import { useEffect, useState } from "react";

export function useColumnOrder<T extends string>(storageKey: string, defaultOrder: T[]) {
  const [order, setOrder] = useState<T[]>(defaultOrder);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed: unknown = JSON.parse(saved);
      const isValid =
        Array.isArray(parsed) &&
        parsed.length === defaultOrder.length &&
        defaultOrder.every((id) => parsed.includes(id));
      if (isValid) setOrder(parsed as T[]);
    } catch {
      // ignore invalid JSON, keep default order
    }
    // Only re-read on mount / if the table's column set itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function moveColumn(draggedId: T, targetId: T) {
    setOrder((prev) => {
      const fromIndex = prev.indexOf(draggedId);
      const toIndex = prev.indexOf(targetId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return { order, moveColumn };
}
