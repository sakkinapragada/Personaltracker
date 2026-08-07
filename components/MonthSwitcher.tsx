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
        className="rounded-full border border-gray-300 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="w-36 text-center text-sm font-medium text-gray-900">
        {formatMonthLabel(month)}
      </span>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-full border border-gray-300 px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
