import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();
  const [y, m] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const rangeStart = new Date(y, m - 1 - 11, 1);
  const rangeEnd = new Date(y, m, 1);

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: rangeStart, lt: rangeEnd } },
    include: { category: true },
  });

  const monthlyMap = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    monthlyMap.set(monthKey(new Date(y, m - 1 - (11 - i), 1)), 0);
  }

  const selectedKey = `${y}-${String(m).padStart(2, "0")}`;
  const categoryMap = new Map<string, { name: string; color: string; total: number }>();

  for (const e of expenses) {
    const key = monthKey(e.date);
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + e.amount);
    }
    if (key === selectedKey) {
      const existing = categoryMap.get(e.categoryId);
      if (existing) {
        existing.total += e.amount;
      } else {
        categoryMap.set(e.categoryId, {
          name: e.category.name,
          color: e.category.color,
          total: e.amount,
        });
      }
    }
  }

  const monthly = Array.from(monthlyMap.entries()).map(([month, total]) => ({ month, total }));
  const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json({ monthly, byCategory, selectedMonth: selectedKey });
}
