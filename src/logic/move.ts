import type { Point } from './geometry';

/**
 * Which way the keys push the player. Diagonals are as fast as straight moves,
 * and opposite keys cancel out. (0, 0) = standing still.
 */
export function moveVector(left: boolean, right: boolean, up: boolean, down: boolean): Point {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
