export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export const PIECE_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#2dd4e8",
  O: "#f5d90a",
  T: "#b06bf0",
  S: "#3ddc73",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f79533",
};

export const GARBAGE_COLOR = "#4b5563";

export type Offset = { row: number; col: number };

// Each piece has 4 rotation states, each drawn on a 4x4 grid ('X' = filled).
const RAW_SHAPES: Record<PieceType, string[][]> = {
  I: [
    ["....", "XXXX", "....", "...."],
    ["..X.", "..X.", "..X.", "..X."],
    ["....", "XXXX", "....", "...."],
    ["..X.", "..X.", "..X.", "..X."],
  ],
  O: [
    [".XX.", ".XX.", "....", "...."],
    [".XX.", ".XX.", "....", "...."],
    [".XX.", ".XX.", "....", "...."],
    [".XX.", ".XX.", "....", "...."],
  ],
  T: [
    [".X..", "XXX.", "....", "...."],
    [".X..", ".XX.", ".X..", "...."],
    ["....", "XXX.", ".X..", "...."],
    [".X..", "XX..", ".X..", "...."],
  ],
  S: [
    [".XX.", "XX..", "....", "...."],
    [".X..", ".XX.", "..X.", "...."],
    [".XX.", "XX..", "....", "...."],
    [".X..", ".XX.", "..X.", "...."],
  ],
  Z: [
    ["XX..", ".XX.", "....", "...."],
    ["..X.", ".XX.", ".X..", "...."],
    ["XX..", ".XX.", "....", "...."],
    ["..X.", ".XX.", ".X..", "...."],
  ],
  J: [
    ["X...", "XXX.", "....", "...."],
    [".XX.", ".X..", ".X..", "...."],
    ["....", "XXX.", "..X.", "...."],
    [".X..", ".X..", "XX..", "...."],
  ],
  L: [
    ["..X.", "XXX.", "....", "...."],
    [".X..", ".X..", ".XX.", "...."],
    ["....", "XXX.", "X...", "...."],
    ["XX..", ".X..", ".X..", "...."],
  ],
};

function cellsFromGrid(grid: string[]): Offset[] {
  const cells: Offset[] = [];
  grid.forEach((rowStr, row) => {
    rowStr.split("").forEach((ch, col) => {
      if (ch === "X") cells.push({ row, col });
    });
  });
  return cells;
}

export const SHAPE_CELLS: Record<PieceType, Offset[][]> = PIECE_TYPES.reduce(
  (acc, type) => {
    acc[type] = RAW_SHAPES[type].map(cellsFromGrid);
    return acc;
  },
  {} as Record<PieceType, Offset[][]>,
);
