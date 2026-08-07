import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { Prisma } from "@prisma/client";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();
  if (!name || !color) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({
      data: { userId, name, color, isDefault: false },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    throw e;
  }
}
