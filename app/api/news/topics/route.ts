import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { NEWS_CATEGORIES } from "@/lib/newsCategories";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const topics = await prisma.newsTopic.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, value: true, label: true },
  });
  return NextResponse.json(topics);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const kind = body.kind === "category" || body.kind === "keyword" ? body.kind : null;
  const rawValue = typeof body.value === "string" ? body.value.trim() : "";

  if (!kind || !rawValue) {
    return NextResponse.json({ error: "Choose a category or enter a keyword" }, { status: 400 });
  }
  if (kind === "category" && !(NEWS_CATEGORIES as readonly string[]).includes(rawValue)) {
    return NextResponse.json({ error: "Not a recognized category" }, { status: 400 });
  }

  const value = kind === "category" ? rawValue : rawValue.toLowerCase();
  const label = kind === "category" ? rawValue.charAt(0).toUpperCase() + rawValue.slice(1) : rawValue;

  try {
    const topic = await prisma.newsTopic.create({
      data: { userId, kind, value, label },
      select: { id: true, kind: true, value: true, label: true },
    });
    return NextResponse.json(topic, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "You're already tracking that topic" }, { status: 409 });
    }
    throw e;
  }
}
