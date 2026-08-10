export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 500;

export const BRICK_COLS = 8;
export const MAX_ROWS = 12;
export const BASE_ROWS = 5;
export const SPECIAL_BRICK_LEVEL = 5;
export const PADDLE_SHRINK_EVERY_LEVELS = 3;

export const BASE_PADDLE_WIDTH_RATIO = 0.22;
export const MIN_PADDLE_WIDTH_RATIO = 0.11;
export const WIDE_PADDLE_MULT = 1.5;

export const BASE_BALL_SPEED = 220; // logical units per second
export const BALL_SPEED_LEVEL_CAP_MULT = 2.5;
export const SLOW_BALL_MULT = 0.6;

export const BALL_RADIUS = 6;
export const PADDLE_HEIGHT = 12;
export const PADDLE_Y_OFFSET = 28;

export const BRICK_TOP_MARGIN = 44;
export const BRICK_GAP = 4;
export const BRICK_SIDE_MARGIN = 8;
export const BRICK_ROW_HEIGHT = 16;

export const DEFAULT_LIVES = 3;

export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_FALL_SPEED = 90; // logical units per second
export const WIDE_PADDLE_DURATION_MS = 10_000;
export const SLOW_BALL_DURATION_MS = 8_000;

export const MOVING_BRICK_AMPLITUDE = 18;
export const MOVING_BRICK_PERIOD_MS = 2600;

export const LEVEL_COMPLETE_BANNER_MS = 1700;
export const BRICK_FADE_MS = 220;

export const ROW_COLORS = ["#ff5d8f", "#ffb454", "#2dd4e8", "#7ee787", "#b48cf2"];

export type BrickType = "normal" | "tough" | "moving";

export type Brick = {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  type: BrickType;
  destroyedAt: number | null;
  moveOriginX?: number;
};

export type Ball = { x: number; y: number; vx: number; vy: number; radius: number };
export type Paddle = { x: number; width: number; height: number; y: number };
export type PowerUpType = "wide" | "slow" | "life";
export type PowerUp = { x: number; y: number; vy: number; type: PowerUpType; radius: number };

export function rowsForLevel(level: number): number {
  return Math.min(MAX_ROWS, BASE_ROWS - 1 + level);
}

export function ballSpeedMultiplier(level: number): number {
  return Math.min(BALL_SPEED_LEVEL_CAP_MULT, Math.pow(1.1, level - 1));
}

export function paddleWidthRatio(level: number): number {
  const shrinkSteps = Math.floor((level - 1) / PADDLE_SHRINK_EVERY_LEVELS);
  return Math.max(MIN_PADDLE_WIDTH_RATIO, BASE_PADDLE_WIDTH_RATIO * Math.pow(0.9, shrinkSteps));
}

export function specialBricksEnabled(level: number): boolean {
  return level >= SPECIAL_BRICK_LEVEL;
}

export function levelScoreMultiplier(level: number): number {
  return Math.min(2.5, Math.pow(1.1, level - 1));
}

const BRICK_POINTS: Record<BrickType, number> = { normal: 10, tough: 15, moving: 15 };

export function brickHitPoints(type: BrickType, level: number): number {
  return Math.round(BRICK_POINTS[type] * levelScoreMultiplier(level));
}

export function levelClearBonus(level: number): number {
  return Math.round(100 * level * levelScoreMultiplier(level));
}

export function createBricks(level: number): Brick[] {
  const rows = rowsForLevel(level);
  const usableWidth = LOGICAL_WIDTH - BRICK_SIDE_MARGIN * 2;
  const brickWidth = (usableWidth - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
  const allowSpecial = specialBricksEnabled(level);
  const bricks: Brick[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const x = BRICK_SIDE_MARGIN + col * (brickWidth + BRICK_GAP);
      const y = BRICK_TOP_MARGIN + row * (BRICK_ROW_HEIGHT + BRICK_GAP);
      let type: BrickType = "normal";
      if (allowSpecial) {
        const roll = Math.random();
        if (roll < 0.15) type = "tough";
        else if (roll < 0.3) type = "moving";
      }
      bricks.push({
        row,
        col,
        x,
        y,
        width: brickWidth,
        height: BRICK_ROW_HEIGHT,
        hp: type === "tough" ? 2 : 1,
        type,
        destroyedAt: null,
        moveOriginX: type === "moving" ? x : undefined,
      });
    }
  }
  return bricks;
}

export function brickColor(row: number): string {
  return ROW_COLORS[row % ROW_COLORS.length];
}

export function movingBrickX(brick: Brick, now: number): number {
  if (brick.type !== "moving" || brick.moveOriginX === undefined) return brick.x;
  const phase = (brick.row * 37 + brick.col * 13) % 1000;
  return brick.moveOriginX + Math.sin(((now + phase) / MOVING_BRICK_PERIOD_MS) * Math.PI * 2) * MOVING_BRICK_AMPLITUDE;
}

export function createPaddle(level: number, wide: boolean): Paddle {
  const ratio = paddleWidthRatio(level) * (wide ? WIDE_PADDLE_MULT : 1);
  const width = LOGICAL_WIDTH * ratio;
  return {
    x: (LOGICAL_WIDTH - width) / 2,
    width,
    height: PADDLE_HEIGHT,
    y: LOGICAL_HEIGHT - PADDLE_Y_OFFSET,
  };
}

export function clampPaddleX(x: number, width: number): number {
  return Math.max(0, Math.min(LOGICAL_WIDTH - width, x));
}

export function resizePaddleKeepCenter(paddle: Paddle, newWidth: number): Paddle {
  const center = paddle.x + paddle.width / 2;
  return { ...paddle, width: newWidth, x: clampPaddleX(center - newWidth / 2, newWidth) };
}

export function ballOnPaddle(paddle: Paddle): Ball {
  return { x: paddle.x + paddle.width / 2, y: paddle.y - BALL_RADIUS - 1, vx: 0, vy: 0, radius: BALL_RADIUS };
}

export function launchBall(ball: Ball, paddle: Paddle, speed: number): Ball {
  const jitter = (Math.random() - 0.5) * 0.6;
  const vx = speed * jitter;
  const vy = -Math.sqrt(Math.max(1, speed * speed - vx * vx));
  return { ...ball, x: paddle.x + paddle.width / 2, y: paddle.y - ball.radius - 1, vx, vy };
}

export function rescaleBallSpeed(ball: Ball, newSpeed: number): Ball {
  const magnitude = Math.hypot(ball.vx, ball.vy);
  if (magnitude < 1e-6) return ball;
  const scale = newSpeed / magnitude;
  return { ...ball, vx: ball.vx * scale, vy: ball.vy * scale };
}

export function reflectOffWalls(ball: Ball): Ball {
  let { x, y, vx, vy } = ball;
  if (x - ball.radius < 0) {
    x = ball.radius;
    vx = Math.abs(vx);
  } else if (x + ball.radius > LOGICAL_WIDTH) {
    x = LOGICAL_WIDTH - ball.radius;
    vx = -Math.abs(vx);
  }
  if (y - ball.radius < 0) {
    y = ball.radius;
    vy = Math.abs(vy);
  }
  return { ...ball, x, y, vx, vy };
}

export function ballHitsPaddle(ball: Ball, paddle: Paddle): boolean {
  return (
    ball.vy > 0 &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x + ball.radius >= paddle.x &&
    ball.x - ball.radius <= paddle.x + paddle.width
  );
}

export function reflectOffPaddle(ball: Ball, paddle: Paddle, speed: number): Ball {
  const half = paddle.width / 2;
  const hitPos = Math.max(-1, Math.min(1, (ball.x - (paddle.x + half)) / half));
  const vx = hitPos * speed * 0.75;
  const vy = -Math.sqrt(Math.max(1, speed * speed - vx * vx));
  return { ...ball, vx, vy, y: paddle.y - ball.radius - 0.5 };
}

export type BrickHitAxis = "x" | "y";

export function findBrickHit(ball: Ball, bricks: Brick[], now: number): { brick: Brick; axis: BrickHitAxis } | null {
  for (const brick of bricks) {
    if (brick.hp <= 0 || brick.destroyedAt !== null) continue;
    const bx = movingBrickX(brick, now);
    const withinX = ball.x + ball.radius > bx && ball.x - ball.radius < bx + brick.width;
    const withinY = ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height;
    if (!withinX || !withinY) continue;
    const rectCx = bx + brick.width / 2;
    const rectCy = brick.y + brick.height / 2;
    const overlapX = ball.radius + brick.width / 2 - Math.abs(ball.x - rectCx);
    const overlapY = ball.radius + brick.height / 2 - Math.abs(ball.y - rectCy);
    return { brick, axis: overlapX < overlapY ? "x" : "y" };
  }
  return null;
}

export function reflectOffBrick(ball: Ball, axis: BrickHitAxis): Ball {
  return axis === "x" ? { ...ball, vx: -ball.vx } : { ...ball, vy: -ball.vy };
}

export function allBricksCleared(bricks: Brick[]): boolean {
  return bricks.every((b) => b.hp <= 0);
}

export function rollPowerUpDrop(): PowerUpType | null {
  if (Math.random() >= POWERUP_DROP_CHANCE) return null;
  const r = Math.random();
  if (r < 0.1) return "life";
  if (r < 0.55) return "wide";
  return "slow";
}
