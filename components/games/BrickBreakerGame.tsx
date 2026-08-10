"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BALL_RADIUS,
  BASE_BALL_SPEED,
  BRICK_FADE_MS,
  DEFAULT_LIVES,
  LEVEL_COMPLETE_BANNER_MS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  POWERUP_FALL_SPEED,
  SLOW_BALL_DURATION_MS,
  SLOW_BALL_MULT,
  WIDE_PADDLE_DURATION_MS,
  WIDE_PADDLE_MULT,
  allBricksCleared,
  ballHitsPaddle,
  ballOnPaddle,
  ballSpeedMultiplier,
  brickColor,
  brickHitPoints,
  clampPaddleX,
  createBricks,
  createPaddle,
  findBrickHit,
  launchBall,
  levelClearBonus,
  movingBrickX,
  paddleWidthRatio,
  reflectOffBrick,
  reflectOffPaddle,
  reflectOffWalls,
  rescaleBallSpeed,
  resizePaddleKeepCenter,
  rollPowerUpDrop,
  type Ball,
  type Brick,
  type Paddle,
  type PowerUp,
  type PowerUpType,
} from "@/lib/brickBreaker/engine";

type Screen = "ready" | "playing" | "paused" | "gameover";
type FinalStats = { score: number; level: number };

const HIGH_SCORE_KEY = "brickbreaker:high-score";
const PADDLE_KEY_SPEED = 260;
const ASPECT = LOGICAL_HEIGHT / LOGICAL_WIDTH;
const ACCENT = "#2dd4e8";

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function useGameAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  function ensure(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }

  function beep(freq: number, durationMs: number, type: OscillatorType, volume: number) {
    if (!enabledRef.current) return;
    const ctx = ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000);
  }

  return {
    isEnabled: () => enabledRef.current,
    setEnabled: (value: boolean) => {
      enabledRef.current = value;
    },
    ensure,
    brickHit: () => beep(520, 70, "square", 0.05),
    paddleBounce: () => beep(300, 60, "sine", 0.06),
    powerUp: () => beep(680, 140, "triangle", 0.07),
    lifeLost: () => beep(160, 220, "sawtooth", 0.08),
    levelComplete: () => beep(880, 180, "triangle", 0.08),
    gameOver: () => beep(120, 400, "sawtooth", 0.08),
  };
}

export function BrickBreakerGame() {
  const [screen, setScreen] = useState<Screen>("ready");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(DEFAULT_LIVES);
  const [levelBanner, setLevelBanner] = useState<number | null>(null);
  const [finalStats, setFinalStats] = useState<FinalStats | null>(null);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  const audio = useGameAudio();

  const initialPaddle = createPaddle(1, false);
  const bricksRef = useRef<Brick[]>(createBricks(1));
  const paddleRef = useRef<Paddle>(initialPaddle);
  const ballRef = useRef<Ball>(ballOnPaddle(initialPaddle));
  const powerUpsRef = useRef<PowerUp[]>([]);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const levelRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(DEFAULT_LIVES);
  const speedRef = useRef(BASE_BALL_SPEED);
  const ballLaunchedRef = useRef(false);
  const wideUntilRef = useRef<number | null>(null);
  const slowUntilRef = useRef<number | null>(null);
  const wasSlowRef = useRef(false);
  const transitionRef = useRef<{ until: number } | null>(null);

  const keysRef = useRef({ left: false, right: false });
  const pointerActiveRef = useRef(false);
  const pointerTargetXRef = useRef(LOGICAL_WIDTH / 2);

  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const belowRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(HIGH_SCORE_KEY);
      if (s) setHighScore(Number(s));
    } catch {
      // localStorage unavailable — high score just won't display
    }
  }, []);

  function persistHighScore(finalScore: number) {
    try {
      const prev = Number(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
      if (finalScore > prev) {
        localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        setHighScore(finalScore);
      }
    } catch {
      // ignore storage errors
    }
  }

  function effectiveSpeed(now: number): number {
    const slow = slowUntilRef.current !== null && now < slowUntilRef.current;
    return speedRef.current * (slow ? SLOW_BALL_MULT : 1);
  }

  function drawFrame(now: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;
    const scale = cssWidth / LOGICAL_WIDTH;

    ctx.fillStyle = "#0b0c10";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    for (const brick of bricksRef.current) {
      if (brick.hp <= 0 && brick.destroyedAt === null) continue;
      let alpha = 1;
      if (brick.destroyedAt !== null) {
        alpha = Math.max(0, 1 - (now - brick.destroyedAt) / BRICK_FADE_MS);
        if (alpha <= 0) continue;
      }
      const bx = movingBrickX(brick, now) * scale;
      const by = brick.y * scale;
      const bw = brick.width * scale;
      const bh = brick.height * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = brickColor(brick.row);
      ctx.shadowColor = brickColor(brick.row);
      ctx.shadowBlur = 5;
      roundRectPath(ctx, bx, by, bw, bh, 3);
      ctx.fill();
      if (brick.type === "tough" && brick.hp === 1) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.2, by + bh * 0.2);
        ctx.lineTo(bx + bw * 0.8, by + bh * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }

    const paddle = paddleRef.current;
    const wideActive = wideUntilRef.current !== null && now < wideUntilRef.current;
    ctx.save();
    ctx.fillStyle = wideActive ? "#7ee787" : ACCENT;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    roundRectPath(ctx, paddle.x * scale, paddle.y * scale, paddle.width * scale, paddle.height * scale, 5);
    ctx.fill();
    ctx.restore();

    const trail = trailRef.current;
    for (let i = 0; i < trail.length; i++) {
      const alpha = ((i + 1) / trail.length) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.arc(trail[i].x * scale, trail[i].y * scale, BALL_RADIUS * scale * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    const ball = ballRef.current;
    ctx.save();
    ctx.fillStyle = "#f5f7fa";
    ctx.shadowColor = "#7fe3ef";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ball.x * scale, ball.y * scale, ball.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const p of powerUpsRef.current) {
      const color = p.type === "wide" ? "#7ee787" : p.type === "slow" ? "#b48cf2" : "#ff5d8f";
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x * scale, p.y * scale, p.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#0b0c10";
      ctx.font = `${Math.round(p.radius * scale)}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.type === "wide" ? "W" : p.type === "slow" ? "S" : "+", p.x * scale, p.y * scale + 1);
    }

    if (!ballLaunchedRef.current && !transitionRef.current) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap or press Space to launch", cssWidth / 2, (paddle.y - 24) * scale);
    }
  }

  function computeBoardWidth(): number {
    const container = boardContainerRef.current;
    if (!container) return 220;
    const parentWidth = container.parentElement?.clientWidth ?? 260;
    const topOffset = container.getBoundingClientRect().top;
    const belowHeight = belowRef.current?.getBoundingClientRect().height ?? 0;
    const bottomSafety = 32;
    const availableHeight = Math.max(240, window.innerHeight - topOffset - belowHeight - bottomSafety);
    const widthFromHeight = Math.floor(availableHeight / ASPECT);
    return Math.max(200, Math.min(380, widthFromHeight, parentWidth));
  }

  function resizeCanvas(now: number) {
    const container = boardContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const width = computeBoardWidth();
    const height = Math.round(width * ASPECT);
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(now);
  }

  useLayoutEffect(() => {
    resizeCanvas(performance.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    function handleResize() {
      resizeCanvas(performance.now());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function launchNow(now: number) {
    if (ballLaunchedRef.current) return;
    ballLaunchedRef.current = true;
    ballRef.current = launchBall(ballRef.current, paddleRef.current, effectiveSpeed(now));
  }

  function applyPowerUp(type: PowerUpType, now: number) {
    if (type === "wide") {
      wideUntilRef.current = now + WIDE_PADDLE_DURATION_MS;
      paddleRef.current = resizePaddleKeepCenter(
        paddleRef.current,
        LOGICAL_WIDTH * paddleWidthRatio(levelRef.current) * WIDE_PADDLE_MULT,
      );
    } else if (type === "slow") {
      slowUntilRef.current = now + SLOW_BALL_DURATION_MS;
    } else {
      livesRef.current += 1;
      setLives(livesRef.current);
    }
  }

  function startLevelTransition(now: number) {
    transitionRef.current = { until: now + LEVEL_COMPLETE_BANNER_MS };
    scoreRef.current += levelClearBonus(levelRef.current);
    setScore(scoreRef.current);
    setLevelBanner(levelRef.current);
    audio.levelComplete();
  }

  function handleBrickHit(brick: Brick, now: number) {
    const bricks = bricksRef.current;
    const idx = bricks.findIndex((b) => b.row === brick.row && b.col === brick.col);
    if (idx === -1) return;
    const newHp = bricks[idx].hp - 1;
    const updated = { ...bricks[idx], hp: newHp, destroyedAt: newHp <= 0 ? now : null };
    const nextBricks = [...bricks.slice(0, idx), updated, ...bricks.slice(idx + 1)];
    bricksRef.current = nextBricks;

    scoreRef.current += brickHitPoints(brick.type, levelRef.current);
    setScore(scoreRef.current);

    if (newHp <= 0) {
      const dropType = rollPowerUpDrop();
      if (dropType) {
        powerUpsRef.current = [
          ...powerUpsRef.current,
          { x: brick.x + brick.width / 2, y: brick.y + brick.height / 2, vy: POWERUP_FALL_SPEED, type: dropType, radius: 8 },
        ];
      }
      if (allBricksCleared(nextBricks)) startLevelTransition(now);
    }
  }

  function triggerGameOver() {
    audio.gameOver();
    const stats: FinalStats = { score: scoreRef.current, level: levelRef.current };
    setFinalStats(stats);
    persistHighScore(stats.score);
    setScreen("gameover");
  }

  function loseLife() {
    livesRef.current -= 1;
    setLives(livesRef.current);
    audio.lifeLost();
    if (livesRef.current <= 0) {
      triggerGameOver();
    } else {
      ballLaunchedRef.current = false;
      trailRef.current = [];
      ballRef.current = ballOnPaddle(paddleRef.current);
    }
  }

  function stepGame(dt: number, now: number) {
    if (transitionRef.current) {
      if (now >= transitionRef.current.until) {
        transitionRef.current = null;
        levelRef.current += 1;
        setLevel(levelRef.current);
        setLevelBanner(null);
        bricksRef.current = createBricks(levelRef.current);
        const wide = wideUntilRef.current !== null && now < wideUntilRef.current;
        paddleRef.current = createPaddle(levelRef.current, wide);
        speedRef.current = BASE_BALL_SPEED * ballSpeedMultiplier(levelRef.current);
        ballLaunchedRef.current = false;
        ballRef.current = ballOnPaddle(paddleRef.current);
        powerUpsRef.current = [];
        trailRef.current = [];
      }
      return;
    }

    if (wideUntilRef.current !== null && now >= wideUntilRef.current) {
      wideUntilRef.current = null;
      paddleRef.current = resizePaddleKeepCenter(paddleRef.current, LOGICAL_WIDTH * paddleWidthRatio(levelRef.current));
    }

    const slowActive = slowUntilRef.current !== null && now < slowUntilRef.current;
    if (slowUntilRef.current !== null && !slowActive) slowUntilRef.current = null;
    if (slowActive !== wasSlowRef.current) {
      wasSlowRef.current = slowActive;
      if (ballLaunchedRef.current) ballRef.current = rescaleBallSpeed(ballRef.current, effectiveSpeed(now));
    }

    if (keysRef.current.left) {
      paddleRef.current = {
        ...paddleRef.current,
        x: clampPaddleX(paddleRef.current.x - PADDLE_KEY_SPEED * dt, paddleRef.current.width),
      };
    }
    if (keysRef.current.right) {
      paddleRef.current = {
        ...paddleRef.current,
        x: clampPaddleX(paddleRef.current.x + PADDLE_KEY_SPEED * dt, paddleRef.current.width),
      };
    }
    if (pointerActiveRef.current) {
      paddleRef.current = {
        ...paddleRef.current,
        x: clampPaddleX(pointerTargetXRef.current - paddleRef.current.width / 2, paddleRef.current.width),
      };
    }

    if (!ballLaunchedRef.current) {
      ballRef.current = ballOnPaddle(paddleRef.current);
    } else {
      let ball = ballRef.current;
      ball = { ...ball, x: ball.x + ball.vx * dt, y: ball.y + ball.vy * dt };
      ball = reflectOffWalls(ball);

      if (ballHitsPaddle(ball, paddleRef.current)) {
        ball = reflectOffPaddle(ball, paddleRef.current, effectiveSpeed(now));
        audio.paddleBounce();
      }

      const hit = findBrickHit(ball, bricksRef.current, now);
      if (hit) {
        ball = reflectOffBrick(ball, hit.axis);
        handleBrickHit(hit.brick, now);
        audio.brickHit();
      }

      ballRef.current = ball;
      trailRef.current = [...trailRef.current.slice(-4), { x: ball.x, y: ball.y }];

      if (ball.y - ball.radius > LOGICAL_HEIGHT) {
        loseLife();
      }
    }

    powerUpsRef.current = powerUpsRef.current
      .map((p) => ({ ...p, y: p.y + p.vy * dt }))
      .filter((p) => p.y < LOGICAL_HEIGHT + 20);

    const paddle = paddleRef.current;
    const caughtIndex = powerUpsRef.current.findIndex(
      (p) =>
        p.y + p.radius >= paddle.y &&
        p.y - p.radius <= paddle.y + paddle.height &&
        p.x + p.radius >= paddle.x &&
        p.x - p.radius <= paddle.x + paddle.width,
    );
    if (caughtIndex !== -1) {
      applyPowerUp(powerUpsRef.current[caughtIndex].type, now);
      powerUpsRef.current = powerUpsRef.current.filter((_, i) => i !== caughtIndex);
      audio.powerUp();
    }

    bricksRef.current = bricksRef.current.filter(
      (b) => b.hp > 0 || (b.destroyedAt !== null && now - b.destroyedAt < BRICK_FADE_MS),
    );
  }

  useEffect(() => {
    if (screen !== "playing") return;
    let rafId = 0;
    let lastTime = performance.now();
    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      stepGame(dt, now);
      drawFrame(now);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen !== "playing") return;
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          keysRef.current.left = true;
          break;
        case "ArrowRight":
          e.preventDefault();
          keysRef.current.right = true;
          break;
        case " ":
          e.preventDefault();
          launchNow(performance.now());
          break;
        case "p":
        case "P":
        case "Escape":
          setScreen("paused");
          break;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keysRef.current.left = false;
      keysRef.current.right = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function resetGame() {
    levelRef.current = 1;
    scoreRef.current = 0;
    livesRef.current = DEFAULT_LIVES;
    bricksRef.current = createBricks(1);
    paddleRef.current = createPaddle(1, false);
    ballRef.current = ballOnPaddle(paddleRef.current);
    ballLaunchedRef.current = false;
    speedRef.current = BASE_BALL_SPEED;
    wideUntilRef.current = null;
    slowUntilRef.current = null;
    wasSlowRef.current = false;
    transitionRef.current = null;
    powerUpsRef.current = [];
    trailRef.current = [];
    keysRef.current = { left: false, right: false };
    pointerActiveRef.current = false;

    setScore(0);
    setLevel(1);
    setLives(DEFAULT_LIVES);
    setLevelBanner(null);
    setFinalStats(null);
  }

  function startOrRestart() {
    audio.ensure();
    resetGame();
    setScreen("playing");
  }

  function toggleSound() {
    const next = !audio.isEnabled();
    audio.setEnabled(next);
    setSoundOn(next);
  }

  const showControls = screen === "playing" || screen === "paused";

  return (
    <div>
      <div className="mb-2 flex flex-nowrap items-center justify-between gap-2 rounded-xl border border-rule bg-surface px-3 py-2 shadow-sm">
        <div className="flex flex-shrink-0 items-center gap-3 text-xs">
          <Stat label="Level" value={String(level)} />
          <Stat label="Score" value={score.toLocaleString()} />
          <span className="flex items-center gap-0.5 text-rose" aria-label={`${lives} lives remaining`}>
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <HeartGlyph key={i} />
            ))}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <IconButton onClick={toggleSound} label={soundOn ? "Mute" : "Unmute"}>
            {soundOn ? <SoundOnGlyph /> : <SoundOffGlyph />}
          </IconButton>
          {showControls && (
            <>
              <IconButton
                onClick={() => setScreen(screen === "playing" ? "paused" : "playing")}
                label={screen === "playing" ? "Pause" : "Resume"}
              >
                {screen === "playing" ? <PauseGlyph /> : <PlayGlyph />}
              </IconButton>
              <IconButton onClick={startOrRestart} label="Restart">
                <RestartGlyph />
              </IconButton>
            </>
          )}
        </div>
      </div>

      <div
        ref={boardContainerRef}
        className="relative mx-auto overflow-hidden rounded-lg border border-rule"
        style={{ width: 220, height: Math.round(220 * ASPECT), touchAction: "none" }}
        onPointerDown={(e) => {
          if (screen !== "playing") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pointerActiveRef.current = true;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) pointerTargetXRef.current = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
          if (!ballLaunchedRef.current) launchNow(performance.now());
        }}
        onPointerMove={(e) => {
          if (!pointerActiveRef.current) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) pointerTargetXRef.current = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
        }}
        onPointerUp={() => {
          pointerActiveRef.current = false;
        }}
        onPointerCancel={() => {
          pointerActiveRef.current = false;
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {levelBanner !== null && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="animate-banner-pop rounded-2xl px-5 py-2.5 font-display text-lg font-extrabold text-black shadow-lg"
              style={{ backgroundColor: ACCENT }}
            >
              Level {levelBanner} Cleared!
            </span>
          </div>
        )}

        {screen === "ready" && <ReadyOverlay onStart={startOrRestart} highScore={highScore} />}
        {screen === "paused" && (
          <PausedOverlay onResume={() => setScreen("playing")} onRestart={startOrRestart} />
        )}
        {screen === "gameover" && finalStats && (
          <GameOverOverlay stats={finalStats} highScore={highScore} onRestart={startOrRestart} />
        )}
      </div>

      <div ref={belowRef}>
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Drag anywhere to move the paddle. Tap or press Space to launch.
        </p>
      </div>
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

function HeartGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
      <path d="M12 21s-7.5-4.6-10-9.2C.5 8.4 2 5 5.3 5c2 0 3.4 1.1 4.2 2.4C10.3 6.1 11.7 5 13.7 5 17 5 18.5 8.4 17 11.8 14.5 16.4 12 21 12 21Z" />
    </svg>
  );
}

function SoundOnGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function SoundOffGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M16 9l5 6M21 9l-5 6" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
      <path d="M7 5v14l12-7z" />
    </svg>
  );
}

function RestartGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M4 4v5h5" />
      <path d="M4.5 9a8 8 0 1 1 1.5 6" />
    </svg>
  );
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-rule text-ink-soft transition hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}

function ReadyOverlay({ onStart, highScore }: { onStart: () => void; highScore: number | null }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
      <p className="font-display text-lg font-extrabold text-white">Brick Breaker</p>
      {highScore !== null && <p className="text-xs text-white/60">High score: {highScore.toLocaleString()}</p>}
      <button
        onClick={onStart}
        className="w-40 rounded-full px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        style={{ backgroundColor: ACCENT }}
      >
        Start
      </button>
      <p className="max-w-[220px] text-xs text-white/50">Drag to move the paddle. Tap to launch the ball.</p>
    </div>
  );
}

function PausedOverlay({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center">
      <p className="font-display text-lg font-extrabold text-white">Paused</p>
      <button
        onClick={onResume}
        className="w-40 rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        style={{ backgroundColor: ACCENT }}
      >
        Resume
      </button>
      <button
        onClick={onRestart}
        className="w-40 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        Restart
      </button>
    </div>
  );
}

function GameOverOverlay({
  stats,
  highScore,
  onRestart,
}: {
  stats: FinalStats;
  highScore: number | null;
  onRestart: () => void;
}) {
  const isNewHigh = highScore !== null && stats.score >= highScore;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 p-6 text-center">
      <p className="font-display text-lg font-extrabold text-white">Game Over</p>
      <p className="text-sm text-white/80">
        Score {stats.score.toLocaleString()} · Level {stats.level}
      </p>
      {isNewHigh ? (
        <p className="text-xs font-semibold" style={{ color: ACCENT }}>
          New high score!
        </p>
      ) : highScore !== null ? (
        <p className="text-xs text-white/60">High score: {highScore.toLocaleString()}</p>
      ) : null}
      <button
        onClick={onRestart}
        className="mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        style={{ backgroundColor: ACCENT }}
      >
        Restart
      </button>
    </div>
  );
}
