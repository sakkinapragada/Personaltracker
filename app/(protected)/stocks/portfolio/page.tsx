"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Stock } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useColumnOrder } from "@/lib/useColumnOrder";
import { SortableHeaderCell, type SortDirection } from "@/components/SortableHeaderCell";

const MASK = "••••••";

type ColumnId = "symbol" | "shares" | "avgCost" | "price" | "value" | "gainLoss";

const COLUMN_DEFS: Record<ColumnId, { label: string; align: "left" | "right" }> = {
  symbol: { label: "Symbol", align: "left" },
  shares: { label: "Shares", align: "right" },
  avgCost: { label: "Avg Cost", align: "right" },
  price: { label: "Price", align: "right" },
  value: { label: "Value", align: "right" },
  gainLoss: { label: "Gain/Loss", align: "right" },
};
const DEFAULT_ORDER: ColumnId[] = ["symbol", "shares", "avgCost", "price", "value", "gainLoss"];

type Enriched = {
  stock: Stock;
  value: number | null;
  cost: number | null;
  gain: number | null;
  gainPercent: number | null;
};

function enrich(s: Stock): Enriched {
  const value = s.shares && s.quote ? s.shares * s.quote.price : null;
  const cost = s.shares && s.avgCost ? s.shares * s.avgCost : null;
  const gain = value !== null && cost !== null ? value - cost : null;
  const gainPercent = gain !== null && cost ? (gain / cost) * 100 : null;
  return { stock: s, value, cost, gain, gainPercent };
}

function sortValue(h: Enriched, id: ColumnId): string | number {
  switch (id) {
    case "symbol":
      return h.stock.symbol;
    case "shares":
      return h.stock.shares ?? -Infinity;
    case "avgCost":
      return h.stock.avgCost ?? -Infinity;
    case "price":
      return h.stock.quote?.price ?? -Infinity;
    case "value":
      return h.value ?? -Infinity;
    case "gainLoss":
      return h.gain ?? -Infinity;
  }
}

function Cell({ h, id, visible }: { h: Enriched; id: ColumnId; visible: boolean }) {
  const { stock: s, value, gain, gainPercent } = h;
  const up = (gain ?? 0) >= 0;
  switch (id) {
    case "symbol":
      return <span className="font-medium text-ink">{s.symbol}</span>;
    case "shares":
      return <span className="text-ink">{s.shares}</span>;
    case "avgCost":
      return <span className="text-ink">{!visible ? MASK : s.avgCost !== null ? formatUsd(s.avgCost) : "—"}</span>;
    case "price":
      return <span className="text-ink">{!visible ? MASK : s.quote ? formatUsd(s.quote.price) : "—"}</span>;
    case "value":
      return (
        <span className="font-medium text-ink">
          {!visible ? MASK : value !== null ? formatUsd(value) : "—"}
        </span>
      );
    case "gainLoss":
      return (
        <span className={`font-medium ${gain === null ? "text-ink-soft" : up ? "text-accent" : "text-rose"}`}>
          {!visible
            ? MASK
            : gain !== null && gainPercent !== null
              ? `${gain >= 0 ? "+" : ""}${formatUsd(gain)} (${gain >= 0 ? "+" : ""}${gainPercent.toFixed(2)}%)`
              : "—"}
        </span>
      );
  }
}

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [amountVisible, setAmountVisible] = useState(false);
  const [sort, setSort] = useState<{ key: ColumnId; direction: SortDirection } | null>(null);
  const { order, moveColumn } = useColumnOrder("stocks-portfolio-columns", DEFAULT_ORDER);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stocks");
    if (res.ok) setStocks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const holdings = stocks.filter((s) => s.shares && s.shares > 0);

  function handleSort(id: ColumnId) {
    setSort((prev) => {
      if (!prev || prev.key !== id) return { key: id, direction: "asc" };
      if (prev.direction === "asc") return { key: id, direction: "desc" };
      return null;
    });
  }

  const enriched = useMemo(() => holdings.map(enrich), [holdings]);

  const sortedHoldings = useMemo(() => {
    if (!sort || !sort.direction) return enriched;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...enriched].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (av - bv) * dir;
    });
  }, [enriched, sort]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    const sharesNum = parseFloat(shares);
    const avgCostNum = parseFloat(avgCost);
    if (!symbol.trim() || !sharesNum || sharesNum <= 0 || !avgCostNum || avgCostNum <= 0) {
      setError("Enter a valid symbol, share count, and average cost");
      return;
    }
    setError(null);
    setSaving(true);
    const res = await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: symbol.trim(), shares: sharesNum, avgCost: avgCostNum }),
    });
    setSaving(false);
    if (res.ok) {
      setSymbol("");
      setShares("");
      setAvgCost("");
      load();
    } else {
      const data = await res.json();
      setError(data.error ?? "Could not save holding");
    }
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/stocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shares: null, avgCost: null }),
    });
    if (res.ok) load();
  }

  let totalValue = 0;
  let totalCost = 0;
  for (const s of holdings) {
    if (s.shares && s.quote) totalValue += s.shares * s.quote.price;
    if (s.shares && s.avgCost) totalCost += s.shares * s.avgCost;
  }
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold text-ink">Portfolio</h1>
        <button
          onClick={() => setAmountVisible((v) => !v)}
          aria-label={amountVisible ? "Hide amounts" : "Show amounts"}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          {amountVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {amountVisible ? "Hide amounts" : "Show amounts"}
        </button>
      </div>
      <p className="mb-1 text-sm text-ink-soft">
        Track what you actually own: enter your shares and average cost per symbol, and watch
        market value and gain or loss update automatically. Simplified on purpose — one average
        cost per symbol, no lot-by-lot tracking. The totals below are hidden by default — tap
        &quot;Show amounts&quot; to reveal them. On desktop, drag a column header to reorder it or
        click one to sort.
      </p>
      <p className="mb-6 text-xs font-medium text-ink-faint">
        Currently supports US stocks only — more markets are coming soon.
      </p>

      {error && <p className="mb-4 text-sm text-rose">{error}</p>}

      <form onSubmit={handleAdd} className="mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="w-28 rounded-lg border border-rule px-3 py-2 text-sm uppercase focus:border-accent focus:outline-none"
        />
        <input
          type="number"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="Shares"
          className="w-28 rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="number"
          step="0.01"
          value={avgCost}
          onChange={(e) => setAvgCost(e.target.value)}
          placeholder="Avg cost/share"
          className="w-36 rounded-lg border border-rule px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add Holding"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : holdings.length === 0 ? (
        <p className="text-sm text-ink-soft">No holdings yet — add one above.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Market Value
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {amountVisible ? formatUsd(totalValue) : MASK}
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Cost Basis
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">
                {amountVisible ? formatUsd(totalCost) : MASK}
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Gain / Loss
              </p>
              <p
                className={`mt-1 text-lg font-semibold ${
                  totalGain >= 0 ? "text-accent" : "text-rose"
                }`}
              >
                {amountVisible
                  ? `${totalGain >= 0 ? "+" : ""}${formatUsd(totalGain)} (${totalGain >= 0 ? "+" : ""}${totalGainPercent.toFixed(2)}%)`
                  : MASK}
              </p>
            </div>
          </div>

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
                {sortedHoldings.map((h) => (
                  <tr key={h.stock.id}>
                    {order.map((id) => (
                      <td
                        key={id}
                        className={`px-4 py-3 ${COLUMN_DEFS[id].align === "right" ? "text-right" : ""}`}
                      >
                        <Cell h={h} id={id} visible={amountVisible} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(h.stock.id)}
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
              <label htmlFor="portfolio-sort" className="text-xs font-medium text-ink-soft">
                Sort by
              </label>
              <select
                id="portfolio-sort"
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
              {sortedHoldings.map((h) => {
                const { stock: s, value, gain, gainPercent } = h;
                const up = (gain ?? 0) >= 0;
                return (
                  <div key={s.id} className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{s.symbol}</p>
                        <p className="text-xs text-ink-soft">{s.shares} shares</p>
                      </div>
                      <button
                        onClick={() => handleRemove(s.id)}
                        className="text-xs font-medium text-rose hover:text-rose-deep"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Avg Cost</p>
                        <p className="text-ink">
                          {!amountVisible ? MASK : s.avgCost !== null ? formatUsd(s.avgCost) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Value</p>
                        <p className="font-medium text-ink">
                          {!amountVisible ? MASK : value !== null ? formatUsd(value) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-ink-faint">Gain/Loss</p>
                        <p className={`font-medium ${gain === null ? "text-ink-soft" : up ? "text-accent" : "text-rose"}`}>
                          {!amountVisible
                            ? MASK
                            : gain !== null && gainPercent !== null
                              ? `${gain >= 0 ? "+" : ""}${gainPercent.toFixed(2)}%`
                              : "—"}
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
