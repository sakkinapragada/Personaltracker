"use client";

import { useEffect, useRef, useState } from "react";
import {
  ROWS,
  COLS,
  CHALLENGE_LEVEL,
  GARBAGE_INTERVAL_MS,
  ROTATION_LOCK_DURATION_MS,
  SPRINT_TARGET_LINES,
  addGarbageRow,
  clearLines,
  computeFallDelay,
  computeLevel,
  computeLineScore,
  createEmptyBoard,
  createShuffledBag,
  getPieceCells,
  isValidPosition,
  lockPiece,
  randomRotationLockDelay,
  spawnPiece,
  tryMove,
  tryRotate,
  type ActivePiece,
  type Board,
} from "@/lib/blockStack/engine";
import { PIECE_COLORS, SHAPE_CELLS, type PieceType } from "@/lib/blockStack/shapes";

type Mode = "marathon" | "sprint";
type Screen = "select" | "playing" | "paused" | "gameover" | "sprintComplete";
type FinalStats = { score: number; level: number; lines: number; timeMs: number };
type ClearingState = { rows: number[]; until: number; nextBoard: Board };

const BEST_SCORE_KEY = "blockstack:best-score";
const BEST_SPRINT_KEY = "blockstack:best-sprint-ms";
const SOFT_DROP_MS = 40;

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}

function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  const edge = Math.max(2, size * 0.15);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(x + 1, y + 1, size - 2, edge);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 1, y + size - edge - 1, size - 2, edge);
}

export function BlockStackGame() {
  const [screen, setScreen] = useState<Screen>("select");
  const [mode, setMode] = useState<Mode | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesTotal, setLinesTotal] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [nextType, setNextType] = useState<PieceType | null>(null);
  const [rotationLocked, setRotationLocked] = useState(false);
  const [levelUpBanner, setLevelUpBanner] = useState<number | null>(null);
  const [garbageToast, setGarbageToast] = useState(false);
  const [finalStats, setFinalStats] = useState<FinalStats | null>(null);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [bestSprintMs, setBestSprintMs] = useState<number | null>(null);

  const modeRef = useRef<Mode | null>(null);
  const boardRef = useRef<Board>(createEmptyBoard());
  const pieceRef = useRef<ActivePiece | null>(null);
  const queueRef = useRef<PieceType[]>([]);
  const dropAccumRef = useRef(0);
  const fallDelayRef = useRef(computeFallDelay(1));
  const softDropRef = useRef(false);
  const clearingRef = useRef<ClearingState | null>(null);
  const challengeActiveRef = useRef(false);
  const nextGarbageAtRef = useRef(0);
  const nextLockAtRef = useRef(0);
  const rotationLockedRef = useRef(false);
  const elapsedMsRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const linesTotalRef = useRef(0);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(BEST_SCORE_KEY);
      if (s) setBestScore(Number(s));
      const t = localStorage.getItem(BEST_SPRINT_KEY);
      if (t) setBestSprintMs(Number(t));
    } catch {
      // localStorage unavailable — best scores just won't display
    }
  }, []);

  function persistBest(finishedMode: Mode, stats: FinalStats) {
    try {
      if (finishedMode === "marathon") {
        const prev = Number(localStorage.getItem(BEST_SCORE_KEY) ?? "0");
        if (stats.score > prev) {
          localStorage.setItem(BEST_SCORE_KEY, String(stats.score));
          setBestScore(stats.score);
        }
      } else {
        const prevRaw = localStorage.getItem(BEST_SPRINT_KEY);
        const prev = prevRaw ? Number(prevRaw) : null;
        if (prev === null || stats.timeMs < prev) {
          localStorage.setItem(BEST_SPRINT_KEY, String(stats.timeMs));
          setBestSprintMs(stats.timeMs);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  function clearAllTimeouts() {
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const cell = width / COLS;

    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cell, 0);
      ctx.lineTo(c * cell, height);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cell);
      ctx.lineTo(width, r * cell);
      ctx.stroke();
    }

    const flashRows = clearingRef.current?.rows ?? [];
    const board = boardRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = board[r][c];
        if (!color) continue;
        drawBlock(ctx, c * cell, r * cell, cell, flashRows.includes(r) ? "#ffffff" : color);
      }
    }

    if (pieceRef.current && !clearingRef.current) {
      const color = PIECE_COLORS[pieceRef.current.type];
      for (const { row, col } of getPieceCells(pieceRef.current)) {
        if (row >= 0) drawBlock(ctx, col * cell, row * cell, cell, color);
      }
    }
  }

  function computeBoardWidth(): number {
    const viewportHeight = window.innerHeight;
    // Reserve space for the HUD row, touch controls, and hint text when a
    // game is active; just a little chrome while the mode-select overlay shows.
    const reservedChrome = modeRef.current ? 340 : 40;
    const availableHeight = Math.max(260, viewportHeight - reservedChrome);
    const widthFromHeight = Math.floor(availableHeight / 2);
    const parentWidth = boardContainerRef.current?.parentElement?.clientWidth ?? 260;
    return Math.max(150, Math.min(220, widthFromHeight, parentWidth));
  }

  function resizeCanvas() {
    const container = boardContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const width = computeBoardWidth();
    const height = width * 2;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame();
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    resizeCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, mode]);

  useEffect(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 56;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, size, size);
    if (!nextType) return;
    const cell = size / 4;
    const color = PIECE_COLORS[nextType];
    for (const { row, col } of SHAPE_CELLS[nextType][0]) {
      drawBlock(ctx, col * cell, row * cell, cell, color);
    }
  }, [nextType]);

  function spawnNext() {
    if (queueRef.current.length < 8) queueRef.current.push(...createShuffledBag());
    const type = queueRef.current.shift();
    if (!type) return;
    const piece = spawnPiece(type);
    if (!isValidPosition(boardRef.current, piece)) {
      endGame();
      return;
    }
    pieceRef.current = piece;
    setNextType(queueRef.current[0] ?? null);
  }

  function lockCurrentPiece(now: number) {
    const piece = pieceRef.current;
    if (!piece) return;
    const lockedBoard = lockPiece(boardRef.current, piece);
    const { board: clearedBoard, linesCleared, clearedRows } = clearLines(lockedBoard);
    pieceRef.current = null;

    if (linesCleared > 0) {
      const points = computeLineScore(linesCleared, levelRef.current);
      scoreRef.current += points;
      linesTotalRef.current += linesCleared;
      const newLevel = computeLevel(linesTotalRef.current);
      const leveledUp = newLevel > levelRef.current;
      levelRef.current = newLevel;
      fallDelayRef.current = computeFallDelay(newLevel);

      setScore(scoreRef.current);
      setLevel(newLevel);
      setLinesTotal(linesTotalRef.current);

      if (leveledUp) {
        setLevelUpBanner(newLevel);
        timeoutIdsRef.current.push(setTimeout(() => setLevelUpBanner(null), 1600));
        if (newLevel >= CHALLENGE_LEVEL && !challengeActiveRef.current) {
          challengeActiveRef.current = true;
          nextGarbageAtRef.current = now + GARBAGE_INTERVAL_MS;
          nextLockAtRef.current = now + randomRotationLockDelay();
        }
      }

      boardRef.current = lockedBoard;
      clearingRef.current = { rows: clearedRows, until: now + 220, nextBoard: clearedBoard };
    } else {
      boardRef.current = clearedBoard;
      spawnNext();
    }
  }

  function moveHorizontal(dir: -1 | 1) {
    if (!pieceRef.current || clearingRef.current) return;
    const moved = tryMove(boardRef.current, pieceRef.current, dir, 0);
    if (moved) pieceRef.current = moved;
  }

  function rotate(dir: 1 | -1) {
    if (!pieceRef.current || clearingRef.current || rotationLockedRef.current) return;
    const rotated = tryRotate(boardRef.current, pieceRef.current, dir);
    if (rotated) pieceRef.current = rotated;
  }

  function hardDrop(now: number) {
    if (!pieceRef.current || clearingRef.current) return;
    let piece = pieceRef.current;
    let moved = tryMove(boardRef.current, piece, 0, 1);
    while (moved) {
      piece = moved;
      moved = tryMove(boardRef.current, piece, 0, 1);
    }
    pieceRef.current = piece;
    lockCurrentPiece(now);
  }

  function triggerGarbage() {
    if (clearingRef.current) return;
    const { board, overflow } = addGarbageRow(boardRef.current);
    boardRef.current = board;
    if (overflow) {
      endGame();
      return;
    }
    if (pieceRef.current && !isValidPosition(board, pieceRef.current)) {
      endGame();
      return;
    }
    setGarbageToast(true);
    timeoutIdsRef.current.push(setTimeout(() => setGarbageToast(false), 1200));
  }

  function triggerRotationLock() {
    rotationLockedRef.current = true;
    setRotationLocked(true);
    timeoutIdsRef.current.push(
      setTimeout(() => {
        rotationLockedRef.current = false;
        setRotationLocked(false);
      }, ROTATION_LOCK_DURATION_MS),
    );
  }

  function endGame() {
    pieceRef.current = null;
    const stats: FinalStats = {
      score: scoreRef.current,
      level: levelRef.current,
      lines: linesTotalRef.current,
      timeMs: elapsedMsRef.current,
    };
    setFinalStats(stats);
    if (modeRef.current) persistBest(modeRef.current, stats);
    setScreen("gameover");
  }

  function finishSprint() {
    pieceRef.current = null;
    const stats: FinalStats = {
      score: scoreRef.current,
      level: levelRef.current,
      lines: linesTotalRef.current,
      timeMs: elapsedMsRef.current,
    };
    setFinalStats(stats);
    persistBest("sprint", stats);
    setScreen("sprintComplete");
  }

  function stepGame(dt: number, now: number) {
    const clamped = Math.min(dt, 250);

    if (clearingRef.current) {
      if (now >= clearingRef.current.until) {
        const pending = clearingRef.current;
        boardRef.current = pending.nextBoard;
        clearingRef.current = null;
        if (modeRef.current === "sprint" && linesTotalRef.current >= SPRINT_TARGET_LINES) {
          finishSprint();
        } else {
          spawnNext();
        }
      }
      return;
    }

    if (!pieceRef.current) return;

    if (modeRef.current === "sprint") {
      const before = Math.floor(elapsedMsRef.current / 100);
      elapsedMsRef.current += clamped;
      if (Math.floor(elapsedMsRef.current / 100) !== before) setElapsedMs(elapsedMsRef.current);
    }

    const effectiveDelay = softDropRef.current ? SOFT_DROP_MS : fallDelayRef.current;
    dropAccumRef.current += clamped;
    let iterations = 0;
    while (dropAccumRef.current >= effectiveDelay && iterations < 6 && pieceRef.current && !clearingRef.current) {
      dropAccumRef.current -= effectiveDelay;
      iterations++;
      const moved = tryMove(boardRef.current, pieceRef.current, 0, 1);
      if (moved) {
        pieceRef.current = moved;
      } else {
        lockCurrentPiece(now);
      }
    }
  }

  useEffect(() => {
    if (screen !== "playing") return;
    let rafId = 0;
    let lastTime = performance.now();
    function tick(now: number) {
      const dt = now - lastTime;
      lastTime = now;
      stepGame(dt, now);
      drawFrame();
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    const id = setInterval(() => {
      if (!challengeActiveRef.current) return;
      const now = performance.now();
      if (now >= nextGarbageAtRef.current) {
        nextGarbageAtRef.current = now + GARBAGE_INTERVAL_MS;
        triggerGarbage();
      }
      if (now >= nextLockAtRef.current) {
        nextLockAtRef.current = now + randomRotationLockDelay();
        triggerRotationLock();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          moveHorizontal(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          rotate(1);
          break;
        case "z":
        case "Z":
          rotate(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          softDropRef.current = true;
          break;
        case " ":
          e.preventDefault();
          hardDrop(performance.now());
          break;
        case "p":
        case "P":
        case "Escape":
          setScreen("paused");
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowDown") softDropRef.current = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      softDropRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => clearAllTimeouts, []);

  function resetGameRefs() {
    boardRef.current = createEmptyBoard();
    queueRef.current = [...createShuffledBag(), ...createShuffledBag()];
    dropAccumRef.current = 0;
    elapsedMsRef.current = 0;
    scoreRef.current = 0;
    levelRef.current = 1;
    linesTotalRef.current = 0;
    fallDelayRef.current = computeFallDelay(1);
    softDropRef.current = false;
    clearingRef.current = null;
    challengeActiveRef.current = false;
    rotationLockedRef.current = false;
    pieceRef.current = null;
    clearAllTimeouts();

    setScore(0);
    setLevel(1);
    setLinesTotal(0);
    setElapsedMs(0);
    setRotationLocked(false);
    setLevelUpBanner(null);
    setGarbageToast(false);
    setFinalStats(null);

    spawnNext();
  }

  function startGame(newMode: Mode) {
    modeRef.current = newMode;
    setMode(newMode);
    resetGameRefs();
    setScreen("playing");
  }

  function goToSelect() {
    modeRef.current = null;
    setMode(null);
    setScreen("select");
  }

  const showOverlay = screen !== "playing";
  const showControls = screen === "playing" || screen === "paused";

  return (
    <div>
      {mode && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rule bg-surface p-3 shadow-sm">
          <div className="flex gap-4 text-xs">
            <Stat label="Score" value={score.toLocaleString()} />
            <Stat label="Level" value={String(level)} />
            <Stat label="Lines" value={String(linesTotal)} />
            {mode === "sprint" && <Stat label="Time" value={formatTime(elapsedMs)} />}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Next</p>
              <canvas ref={nextCanvasRef} className="rounded-md" style={{ width: 56, height: 56 }} />
            </div>
            {showControls && (
              <>
                <button
                  onClick={() => setScreen(screen === "playing" ? "paused" : "playing")}
                  className="rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                >
                  {screen === "playing" ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={() => startGame(mode)}
                  className="rounded-full border border-rule px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                >
                  Restart
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div
        ref={boardContainerRef}
        className="relative mx-auto overflow-hidden rounded-lg border border-rule"
        style={{ width: 200, height: 400, touchAction: "none" }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStartRef.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start || screen !== "playing") return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          if (absX > absY && absX > 24) {
            moveHorizontal(dx > 0 ? 1 : -1);
          } else if (dy > 24 && absY > absX) {
            hardDrop(performance.now());
          }
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {rotationLocked && (
          <span className="absolute right-2 top-2 rounded-full bg-rose/90 px-2.5 py-1 text-[10px] font-bold text-white shadow">
            Rotation Locked
          </span>
        )}

        {garbageToast && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
            <span className="animate-banner-pop rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">
              Garbage incoming!
            </span>
          </div>
        )}

        {levelUpBanner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="animate-banner-pop rounded-2xl bg-accent px-5 py-2.5 font-display text-lg font-extrabold text-white shadow-lg">
              Level {levelUpBanner}!
            </span>
          </div>
        )}

        {showOverlay && screen === "select" && (
          <ModeSelectOverlay onStart={startGame} bestScore={bestScore} bestSprintMs={bestSprintMs} />
        )}
        {showOverlay && screen === "paused" && (
          <PausedOverlay
            onResume={() => setScreen("playing")}
            onRestart={() => startGame(mode ?? "marathon")}
            onChangeMode={goToSelect}
          />
        )}
        {showOverlay && screen === "gameover" && finalStats && (
          <GameOverOverlay
            stats={finalStats}
            best={mode === "marathon" ? bestScore : null}
            onRestart={() => startGame(mode ?? "marathon")}
            onChangeMode={goToSelect}
          />
        )}
        {showOverlay && screen === "sprintComplete" && finalStats && (
          <SprintCompleteOverlay
            stats={finalStats}
            best={bestSprintMs}
            onRestart={() => startGame("sprint")}
            onChangeMode={goToSelect}
          />
        )}
      </div>

      {showControls && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <TouchButton label="←" mode="repeat" onPress={() => moveHorizontal(-1)} repeatRef={repeatIntervalRef} />
          <TouchButton label="⟲" mode="single" onPress={() => rotate(1)} repeatRef={repeatIntervalRef} />
          <TouchButton label="→" mode="repeat" onPress={() => moveHorizontal(1)} repeatRef={repeatIntervalRef} />
          <TouchButton label="⬇" mode="hold" softDropRef={softDropRef} repeatRef={repeatIntervalRef} />
        </div>
      )}

      <p className="mt-2 text-center text-[11px] text-ink-faint">
        Arrows to move, ⟲ to rotate, ⬇ to soft-drop. Swipe to move/drop.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function TouchButton({
  label,
  mode,
  onPress,
  softDropRef,
  repeatRef,
}: {
  label: string;
  mode: "single" | "repeat" | "hold";
  onPress?: () => void;
  softDropRef?: React.MutableRefObject<boolean>;
  repeatRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
}) {
  useEffect(() => {
    return () => {
      if (repeatRef.current) {
        clearInterval(repeatRef.current);
        repeatRef.current = null;
      }
    };
  }, [repeatRef]);

  function start() {
    if (mode === "hold" && softDropRef) {
      softDropRef.current = true;
      return;
    }
    onPress?.();
    if (mode === "repeat") {
      repeatRef.current = setInterval(() => onPress?.(), 110);
    }
  }
  function stop() {
    if (mode === "hold" && softDropRef) {
      softDropRef.current = false;
      return;
    }
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      aria-label={label}
      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow active:scale-95"
    >
      {label}
    </button>
  );
}

function ModeSelectOverlay({
  onStart,
  bestScore,
  bestSprintMs,
}: {
  onStart: (mode: Mode) => void;
  bestScore: number | null;
  bestSprintMs: number | null;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
      <p className="font-display text-lg font-extrabold text-white">Block Stack</p>
      <button
        onClick={() => onStart("marathon")}
        className="w-48 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        Marathon
      </button>
      <p className="text-xs text-white/60">
        {bestScore !== null ? `Best score: ${bestScore.toLocaleString()}` : "Endless — speed ramps up forever"}
      </p>
      <button
        onClick={() => onStart("sprint")}
        className="w-48 rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
      >
        Sprint (40 lines)
      </button>
      <p className="text-xs text-white/60">
        {bestSprintMs !== null ? `Best time: ${formatTime(bestSprintMs)}` : "Clear 40 lines as fast as you can"}
      </p>
    </div>
  );
}

function PausedOverlay({
  onResume,
  onRestart,
  onChangeMode,
}: {
  onResume: () => void;
  onRestart: () => void;
  onChangeMode: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center">
      <p className="font-display text-lg font-extrabold text-white">Paused</p>
      <button
        onClick={onResume}
        className="w-40 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        Resume
      </button>
      <button
        onClick={onRestart}
        className="w-40 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Restart
      </button>
      <button
        onClick={onChangeMode}
        className="w-40 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Change Mode
      </button>
    </div>
  );
}

function GameOverOverlay({
  stats,
  best,
  onRestart,
  onChangeMode,
}: {
  stats: FinalStats;
  best: number | null;
  onRestart: () => void;
  onChangeMode: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center">
      <p className="font-display text-lg font-extrabold text-white">Game Over</p>
      <p className="text-sm text-white/80">
        Score {stats.score.toLocaleString()} · Level {stats.level} · {stats.lines} lines
      </p>
      {best !== null && <p className="text-xs text-white/60">Best score: {best.toLocaleString()}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onRestart}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          Play Again
        </button>
        <button
          onClick={onChangeMode}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Change Mode
        </button>
      </div>
    </div>
  );
}

function SprintCompleteOverlay({
  stats,
  best,
  onRestart,
  onChangeMode,
}: {
  stats: FinalStats;
  best: number | null;
  onRestart: () => void;
  onChangeMode: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center">
      <p className="font-display text-lg font-extrabold text-white">Sprint Complete!</p>
      <p className="text-2xl font-extrabold text-white">{formatTime(stats.timeMs)}</p>
      <p className="text-sm text-white/80">Score {stats.score.toLocaleString()} · Level {stats.level}</p>
      {best !== null && <p className="text-xs text-white/60">Best time: {formatTime(best)}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onRestart}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          Run Again
        </button>
        <button
          onClick={onChangeMode}
          className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Change Mode
        </button>
      </div>
    </div>
  );
}
