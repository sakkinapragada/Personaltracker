"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Stock } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

const MASK = "••••••";

export default function PortfolioPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [amountVisible, setAmountVisible] = useState(false);

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
      <p className="mb-6 text-sm text-ink-soft">
        Track what you actually own: enter your shares and average cost per symbol, and watch
        market value and gain or loss update automatically. Simplified on purpose — one average
        cost per symbol, no lot-by-lot tracking. The totals below are hidden by default — tap
        &quot;Show amounts&quot; to reveal them.
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

          <div className="overflow-x-auto rounded-xl border border-rule bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3 text-right">Shares</th>
                  <th className="px-4 py-3 text-right">Avg Cost</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Gain/Loss</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {holdings.map((s) => {
                  const value = s.shares && s.quote ? s.shares * s.quote.price : null;
                  const cost = s.shares && s.avgCost ? s.shares * s.avgCost : null;
                  const gain = value !== null && cost !== null ? value - cost : null;
                  const gainPercent = gain !== null && cost ? (gain / cost) * 100 : null;
                  const up = (gain ?? 0) >= 0;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-medium text-ink">{s.symbol}</td>
                      <td className="px-4 py-3 text-right text-ink">{s.shares}</td>
                      <td className="px-4 py-3 text-right text-ink">
                        {s.avgCost !== null ? formatUsd(s.avgCost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-ink">
                        {s.quote ? formatUsd(s.quote.price) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink">
                        {value !== null ? formatUsd(value) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          gain === null ? "text-ink-soft" : up ? "text-accent" : "text-rose"
                        }`}
                      >
                        {gain !== null && gainPercent !== null
                          ? `${gain >= 0 ? "+" : ""}${formatUsd(gain)} (${gain >= 0 ? "+" : ""}${gainPercent.toFixed(2)}%)`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(s.id)}
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
        </>
      )}
    </div>
  );
}
