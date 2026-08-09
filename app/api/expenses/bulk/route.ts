import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";

type BulkExpense = {
  amount: number;
  categoryId: string;
  description?: string | null;
  date: string;
};

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { expenses } = (await req.json()) as { expenses: BulkExpense[] };
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return NextResponse.json({ error: "No expenses provided" }, { status: 400 });
  }

  const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
  const validCategories = await prisma.category.findMany({
    where: { userId, id: { in: categoryIds } },
    select: { id: true },
  });
  const validIds = new Set(validCategories.map((c) => c.id));

  for (const e of expenses) {
    if (typeof e.amount !== "number" || !e.date || !validIds.has(e.categoryId)) {
      return NextResponse.json({ error: "Invalid expense in batch" }, { status: 400 });
    }
  }

  const created = await prisma.$transaction(
    expenses.map((e) =>
      prisma.expense.create({
        data: {
          userId,
          categoryId: e.categoryId,
          amount: Math.round(e.amount),
          description: e.description || null,
          date: new Date(e.date),
        },
      }),
    ),
  );

  return NextResponse.json({ created: created.length }, { status: 201 });
}
