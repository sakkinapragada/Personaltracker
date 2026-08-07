import { prisma } from "@/lib/prisma";
import { pickUniqueColor } from "@/lib/colorPalette";

const EARNINGS_CATEGORY_NAME = "Earnings";

export async function getOrCreateEarningsCategory(userId: string) {
  const existing = await prisma.reminderCategory.findUnique({
    where: { userId_name: { userId, name: EARNINGS_CATEGORY_NAME } },
  });
  if (existing) return existing;

  const categories = await prisma.reminderCategory.findMany({ where: { userId } });
  const color = pickUniqueColor(categories.map((c) => c.color));

  return prisma.reminderCategory.create({
    data: { userId, name: EARNINGS_CATEGORY_NAME, color, isDefault: false },
  });
}
