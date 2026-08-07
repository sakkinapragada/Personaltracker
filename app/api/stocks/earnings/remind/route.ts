import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { getOrCreateEarningsCategory } from "@/lib/earningsReminder";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { symbol, date, quarter, year, epsEstimate, revenueEstimate } = await req.json();
  if (!symbol || !date || !quarter || !year) {
    return NextResponse.json({ error: "Missing earnings details" }, { status: 400 });
  }

  const title = `${symbol} Q${quarter} ${year} Earnings`;
  const reminderDate = new Date(date);

  const existing = await prisma.reminder.findFirst({
    where: { userId, title, date: reminderDate },
  });
  if (existing) {
    return NextResponse.json({ reminder: existing, alreadyExists: true });
  }

  const category = await getOrCreateEarningsCategory(userId);

  const notesParts: string[] = [];
  if (typeof epsEstimate === "number") notesParts.push(`EPS est: $${epsEstimate.toFixed(2)}`);
  if (typeof revenueEstimate === "number") {
    notesParts.push(`Revenue est: $${(revenueEstimate / 1_000_000_000).toFixed(1)}B`);
  }

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      categoryId: category.id,
      title,
      notes: notesParts.join(" · ") || null,
      date: reminderDate,
      recurrence: "NONE",
    },
    include: { category: true },
  });

  return NextResponse.json({ reminder, alreadyExists: false }, { status: 201 });
}
