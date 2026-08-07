import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.reminderCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, color } = await req.json();

  try {
    const category = await prisma.reminderCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.reminderCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reminderCount = await prisma.reminder.count({ where: { categoryId: id } });
  if (reminderCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${reminderCount} reminder(s) use this category` },
      { status: 400 },
    );
  }

  await prisma.reminderCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
