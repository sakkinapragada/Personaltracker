import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { NEWS_COUNTRIES } from "@/lib/newsCountries";
import { decryptNullableNumber, encryptNullableNumber } from "@/lib/crypto";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      preferredName: true,
      monthlyBudget: true,
      newsCountry: true,
      theme: true,
      onboardedAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...user, monthlyBudget: decryptNullableNumber(user.monthlyBudget) });
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { preferredName, monthlyBudget, newsCountry, theme } = body;

  if (preferredName !== undefined && typeof preferredName !== "string") {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (monthlyBudget !== undefined && monthlyBudget !== null && typeof monthlyBudget !== "number") {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }
  if (
    newsCountry !== undefined &&
    newsCountry !== null &&
    !NEWS_COUNTRIES.some((c) => c.code === newsCountry)
  ) {
    return NextResponse.json({ error: "Not a recognized country" }, { status: 400 });
  }
  if (theme !== undefined && theme !== null && theme !== "light" && theme !== "dark") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(preferredName !== undefined && { preferredName: preferredName.trim() || null }),
      ...(monthlyBudget !== undefined && { monthlyBudget: encryptNullableNumber(monthlyBudget) }),
      ...(newsCountry !== undefined && { newsCountry }),
      ...(theme !== undefined && { theme }),
      onboardedAt: new Date(),
    },
    select: {
      name: true,
      email: true,
      preferredName: true,
      monthlyBudget: true,
      newsCountry: true,
      theme: true,
      onboardedAt: true,
    },
  });

  return NextResponse.json({ ...user, monthlyBudget: decryptNullableNumber(user.monthlyBudget) });
}
