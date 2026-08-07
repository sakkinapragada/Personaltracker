"use client";

import { useEffect, useState } from "react";
import type { EarningsInfo } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function hourLabel(hour: string | null): string {
  if (hour === "bmo") return "Before market open";
  if (hour === "amc") return "After market close";
  return "Time not announced";
}

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stocks/earnings");
    if (res.ok) setEarnings(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddReminder(e: EarningsInfo) {
    setAddingFor(e.symbol);
    await fetch("/api/stocks/earnings/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: e.symbol,
        date: e.date,
        quarter: e.quarter,
        year: e.year,
        epsEstimate: e.epsEstimate,
        revenueEstimate: e.revenueEstimate,
      }),
    });
    setAddingFor(null);
    load();
  }

  const withDates = earnings.filter((e) => e.date);
  const withoutDates = earnings.filter((e) => !e.date);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Earnings</h1>
      <p className="mb-6 text-sm text-gray-500">
        Next announced earnings date for each stock you track.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : earnings.length === 0 ? (
        <p className="text-sm text-gray-500">No stocks tracked yet.</p>
      ) : (
        <div className="space-y-3">
          {withDates.map((e) => (
            <div
              key={e.symbol}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {e.symbol} <span className="text-gray-400">· {e.name}</span>
                </p>
                <p className="text-sm text-gray-700">
                  {formatDate(e.date!)} — {hourLabel(e.hour)}
                </p>
                {e.epsEstimate !== null && (
                  <p className="text-xs text-gray-400">EPS estimate: ${e.epsEstimate.toFixed(2)}</p>
                )}
              </div>
              <button
                onClick={() => handleAddReminder(e)}
                disabled={e.reminderAdded || addingFor === e.symbol}
                className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {e.reminderAdded ? "Added ✓" : addingFor === e.symbol ? "Adding…" : "Add as Reminder"}
              </button>
            </div>
          ))}

          {withoutDates.length > 0 && (
            <p className="pt-2 text-xs text-gray-400">
              No upcoming earnings date found for:{" "}
              {withoutDates.map((e) => e.symbol).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
