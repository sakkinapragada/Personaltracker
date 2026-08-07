import { getResend } from "@/lib/resend";
import type { CalendarDate } from "@/lib/reminderSchedule";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: CalendarDate): string {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function sendReminderDigest(
  to: string,
  reminders: { title: string; notes: string | null }[],
  date: CalendarDate,
) {
  const dateLabel = formatDate(date);

  const items = reminders
    .map((r) => {
      const title = escapeHtml(r.title);
      const notes = r.notes ? ` — ${escapeHtml(r.notes)}` : "";
      return `<li style="margin-bottom:8px;"><strong>${title}</strong>${notes}</li>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif;color:#111827;">
      <h2 style="margin-bottom:16px;">Reminders for ${dateLabel}</h2>
      <ul style="padding-left:20px;">${items}</ul>
    </div>
  `;

  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to,
    subject: `Reminders for ${dateLabel}`,
    html,
  });

  if (error) {
    throw new Error(`Resend failed to send digest: ${error.message}`);
  }
}
