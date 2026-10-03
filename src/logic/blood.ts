/**
 * Something small flying through the air: a drop of blood or an empty shell.
 * `x`/`y` is the spot on the floor under it and `z` how high above the floor it is.
 * Speeds are in pixels per second.
 */
export interface Flyer {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/** Moves a flyer for `deltaMs`: gravity pulls it down, air slows it a little (`drag`). */
export function stepFlyer(f: Flyer, deltaMs: number, gravity: number, drag: number): Flyer {
  const dt = deltaMs / 1000;
  const slow = Math.exp(-drag * dt);
  const vx = f.vx * slow;
  const vy = f.vy * slow;
  const vz = f.vz - gravity * dt;
  return { x: f.x + vx * dt, y: f.y + vy * dt, z: f.z + vz * dt, vx, vy, vz };
}

/**
 * Hitting the floor: bounces back up, losing speed (`bounciness` 0 = no bounce,
 * 1 = perfect). It also skids slower on every bounce. Slow bounces stop.
 */
export function landOnFloor(
  f: Flyer,
  bounciness: number,
  minBounceSpeed: number,
): { flyer: Flyer; resting: boolean } {
  if (f.z > 0 || f.vz > 0) return { flyer: f, resting: false };
  const vz = -f.vz * bounciness;
  if (vz < minBounceSpeed) {
    return { flyer: { ...f, z: 0, vx: 0, vy: 0, vz: 0 }, resting: true };
  }
  return { flyer: { ...f, z: 0, vz, vx: f.vx * 0.6, vy: f.vy * 0.6 }, resting: false };
}

/**
 * Hitting a wall: if the new spot is inside a wall, the flyer stays where it was
 * and bounces back the way it came (sideways speed turned around and slowed).
 */
export function bounceOffWalls(
  before: Flyer,
  after: Flyer,
  blocked: (x: number, y: number) => boolean,
  bounciness: number,
): Flyer {
  let { x, y, vx, vy } = after;
  if (blocked(after.x, before.y)) {
    x = before.x;
    vx = -vx * bounciness;
  }
  if (blocked(x, after.y)) {
    y = before.y;
    vy = -vy * bounciness;
  }
  return { ...after, x, y, vx, vy };
}

/**
 * How a flying drop looks: turned the way it flies, and stretched longer
 * the faster it goes (like real drops in a photo).
 */
export function dropShape(
  vx: number,
  vy: number,
  maxStretch: number,
): { angle: number; stretch: number } {
  const speed = Math.hypot(vx, vy);
  return { angle: Math.atan2(vy, vx), stretch: 1 + Math.min(speed / 400, maxStretch - 1) };
}
