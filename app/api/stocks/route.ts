import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getCompanyName, getQuote, mapQuote } from "@/lib/finnhub";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stocks = await prisma.stock.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

  const withQuotes = await Promise.all(
    stocks.map(async (s) => {
      try {
        const quote = await getQuote(s.symbol);
        return { ...s, quote: mapQuote(quote) };
      } catch {
        return { ...s, quote: null };
      }
    }),
  );

  return NextResponse.json(withQuotes);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const symbol = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : "";
  const { shares, avgCost } = body;

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  let quote;
  try {
    quote = await getQuote(symbol);
  } catch {
    return NextResponse.json({ error: "Could not reach the stock data provider" }, { status: 502 });
  }

  if (!quote || !quote.c) {
    return NextResponse.json({ error: `"${symbol}" doesn't look like a valid ticker` }, { status: 400 });
  }

  const name = await getCompanyName(symbol);

  const existing = await prisma.stock.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });

  const stock = existing
    ? await prisma.stock.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          ...(typeof shares === "number" && { shares }),
          ...(typeof avgCost === "number" && { avgCost }),
        },
      })
    : await prisma.stock.create({
        data: {
          userId,
          symbol,
          name,
          shares: typeof shares === "number" ? shares : null,
          avgCost: typeof avgCost === "number" ? avgCost : null,
        },
      });

  return NextResponse.json({ ...stock, quote: mapQuote(quote) }, { status: 201 });
}
