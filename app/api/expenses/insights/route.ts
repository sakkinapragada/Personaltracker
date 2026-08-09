import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { currentMonthKey, shiftMonth, formatMonthLabel } from "@/lib/month";
import { generateExpenseInsights } from "@/lib/gemini";
import { decryptNullableNumber, decryptNumber } from "@/lib/crypto";

type MonthSummary = {
  month: string;
  label: string;
  total: number;
  byCategory: { name: string; color: string; total: number }[];
};

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentKey = currentMonthKey();
  const previousKey = shiftMonth(currentKey, -1);
  const [cy, cm] = currentKey.split("-").map(Number);

  const rangeStart = new Date(cy, cm - 1 - 1, 1);
  const rangeEnd = new Date(cy, cm, 1);

  const [user, expenses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { monthlyBudget: true } }),
    prisma.expense.findMany({
      where: { userId, date: { gte: rangeStart, lt: rangeEnd } },
      include: { category: true },
    }),
  ]);

  function buildSummary(key: string): MonthSummary {
    const categoryMap = new Map<string, { name: string; color: string; total: number }>();
    let total = 0;
    for (const e of expenses) {
      if (monthKeyOf(e.date) !== key) continue;
      const amount = decryptNumber(e.amount);
      total += amount;
      const existing = categoryMap.get(e.categoryId);
      if (existing) {
        existing.total += amount;
      } else {
        categoryMap.set(e.categoryId, { name: e.category.name, color: e.category.color, total: amount });
      }
    }
    return {
      month: key,
      label: formatMonthLabel(key),
      total,
      byCategory: Array.from(categoryMap.values()).sort((a, b) => b.total - a.total),
    };
  }

  const current = buildSummary(currentKey);
  const previous = buildSummary(previousKey);

  const now = new Date();
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const monthlyBudget = decryptNullableNumber(user?.monthlyBudget ?? null);

  let insight = null;
  if (current.total > 0 || previous.total > 0) {
    insight = await generateExpenseInsights(
      { label: current.label, total: current.total / 100, byCategory: current.byCategory.map((c) => ({ name: c.name, total: c.total / 100 })) },
      { label: previous.label, total: previous.total / 100, byCategory: previous.byCategory.map((c) => ({ name: c.name, total: c.total / 100 })) },
      daysElapsed,
      daysInMonth,
      monthlyBudget !== null ? monthlyBudget / 100 : null,
    );
  }

  return NextResponse.json({ current, previous, daysElapsed, daysInMonth, monthlyBudget, insight });
}
