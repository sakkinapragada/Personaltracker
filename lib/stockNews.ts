export const MOVER_THRESHOLD_PERCENT = 3;

/**
 * Simplified relevance heuristic: since free-tier stock APIs don't offer
 * per-article sentiment/relevance scoring, an article is flagged as a
 * likely mover when it was published today AND today's price move exceeds
 * the threshold. Older articles are shown but not flagged.
 */
export function isLikelyMover(articleDatetime: number, todayChangePercent: number | null): boolean {
  if (todayChangePercent === null) return false;
  const articleDate = new Date(articleDatetime * 1000);
  const now = new Date();
  const isToday =
    articleDate.getUTCFullYear() === now.getUTCFullYear() &&
    articleDate.getUTCMonth() === now.getUTCMonth() &&
    articleDate.getUTCDate() === now.getUTCDate();

  return isToday && Math.abs(todayChangePercent) >= MOVER_THRESHOLD_PERCENT;
}
