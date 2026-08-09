import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getCompanyName, getQuote, mapQuote } from "@/lib/finnhub";
import { decryptNullableNumber, encryptNullableNumber } from "@/lib/crypto";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stocks = await prisma.stock.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

  const withQuotes = await Promise.all(
    stocks.map(async (s) => {
      const decrypted = {
        ...s,
        shares: decryptNullableNumber(s.shares),
        avgCost: decryptNullableNumber(s.avgCost),
      };
      try {
        const quote = await getQuote(s.symbol);
        return { ...decrypted, quote: mapQuote(quote) };
      } catch {
        return { ...decrypted, quote: null };
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

  let stock;
  let sharesResult: number | null;
  let avgCostResult: number | null;
  if (existing) {
    const existingShares = decryptNullableNumber(existing.shares);
    const existingAvgCost = decryptNullableNumber(existing.avgCost);
    sharesResult = existingShares;
    avgCostResult = existingAvgCost;

    if (typeof shares === "number" && typeof avgCost === "number") {
      if (existingShares && existingAvgCost) {
        // Merge into the existing position: combine share counts and take the
        // cost-weighted average, rather than overwriting the prior holding.
        const combinedShares = existingShares + shares;
        const combinedCostBasis = existingShares * existingAvgCost + shares * avgCost;
        sharesResult = combinedShares;
        avgCostResult = combinedCostBasis / combinedShares;
      } else {
        sharesResult = shares;
        avgCostResult = avgCost;
      }
    }

    stock = await prisma.stock.update({
      where: { id: existing.id },
      data: {
        name: name ?? existing.name,
        shares: encryptNullableNumber(sharesResult),
        avgCost: encryptNullableNumber(avgCostResult),
      },
    });
  } else {
    sharesResult = typeof shares === "number" ? shares : null;
    avgCostResult = typeof avgCost === "number" ? avgCost : null;
    stock = await prisma.stock.create({
      data: {
        userId,
        symbol,
        name,
        shares: encryptNullableNumber(sharesResult),
        avgCost: encryptNullableNumber(avgCostResult),
      },
    });
  }

  return NextResponse.json(
    { ...stock, shares: sharesResult, avgCost: avgCostResult, quote: mapQuote(quote) },
    { status: 201 },
  );
}
