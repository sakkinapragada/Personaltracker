import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getEarningsCalendar } from "@/lib/finnhub";
import { findNextEarnings } from "@/lib/stockEarnings";
import type { EarningsInfo } from "@/lib/types";

function dateInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stocks = await prisma.stock.findMany({ where: { userId } });
  if (stocks.length === 0) return NextResponse.json([]);

  const today = new Date();
  const todayIso = dateInputValue(today);
  const to = dateInputValue(new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000));

  const results: EarningsInfo[] = await Promise.all(
    stocks.map(async (s) => {
      let next = null;
      try {
        const events = await getEarningsCalendar(s.symbol, todayIso, to);
        next = findNextEarnings(events, todayIso);
      } catch {
        next = null;
      }

      let reminderAdded = false;
      if (next) {
        const title = `${s.symbol} Q${next.quarter} ${next.year} Earnings`;
        const existing = await prisma.reminder.findFirst({
          where: { userId, title, date: new Date(next.date) },
        });
        reminderAdded = !!existing;
      }

      return {
        symbol: s.symbol,
        name: s.name,
        date: next?.date ?? null,
        hour: next?.hour ?? null,
        quarter: next?.quarter ?? null,
        year: next?.year ?? null,
        epsEstimate: next?.epsEstimate ?? null,
        revenueEstimate: next?.revenueEstimate ?? null,
        reminderAdded,
      };
    }),
  );

  return NextResponse.json(results);
}
