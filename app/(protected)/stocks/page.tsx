"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Stock } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { useColumnOrder } from "@/lib/useColumnOrder";
import { SortableHeaderCell, type SortDirection } from "@/components/SortableHeaderCell";

type ColumnId = "symbol" | "name" | "price" | "change" | "range";

const COLUMN_DEFS: Record<ColumnId, { label: string; align: "left" | "right" }> = {
  symbol: { label: "Symbol", align: "left" },
  name: { label: "Name", align: "left" },
  price: { label: "Price", align: "right" },
  change: { label: "Change", align: "right" },
  range: { label: "Day Range", align: "right" },
};
const DEFAULT_ORDER: ColumnId[] = ["symbol", "name", "price", "change", "range"];

function sortValue(s: Stock, id: ColumnId): string | number {
  switch (id) {
    case "symbol":
      return s.symbol;
    case "name":
      return s.name ?? "";
    case "price":
      return s.quote?.price ?? -Infinity;
    case "change":
      return s.quote?.changePercent ?? -Infinity;
    case "range":
      return s.quote?.high ?? -Infinity;
  }
}

function Cell({ stock: s, id }: { stock: Stock; id: ColumnId }) {
  const up = (s.quote?.changePercent ?? 0) >= 0;
  switch (id) {
    case "symbol":
      return <span className="font-medium text-ink">{s.symbol}</span>;
    case "name":
      return <span className="text-ink-soft">{s.name ?? "—"}</span>;
    case "price":
      return <span className="font-medium text-ink">{s.quote ? formatUsd(s.quote.price) : "—"}</span>;
    case "change":
      return (
        <span className={`font-medium ${s.quote ? (up ? "text-accent" : "text-rose") : "text-ink-soft"}`}>
          {s.quote
            ? `${up ? "+" : ""}${s.quote.change?.toFixed(2)} (${up ? "+" : ""}${s.quote.changePercent?.toFixed(2)}%)`
            : "—"}
        </span>
      );
    case "range":
      return (
        <span className="text-ink-soft">
          {s.quote ? `${formatUsd(s.quote.low)} – ${formatUsd(s.quote.high)}` : "—"}
        </span>
      );
  }
}

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<{ key: ColumnId; direction: SortDirection } | null>(null);
  const { order, moveColumn } = useColumnOrder("stocks-screener-columns", DEFAULT_ORDER);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stocks");
    if (res.ok) setStocks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSort(id: ColumnId) {
    setSort((prev) => {
      if (!prev || prev.key !== id) return { key: id, direction: "asc" };
      if (prev.direction === "asc") return { key: id, direction: "desc" };
      return null;
    });
  }

  const sortedStocks = useMemo(() => {
    if (!sort || !sort.direction) return stocks;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...stocks].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (av - bv) * dir;
    });
  }, [stocks, sort]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) return;
    setError(null);
    setAdding(true);
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: symbol.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setSymbol("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not add stock");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/stocks/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Screener</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Add any ticker to keep an eye on its price and daily move — no need to own it. Prices
        refresh roughly every minute while you&apos;re on the page. Drag a column header to
        reorder it, or click one to sort.
      </p>

      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Ticker symbol (e.g. AAPL)"
          className="w-full rounded-lg border border-rule px-3 py-2 text-sm uppercase focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={adding}
          className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add Stock"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : stocks.length === 0 ? (
        <p className="text-sm text-ink-soft">No stocks yet — add one above.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-rule bg-surface shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  {order.map((id) => (
                    <SortableHeaderCell
                      key={id}
                      id={id}
                      label={COLUMN_DEFS[id].label}
                      align={COLUMN_DEFS[id].align}
                      sortDirection={sort?.key === id ? sort.direction : null}
                      onSort={() => handleSort(id)}
                      onReorder={(draggedId, targetId) =>
                        moveColumn(draggedId as ColumnId, targetId as ColumnId)
                      }
                    />
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {sortedStocks.map((s) => (
                  <tr key={s.id}>
                    {order.map((id) => (
                      <td
                        key={id}
                        className={`px-4 py-3 ${COLUMN_DEFS[id].align === "right" ? "text-right" : ""}`}
                      >
                        <Cell stock={s} id={id} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-sm text-rose hover:text-rose-deep"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden">
            <div className="mb-3 flex items-center gap-2">
              <label htmlFor="screener-sort" className="text-xs font-medium text-ink-soft">
                Sort by
              </label>
              <select
                id="screener-sort"
                value={sort?.key ?? ""}
                onChange={(e) => {
                  const key = e.target.value as ColumnId | "";
                  setSort(key ? { key, direction: "asc" } : null);
                }}
                className="rounded-lg border border-rule px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">Default</option>
                {DEFAULT_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {COLUMN_DEFS[id].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {sortedStocks.map((s) => {
                const up = (s.quote?.changePercent ?? 0) >= 0;
                return (
                  <div key={s.id} className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{s.symbol}</p>
                        <p className="text-xs text-ink-soft">{s.name ?? "—"}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs font-medium text-rose hover:text-rose-deep"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Price</p>
                        <p className="font-medium text-ink">{s.quote ? formatUsd(s.quote.price) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Change</p>
                        <p className={`font-medium ${s.quote ? (up ? "text-accent" : "text-rose") : "text-ink-soft"}`}>
                          {s.quote ? `${up ? "+" : ""}${s.quote.changePercent?.toFixed(2)}%` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Range</p>
                        <p className="text-ink-soft">
                          {s.quote ? `${formatUsd(s.quote.low)}–${formatUsd(s.quote.high)}` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
