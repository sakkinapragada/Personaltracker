export const CATEGORY_COLOR_PALETTE = [
  "#a9822f", // mustard
  "#4f7c96", // sky
  "#a15b63", // dusty rose
  "#4f7c6b", // teal
  "#6b4e71", // plum
  "#7a8a4f", // olive
  "#8a6b4f", // clay
  "#5c6b8a", // slate blue
  "#8a4f6b", // mauve
  "#4f8a7a", // seafoam
  "#a06b3a", // amber-brown
  "#5f6b4f", // moss
  "#6b5f8a", // periwinkle-grey
  "#8a5f5f", // muted brick
];

export function pickUniqueColor(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()));
  const available = CATEGORY_COLOR_PALETTE.find((c) => !used.has(c.toLowerCase()));
  if (available) return available;
  return CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)];
}
