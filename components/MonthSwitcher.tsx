"use client";

import { formatMonthLabel, shiftMonth } from "@/lib/month";

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-full border border-rule px-2.5 py-1 text-sm text-ink-soft hover:bg-paper"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="w-36 text-center text-sm font-medium text-ink">
        {formatMonthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-full border border-rule px-2.5 py-1 text-sm text-ink-soft hover:bg-paper"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
