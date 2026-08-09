import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getQuote, mapQuote } from "@/lib/finnhub";
import { decryptNullableNumber, encryptNullableNumber } from "@/lib/crypto";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.stock.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { shares, avgCost } = await req.json();

  const stock = await prisma.stock.update({
    where: { id },
    data: {
      ...(shares !== undefined && {
        shares: encryptNullableNumber(typeof shares === "number" ? shares : null),
      }),
      ...(avgCost !== undefined && {
        avgCost: encryptNullableNumber(typeof avgCost === "number" ? avgCost : null),
      }),
    },
  });

  let quote = null;
  try {
    quote = mapQuote(await getQuote(stock.symbol));
  } catch {
    // ignore — quote is best-effort here
  }

  return NextResponse.json({
    ...stock,
    shares: decryptNullableNumber(stock.shares),
    avgCost: decryptNullableNumber(stock.avgCost),
    quote,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.stock.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.stock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
