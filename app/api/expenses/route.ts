import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { decryptNumber, encryptNumber } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month");
  const where: Prisma.ExpenseWhereInput = { userId };

  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses.map((e) => ({ ...e, amount: decryptNumber(e.amount) })));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { amount, categoryId, description, date } = body;

  if (typeof amount !== "number" || !categoryId || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  const expense = await prisma.expense.create({
    data: {
      userId,
      categoryId,
      amount: encryptNumber(Math.round(amount)),
      description: description || null,
      date: new Date(date),
    },
    include: { category: true },
  });

  return NextResponse.json({ ...expense, amount: Math.round(amount) }, { status: 201 });
}
