"use client";

import { useEffect, useState } from "react";
import type { StockNewsGroup } from "@/lib/types";

function formatDatetime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StockNewsPage() {
  const [groups, setGroups] = useState<StockNewsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/stocks/news")
      .then((res) => res.json())
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">News</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Instead of scrolling dozens of headlines per stock, get a short AI summary of what&apos;s
        actually happened recently. A ⚡ badge flags articles published on a day the stock moved
        more than 3%, so you can tell noise from what might have actually moved the price.
      </p>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-soft">No stocks tracked yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const up = (g.changePercent ?? 0) >= 0;
            return (
              <div
                key={g.symbol}
                className="rounded-xl border border-rule bg-surface p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{g.symbol}</span>
                  {g.name && <span className="text-xs text-ink-soft">{g.name}</span>}
                  {g.changePercent !== null && (
                    <span
                      className={`ml-auto text-xs font-medium ${
                        up ? "text-accent" : "text-rose"
                      }`}
                    >
                      {up ? "+" : ""}
                      {g.changePercent.toFixed(2)}% today
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink">{g.summary}</p>

                {g.articles.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [g.symbol]: !prev[g.symbol] }))}
                      className="text-xs font-medium text-ink-soft hover:text-ink"
                    >
                      {expanded[g.symbol] ? "Hide sources" : `Show ${g.articles.length} source(s)`}
                    </button>
                    {expanded[g.symbol] && (
                      <ul className="mt-2 space-y-1.5 border-t border-rule pt-2">
                        {g.articles.map((a) => (
                          <li key={a.id} className="text-xs">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink hover:text-accent hover:underline"
                            >
                              {a.headline}
                            </a>
                            <span className="text-ink-soft">
                              {" "}
                              — {a.source}, {formatDatetime(a.datetime)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
