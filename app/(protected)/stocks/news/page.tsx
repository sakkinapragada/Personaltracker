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
      <h1 className="mb-1 text-xl font-semibold text-gray-900">News</h1>
      <p className="mb-6 text-sm text-gray-500">
        An AI-generated summary of recent news for each stock you track.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-500">No stocks tracked yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const up = (g.changePercent ?? 0) >= 0;
            return (
              <div
                key={g.symbol}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{g.symbol}</span>
                  {g.name && <span className="text-xs text-gray-400">{g.name}</span>}
                  {g.changePercent !== null && (
                    <span
                      className={`ml-auto text-xs font-medium ${
                        up ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {up ? "+" : ""}
                      {g.changePercent.toFixed(2)}% today
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{g.summary}</p>

                {g.articles.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [g.symbol]: !prev[g.symbol] }))}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      {expanded[g.symbol] ? "Hide sources" : `Show ${g.articles.length} source(s)`}
                    </button>
                    {expanded[g.symbol] && (
                      <ul className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                        {g.articles.map((a) => (
                          <li key={a.id} className="text-xs">
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 hover:text-emerald-600 hover:underline"
                            >
                              {a.headline}
                            </a>
                            <span className="text-gray-400">
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
