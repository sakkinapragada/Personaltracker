"use client";

import { useEffect, useState } from "react";
import type { Reminder } from "@/lib/types";
import { RECURRENCE_LABELS } from "@/lib/reminderSchedule";

function formatReminderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ReminderSummaryPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reminders")
      .then((res) => res.json())
      .then(setReminders)
      .finally(() => setLoading(false));
  }, []);

  const groups = new Map<string, { name: string; color: string; reminders: Reminder[] }>();
  for (const r of reminders) {
    const existing = groups.get(r.categoryId);
    if (existing) {
      existing.reminders.push(r);
    } else {
      groups.set(r.categoryId, { name: r.category.name, color: r.category.color, reminders: [r] });
    }
  }
  const sortedGroups = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Summary</h1>
      <p className="mb-6 text-sm text-ink-soft">All your reminders, grouped by category.</p>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : sortedGroups.length === 0 ? (
        <p className="text-sm text-ink-soft">No reminders yet.</p>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((group) => (
            <div key={group.name}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <p className="text-sm font-semibold text-ink">{group.name}</p>
                <span className="text-xs text-ink-soft">({group.reminders.length})</span>
              </div>
              <div className="divide-y divide-rule rounded-xl border border-rule bg-surface shadow-sm">
                {group.reminders.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <p
                      className={`text-sm font-medium ${
                        r.isActive ? "text-ink" : "text-ink-soft line-through"
                      }`}
                    >
                      {r.title}
                    </p>
                    {r.notes && <p className="text-xs text-ink-soft">{r.notes}</p>}
                    <p className="text-xs text-ink-soft">
                      {formatReminderDate(r.date)} · {RECURRENCE_LABELS[r.recurrence]}
                      {!r.isActive && " · inactive"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
