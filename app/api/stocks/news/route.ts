import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getCompanyNews, getQuote } from "@/lib/finnhub";
import { summarize } from "@/lib/gemini";
import { MOVER_THRESHOLD_PERCENT } from "@/lib/stockNews";
import type { StockNewsGroup } from "@/lib/types";

const SUMMARY_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ARTICLES_FOR_PROMPT = 10;

function dateInputValue(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

async function buildSummary(
  symbol: string,
  name: string | null,
  changePercent: number | null,
  articles: { headline: string; summary: string }[],
): Promise<string> {
  if (articles.length === 0) return "No recent news.";
  if (!process.env.GEMINI_API_KEY) {
    return `${articles.length} recent article(s) — AI summary unavailable (no GEMINI_API_KEY configured).`;
  }

  const top = articles.slice(0, MAX_ARTICLES_FOR_PROMPT);
  const list = top.map((a, i) => `${i + 1}. ${a.headline} — ${a.summary}`).join("\n");
  const moveNote =
    changePercent !== null
      ? `Today ${symbol} moved ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(2)}%.`
      : "";

  const prompt = `You are summarizing recent news for the stock ${symbol}${name ? ` (${name})` : ""}. ${moveNote}

Here are the most recent headlines and summaries:
${list}

Write 3-4 bullet points, one per line, each starting with "- " and no other markdown. Each bullet should be specific and detailed — name the concrete events, numbers, or developments from the headlines rather than vague generalities. If today's price move is notable (${MOVER_THRESHOLD_PERCENT}% or more in either direction) and any of the news plausibly explains it, dedicate a bullet to saying so explicitly. Otherwise just cover the most significant distinct pieces of news.`;

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

  const to = dateInputValue(new Date());
  const from = dateInputValue(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));

  const groups: StockNewsGroup[] = await Promise.all(
    stocks.map(async (s) => {
      const [quote, articles] = await Promise.all([
        getQuote(s.symbol).catch(() => null),
        getCompanyNews(s.symbol, from, to).catch(() => []),
      ]);
      const changePercent = quote?.dp ?? null;

      const isFresh =
        s.newsSummary && s.newsSummaryAt && Date.now() - s.newsSummaryAt.getTime() < SUMMARY_TTL_MS;

      const summary = isFresh
        ? s.newsSummary!
        : await buildSummary(s.symbol, s.name, changePercent, articles);

      if (!isFresh) {
        await prisma.stock.update({
          where: { id: s.id },
          data: { newsSummary: summary, newsSummaryAt: new Date() },
        });
      }

      return {
        symbol: s.symbol,
        name: s.name,
        changePercent,
        summary,
        articles: articles.slice(0, MAX_ARTICLES_FOR_PROMPT).map((a) => ({
          id: a.id,
          headline: a.headline,
          source: a.source,
          url: a.url,
          datetime: a.datetime,
        })),
      };
    }),
  );

  groups.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return NextResponse.json(groups);
}
