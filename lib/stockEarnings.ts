import type { EarningsEvent } from "@/lib/finnhub";

export function findNextEarnings(events: EarningsEvent[], todayIso: string): EarningsEvent | null {
  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

export function findLastEarnings(events: EarningsEvent[], todayIso: string): EarningsEvent | null {
  const past = events
    .filter((e) => e.date < todayIso && e.epsActual !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  return past[0] ?? null;
}

export function earningsPeriodKey(e: EarningsEvent): string {
  return `${e.year}-Q${e.quarter}-${e.date}`;
}
