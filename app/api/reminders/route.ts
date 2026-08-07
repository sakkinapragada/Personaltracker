import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { RECURRENCE_OPTIONS } from "@/lib/reminderSchedule";

const VALID_RECURRENCES = new Set(RECURRENCE_OPTIONS.map((o) => o.value));

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reminders = await prisma.reminder.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(reminders);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, notes, date, recurrence, categoryId } = await req.json();
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (recurrence !== undefined && !VALID_RECURRENCES.has(recurrence)) {
    return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
  }

  const category = await prisma.reminderCategory.findFirst({ where: { id: categoryId, userId } });
  if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      categoryId,
      title: title.trim(),
      notes: notes?.trim() || null,
      date: new Date(date),
      recurrence: recurrence ?? "DAILY",
    },
    include: { category: true },
  });

  return NextResponse.json(reminder, { status: 201 });
}
