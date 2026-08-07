"use client";

import { useEffect, useState } from "react";
import type { EarningsRecap } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtMoney(n: number | null): string {
  if (n === null) return "n/a";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

export default function EarningsRecapPage() {
  const [recaps, setRecaps] = useState<EarningsRecap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stocks/earnings-recap")
      .then((res) => res.json())
      .then(setRecaps)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Earnings Recap</h1>
      <p className="mb-6 text-sm text-ink-soft">
        AI summary of the last announced earnings for each stock you track.
      </p>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : recaps.length === 0 ? (
        <p className="text-sm text-ink-soft">No past earnings found for your tracked stocks.</p>
      ) : (
        <div className="space-y-4">
          {recaps.map((r) => {
            const epsBeat = r.epsActual !== null && r.epsEstimate !== null && r.epsActual >= r.epsEstimate;
            return (
              <div
                key={r.symbol}
                className="rounded-xl border border-rule bg-surface p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{r.symbol}</span>
                  {r.name && <span className="text-xs text-ink-soft">{r.name}</span>}
                  <span className="ml-auto text-xs text-ink-soft">
                    Q{r.quarter} {r.year} · {formatDate(r.date)}
                  </span>
                </div>
                <p className="mb-3 text-sm text-ink">{r.summary}</p>
                <div className="flex gap-6 text-xs text-ink-soft">
                  <span>
                    EPS: <strong className={epsBeat ? "text-accent" : "text-rose"}>
                      {r.epsActual ?? "n/a"}
                    </strong>{" "}
                    vs est. {r.epsEstimate ?? "n/a"}
                  </span>
                  <span>
                    Revenue: <strong className="text-ink">{fmtMoney(r.revenueActual)}</strong>{" "}
                    vs est. {fmtMoney(r.revenueEstimate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
