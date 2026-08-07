import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderDigest } from "@/lib/reminderEmail";
import { isDueOn, singaporeToday } from "@/lib/reminderSchedule";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    return NextResponse.json({ error: "OWNER_EMAIL not configured" }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) {
    return NextResponse.json({ sent: false, reason: "No user found" });
  }

  const allActive = await prisma.reminder.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const today = singaporeToday();
  const dueToday = allActive.filter((r) => isDueOn(r.date, r.recurrence, today));

  if (dueToday.length === 0) {
    return NextResponse.json({ sent: false, reason: "No reminders due today", today });
  }

  try {
    await sendReminderDigest(
      ownerEmail,
      dueToday.map((r) => ({ title: r.title, notes: r.notes })),
      today,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ sent: false, error: message }, { status: 502 });
  }

  return NextResponse.json({ sent: true, count: dueToday.length });
}
