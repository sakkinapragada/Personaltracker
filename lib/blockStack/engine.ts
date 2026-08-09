import { GARBAGE_COLOR, PIECE_COLORS, PIECE_TYPES, SHAPE_CELLS, type PieceType } from "./shapes";

export const COLS = 10;
export const ROWS = 20;
export const BASE_FALL_MS = 800;
export const LINES_PER_LEVEL = 10;
export const CHALLENGE_LEVEL = 6; // challenge modes kick in once this level is reached
export const SPRINT_TARGET_LINES = 40;
export const GARBAGE_INTERVAL_MS = 20_000;
export const ROTATION_LOCK_MIN_MS = 15_000;
export const ROTATION_LOCK_MAX_MS = 30_000;
export const ROTATION_LOCK_DURATION_MS = 5_000;

export type Cell = string | null;
export type Board = Cell[][];

export type Rotation = 0 | 1 | 2 | 3;

export type ActivePiece = {
  type: PieceType;
  rotation: Rotation;
  row: number;
  col: number;
};

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

export function spawnPiece(type: PieceType): ActivePiece {
  return { type, rotation: 0, row: 0, col: 3 };
}

export function getPieceCells(piece: ActivePiece): { row: number; col: number }[] {
  return SHAPE_CELLS[piece.type][piece.rotation].map((o) => ({
    row: piece.row + o.row,
    col: piece.col + o.col,
  }));
}

export function isValidPosition(board: Board, piece: ActivePiece): boolean {
  return getPieceCells(piece).every(({ row, col }) => {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return board[row][col] === null;
  });
}

export function tryMove(board: Board, piece: ActivePiece, dCol: number, dRow: number): ActivePiece | null {
  const moved: ActivePiece = { ...piece, col: piece.col + dCol, row: piece.row + dRow };
  return isValidPosition(board, moved) ? moved : null;
}

const ROTATE_KICKS: { row: number; col: number }[] = [
  { row: 0, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 0, col: -2 },
  { row: 0, col: 2 },
  { row: -1, col: 0 },
];

export function tryRotate(board: Board, piece: ActivePiece, dir: 1 | -1): ActivePiece | null {
  const rotation = (((piece.rotation + dir) % 4) + 4) % 4 as Rotation;
  for (const kick of ROTATE_KICKS) {
    const candidate: ActivePiece = {
      ...piece,
      rotation,
      row: piece.row + kick.row,
      col: piece.col + kick.col,
    };
    if (isValidPosition(board, candidate)) return candidate;
  }
  return null;
}

export function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = board.map((row) => [...row]);
  const color = PIECE_COLORS[piece.type];
  for (const { row, col } of getPieceCells(piece)) {
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) next[row][col] = color;
  }
  return next;
}

export function clearLines(board: Board): { board: Board; linesCleared: number; clearedRows: number[] } {
  const clearedRows: number[] = [];
  board.forEach((row, i) => {
    if (row.every((cell) => cell !== null)) clearedRows.push(i);
  });
  if (clearedRows.length === 0) return { board, linesCleared: 0, clearedRows: [] };

  const remaining = board.filter((row) => !row.every((cell) => cell !== null));
  const emptyRows = Array.from({ length: clearedRows.length }, () => Array<Cell>(COLS).fill(null));
  return { board: [...emptyRows, ...remaining], linesCleared: clearedRows.length, clearedRows };
}

export function addGarbageRow(board: Board): { board: Board; overflow: boolean } {
  const overflow = board[0].some((cell) => cell !== null);
  const gapCount = 1 + Math.floor(Math.random() * 2); // 1-2 gaps
  const gaps = new Set<number>();
  while (gaps.size < gapCount) gaps.add(Math.floor(Math.random() * COLS));
  const garbageRow: Cell[] = Array.from({ length: COLS }, (_, col) => (gaps.has(col) ? null : GARBAGE_COLOR));
  return { board: [...board.slice(1), garbageRow], overflow };
}

export function computeLevel(linesTotal: number): number {
  return 1 + Math.floor(linesTotal / LINES_PER_LEVEL);
}

export function computeFallDelay(level: number): number {
  const delay = BASE_FALL_MS * Math.pow(0.9, level - 1);
  return Math.max(80, Math.round(delay));
}

const LINE_SCORES: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };

export function computeLineScore(linesCleared: number, level: number): number {
  const base = LINE_SCORES[linesCleared] ?? 0;
  const multiplier = Math.pow(1.1, level - 1);
  return Math.round(base * multiplier);
}

export function createShuffledBag(): PieceType[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function randomRotationLockDelay(): number {
  return ROTATION_LOCK_MIN_MS + Math.random() * (ROTATION_LOCK_MAX_MS - ROTATION_LOCK_MIN_MS);
}
