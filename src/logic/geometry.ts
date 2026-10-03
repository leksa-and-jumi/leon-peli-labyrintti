/** A point (or a direction). Up on the screen is negative y. */
export interface Point {
  x: number;
  y: number;
}

/** A straight line between two points, like an arm or a leg. */
export interface Segment {
  from: Point;
  to: Point;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** The angle (radians) to look from `from` to `to`. 0 = right, π/2 = down. */
export function angleTo(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Turns a point around (0, 0) by `angle` radians. */
export function rotate(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** A step of `length` in the direction `angle`. */
export function fromAngle(angle: number, length = 1): Point {
  return { x: Math.cos(angle) * length, y: Math.sin(angle) * length };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** An angle squeezed between -π and π. */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** Glide from angle `a` toward `b` the short way round. */
export function lerpAngle(a: number, b: number, t: number): number {
  return a + normalizeAngle(b - a) * t;
}

/** Turn from `current` toward `target` the short way, at most `maxStep` radians. */
export function turnToward(current: number, target: number, maxStep: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

/** Does the line from `a` to `b` pass within `radius` of `center`? (A bullet hitting a body.) */
export function segmentHitsCircle(a: Point, b: Point, center: Point, radius: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : clamp(((center.x - a.x) * dx + (center.y - a.y) * dy) / lengthSq, 0, 1);
  return Math.hypot(a.x + dx * t - center.x, a.y + dy * t - center.y) <= radius;
}

/** How much softer motion moves this frame: bigger `speed` = snappier. */
export function smoothingStep(deltaMs: number, speed: number): number {
  return 1 - Math.exp((-speed * deltaMs) / 1000);
}
