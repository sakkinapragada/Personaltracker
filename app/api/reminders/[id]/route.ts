import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { RECURRENCE_OPTIONS } from "@/lib/reminderSchedule";

const VALID_RECURRENCES = new Set(RECURRENCE_OPTIONS.map((o) => o.value));

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, notes, date, recurrence, categoryId, isActive } = body;

  if (recurrence !== undefined && !VALID_RECURRENCES.has(recurrence)) {
    return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
  }

  if (categoryId) {
    const category = await prisma.reminderCategory.findFirst({ where: { id: categoryId, userId } });
    if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const reminder = await prisma.reminder.update({
    where: { id },
    data: {
      ...(typeof title === "string" && title.trim() && { title: title.trim() }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(date && { date: new Date(date) }),
      ...(recurrence !== undefined && { recurrence }),
      ...(categoryId && { categoryId }),
      ...(typeof isActive === "boolean" && { isActive }),
    },
    include: { category: true },
  });

  return NextResponse.json(reminder);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
