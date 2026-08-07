"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Stock } from "@/lib/types";
import { formatUsd } from "@/lib/money";

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/stocks");
    if (res.ok) setStocks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
      <h1 className="mb-1 text-xl font-semibold text-ink">Screener</h1>
      <p className="mb-6 text-sm text-ink-soft">Prices refresh roughly every minute.</p>

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
        <div className="overflow-x-auto rounded-xl border border-rule bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Change</th>
                <th className="px-4 py-3 text-right">Day Range</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {stocks.map((s) => {
                const up = (s.quote?.changePercent ?? 0) >= 0;
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-ink">{s.symbol}</td>
                    <td className="px-4 py-3 text-ink-soft">{s.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">
                      {s.quote ? formatUsd(s.quote.price) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        s.quote ? (up ? "text-accent" : "text-rose") : "text-ink-soft"
                      }`}
                    >
                      {s.quote
                        ? `${up ? "+" : ""}${s.quote.change?.toFixed(2)} (${up ? "+" : ""}${s.quote.changePercent?.toFixed(2)}%)`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-soft">
                      {s.quote ? `${formatUsd(s.quote.low)} – ${formatUsd(s.quote.high)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-sm text-rose hover:text-rose-deep"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
