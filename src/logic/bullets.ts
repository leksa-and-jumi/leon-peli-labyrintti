import { fromAngle, segmentHitsCircle, type Point } from './geometry';

/** A flying bullet: where it is, which way it flies (length 1) and how far it has gone. */
export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  traveled: number;
}

/** A new bullet leaving the gun at `from`, flying toward `angle`. */
export function makeBullet(from: Point, angle: number): Bullet {
  const d = fromAngle(angle);
  return { x: from.x, y: from.y, dx: d.x, dy: d.y, traveled: 0 };
}

/** Moves a bullet for `deltaMs` at `speed` pixels per second. */
export function stepBullet(bullet: Bullet, speed: number, deltaMs: number): Bullet {
  if (speed <= 0) {
    throw new RangeError('Bullet speed must be positive');
  }
  const step = (speed * deltaMs) / 1000;
  return {
    ...bullet,
    x: bullet.x + bullet.dx * step,
    y: bullet.y + bullet.dy * step,
    traveled: bullet.traveled + step,
  };
}

/** The angle a bullet flies at. */
export function bulletAngle(bullet: Bullet): number {
  return Math.atan2(bullet.dy, bullet.dx);
}

/** Something round a bullet can hit, like a body. */
export interface Target {
  center: Point;
  radius: number;
}

/** What happened to a bullet this frame. */
export type BulletResult =
  | { kind: 'flying'; bullet: Bullet }
  | { kind: 'wall'; at: Point }
  | { kind: 'hit'; target: number }
  | { kind: 'gone' };

/**
 * Moves a bullet one frame and checks what it hits on the way: a body (by its
 * number in `targets`) or a wall, whichever comes first. Bullets that have
 * flown `range` pixels are gone.
 */
export function flyBullet(
  bullet: Bullet,
  speed: number,
  deltaMs: number,
  range: number,
  wallHit: (from: Point, to: Point) => Point | null,
  targets: readonly Target[],
): BulletResult {
  const next = stepBullet(bullet, speed, deltaMs);
  const wall = wallHit(bullet, next);
  // Only bodies before the wall can be hit
  const end = wall ?? next;
  const target = targets.findIndex((t) => segmentHitsCircle(bullet, end, t.center, t.radius));
  if (target >= 0) return { kind: 'hit', target };
  if (wall) return { kind: 'wall', at: wall };
  if (next.traveled > range) return { kind: 'gone' };
  return { kind: 'flying', bullet: next };
}
