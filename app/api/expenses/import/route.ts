import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-auth";
import { extractTransactionsFromDocument } from "@/lib/gemini";

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type — upload a PDF or an image of your statement" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)" }, { status: 400 });
  }

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Data = buffer.toString("base64");

  const extracted = await extractTransactionsFromDocument(
    base64Data,
    file.type,
    categories.map((c) => c.name),
  );

  const byLowerName = new Map(categories.map((c) => [c.name.toLowerCase(), c] as const));
  const fallbackCategoryId = categories[0]?.id ?? null;

  const transactions = extracted.map((t) => {
    const match = byLowerName.get(t.category.toLowerCase());
    return {
      date: t.date,
      description: t.description,
      amount: t.amount,
      transactionType: t.transactionType,
      categoryId: match?.id ?? fallbackCategoryId,
    };
  });

  return NextResponse.json({ transactions, categories });
}
