"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currentMonthKey, formatMonthLabel } from "@/lib/month";
import { formatCents } from "@/lib/money";
import { MonthSwitcher } from "@/components/MonthSwitcher";

type TrendsData = {
  monthly: { month: string; total: number }[];
  byCategory: { name: string; color: string; total: number }[];
  selectedMonth: string;
};

export default function TrendsPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/trends?month=${month}`)
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [month]);

  const monthlyChartData =
    data?.monthly.map((m) => ({
      label: formatMonthLabel(m.month).slice(0, 3),
      total: m.total / 100,
    })) ?? [];

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-xl font-extrabold text-ink">Trends</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </div>
      <p className="mb-6 text-sm text-ink-soft">
        Compare spending across the last 12 months and see which categories take the biggest
        share, so you can spot patterns before they become habits.
      </p>

      {loading || !data ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-ink">Spending by month</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyChartData}>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-rule bg-surface p-5 shadow-sm">
            <p className="mb-4 text-sm font-medium text-ink">
              By category — {formatMonthLabel(data.selectedMonth)}
            </p>
            {data.byCategory.length === 0 ? (
              <p className="text-sm text-ink-soft">No expenses this month.</p>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-[220px] w-full sm:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byCategory}
                        dataKey="total"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {data.byCategory.map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCents(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 sm:w-1/2">
                  {data.byCategory.map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-ink">{c.name}</span>
                      </div>
                      <span className="font-medium text-ink">{formatCents(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
