import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderDigest } from "@/lib/reminderEmail";
import { isDueOn, singaporeToday } from "@/lib/reminderSchedule";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = singaporeToday();
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  const results = await Promise.all(
    users.map(async (user) => {
      const allActive = await prisma.reminder.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      const dueToday = allActive.filter((r) => isDueOn(r.date, r.recurrence, today));

      if (dueToday.length === 0) {
        return { email: user.email, sent: false, reason: "No reminders due today" };
      }

      try {
        await sendReminderDigest(
          user.email,
          dueToday.map((r) => ({ title: r.title, notes: r.notes })),
          today,
        );
        return { email: user.email, sent: true, count: dueToday.length };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { email: user.email, sent: false, error: message };
      }
    }),
  );

  return NextResponse.json({ today, results });
}
