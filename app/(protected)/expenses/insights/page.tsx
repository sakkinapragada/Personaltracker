"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { ExpenseInsightData } from "@/lib/types";
import { formatCents } from "@/lib/money";
import { BulletSummary } from "@/components/BulletSummary";
import { ReadAloudButton } from "@/components/ReadAloudButton";

export default function InsightsPage() {
  const [data, setData] = useState<ExpenseInsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expenses/insights")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div>
        <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Insights</h1>
        <p className="mb-6 text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  const hasAnyData = data.current.total > 0 || data.previous.total > 0;
  const delta = data.current.total - data.previous.total;
  const deltaPercent = data.previous.total > 0 ? (delta / data.previous.total) * 100 : null;

  const categoryNames = Array.from(
    new Set([...data.current.byCategory.map((c) => c.name), ...data.previous.byCategory.map((c) => c.name)]),
  );
  const chartData = categoryNames.map((name) => ({
    name,
    current: (data.current.byCategory.find((c) => c.name === name)?.total ?? 0) / 100,
    previous: (data.previous.byCategory.find((c) => c.name === name)?.total ?? 0) / 100,
  }));

  const projectedPace =
    data.daysElapsed > 0 ? (data.current.total / data.daysElapsed) * data.daysInMonth : 0;
  const budgetDelta = data.monthlyBudget !== null ? projectedPace - data.monthlyBudget : null;

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-extrabold text-ink">Insights</h1>
      <p className="mb-6 text-sm text-ink-soft">
        {data.current.label} so far vs. {data.previous.label}, plus an AI read on your spending
        pattern and a few concrete ways to save.
      </p>

      {!hasAnyData ? (
        <p className="text-sm text-ink-soft">
          No expenses logged yet for {data.current.label} or {data.previous.label} — add a few on
          the Dashboard and check back here.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {data.current.label} so far
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">{formatCents(data.current.total)}</p>
            </div>
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {data.previous.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-ink">{formatCents(data.previous.total)}</p>
            </div>
            <div className="rounded-xl border border-rule bg-surface p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Change vs last month
              </p>
              <p className={`mt-1 text-lg font-semibold ${delta <= 0 ? "text-accent" : "text-rose"}`}>
                {delta >= 0 ? "+" : ""}
                {formatCents(delta)}
                {deltaPercent !== null && ` (${delta >= 0 ? "+" : ""}${deltaPercent.toFixed(0)}%)`}
              </p>
            </div>
          </div>

          {data.monthlyBudget !== null && (
            <div className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
              <p className="mb-2 text-sm font-medium text-ink">Pace against your budget goal</p>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-paper">
                <div
                  className={`h-full rounded-full ${projectedPace > data.monthlyBudget ? "bg-rose" : "bg-accent"}`}
                  style={{
                    width: `${Math.min(100, (projectedPace / data.monthlyBudget) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-ink-soft">
                At your current pace you&apos;re projected to spend {formatCents(projectedPace)} this
                month against a {formatCents(data.monthlyBudget)} goal
                {budgetDelta !== null && budgetDelta > 0
                  ? ` — that's ${formatCents(budgetDelta)} over.`
                  : budgetDelta !== null
                    ? ` — ${formatCents(Math.abs(budgetDelta))} under, nice.`
                    : "."}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-ink">Spending by category</p>
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 44)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="previous" name={data.previous.label} fill="#98a1ad" radius={[0, 4, 4, 0]} />
                <Bar dataKey="current" name={data.current.label} fill="#5e4b96" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">AI read on your spending</p>
              {data.insight && (
                <ReadAloudButton
                  text={`${data.insight.patternSummary}\n${data.insight.nudges.join("\n")}`}
                />
              )}
            </div>
            {data.insight ? (
              <>
                <div className="mb-4">
                  <BulletSummary text={data.insight.patternSummary} />
                </div>
                <ul className="space-y-2">
                  {data.insight.nudges.map((n, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink">
                      <span className="text-accent">→</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-ink-soft">AI summary unavailable right now.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
