export const CATEGORY_COLOR_PALETTE = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#22c55e", // green
  "#eab308", // yellow
  "#6b7280", // gray
  "#ef4444", // red
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
  "#f43f5e", // rose
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#d946ef", // fuchsia
];

export function pickUniqueColor(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()));
  const available = CATEGORY_COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
  if (available) return available;
  return CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)];
}
