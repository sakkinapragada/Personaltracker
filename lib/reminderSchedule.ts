import type { Recurrence } from "@/lib/types";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "NONE", label: "Does not repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: "Once",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export type CalendarDate = { year: number; month: number; day: number };

/** Singapore is UTC+8 with no DST, so a fixed offset is always correct. */
export function singaporeToday(): CalendarDate {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return {
    year: sgt.getUTCFullYear(),
    month: sgt.getUTCMonth() + 1,
    day: sgt.getUTCDate(),
  };
}

export function isDueOn(reminderDate: Date, recurrence: Recurrence, target: CalendarDate): boolean {
  const rY = reminderDate.getUTCFullYear();
  const rM = reminderDate.getUTCMonth() + 1;
  const rD = reminderDate.getUTCDate();

  const startsAfterTarget =
    rY > target.year ||
    (rY === target.year && rM > target.month) ||
    (rY === target.year && rM === target.month && rD > target.day);
  if (startsAfterTarget) return false;

  switch (recurrence) {
    case "NONE":
      return rY === target.year && rM === target.month && rD === target.day;
    case "DAILY":
      return true;
    case "WEEKLY": {
      const reminderWeekday = new Date(Date.UTC(rY, rM - 1, rD)).getUTCDay();
      const targetWeekday = new Date(Date.UTC(target.year, target.month - 1, target.day)).getUTCDay();
      return reminderWeekday === targetWeekday;
    }
    case "MONTHLY":
      return rD === target.day;
    case "YEARLY":
      return rM === target.month && rD === target.day;
    default:
      return false;
  }
}
