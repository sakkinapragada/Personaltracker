export const NEWS_CATEGORIES = [
  "business",
  "technology",
  "science",
  "sports",
  "world",
  "health",
  "entertainment",
  "politics",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
