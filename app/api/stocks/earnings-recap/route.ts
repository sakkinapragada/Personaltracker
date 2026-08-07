import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getEarningsCalendar } from "@/lib/finnhub";
import { findLastEarnings, earningsPeriodKey } from "@/lib/stockEarnings";
import { summarize } from "@/lib/gemini";
import type { EarningsRecap } from "@/lib/types";

function dateInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function fmtMoney(n: number | null): string {
  if (n === null) return "n/a";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

async function buildRecapSummary(symbol: string, name: string | null, event: {
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  quarter: number;
  year: number;
}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return "AI summary unavailable (no GEMINI_API_KEY configured).";
  }

  const prompt = `You are summarizing the most recent earnings report for ${symbol}${name ? ` (${name})` : ""}, Q${event.quarter} ${event.year}.

EPS actual: ${event.epsActual ?? "n/a"}, EPS estimate: ${event.epsEstimate ?? "n/a"}
Revenue actual: ${fmtMoney(event.revenueActual)}, Revenue estimate: ${fmtMoney(event.revenueEstimate)}

Write a concise 2-3 sentence recap in plain prose with no markdown: did the company beat or miss on EPS and revenue, by roughly how much, and any brief takeaway. Keep it factual and neutral.`;

  try {
    const text = await summarize(prompt);
    return text || "Could not generate a summary right now.";
  } catch {
    return "Could not generate a summary right now.";
  }
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stocks = await prisma.stock.findMany({ where: { userId } });
  if (stocks.length === 0) return NextResponse.json([]);

  const today = new Date();
  const todayIso = dateInputValue(today);
  const from = dateInputValue(new Date(today.getTime() - 400 * 24 * 60 * 60 * 1000));

  const results = await Promise.all(
    stocks.map(async (s): Promise<EarningsRecap | null> => {
      let last;
      try {
        const events = await getEarningsCalendar(s.symbol, from, todayIso);
        last = findLastEarnings(events, todayIso);
      } catch {
        last = null;
      }
      if (!last) return null;

      const periodKey = earningsPeriodKey(last);
      const isFresh = s.earningsSummary && s.earningsPeriod === periodKey;

      const summary = isFresh
        ? s.earningsSummary!
        : await buildRecapSummary(s.symbol, s.name, last);

      if (!isFresh) {
        await prisma.stock.update({
          where: { id: s.id },
          data: { earningsSummary: summary, earningsPeriod: periodKey },
        });
      }

      return {
        symbol: s.symbol,
        name: s.name,
        date: last.date,
        quarter: last.quarter,
        year: last.year,
        epsActual: last.epsActual,
        epsEstimate: last.epsEstimate,
        revenueActual: last.revenueActual,
        revenueEstimate: last.revenueEstimate,
        summary,
      };
    }),
  );

  return NextResponse.json(results.filter((r): r is EarningsRecap => r !== null));
}
