import { describe, expect, it } from 'vitest';
import { canSee, firstWallHit, moveCircle, pointInWall, tileAt, tileCenter } from './collide';
import type { TileGrid } from './maze';

/** A 5×5 room: walls all around, and one wall tile in the middle. */
const room: TileGrid = {
  width: 5,
  height: 5,
  walls: [
    ...[1, 1, 1, 1, 1],
    ...[1, 0, 0, 0, 1],
    ...[1, 0, 1, 0, 1],
    ...[1, 0, 0, 0, 1],
    ...[1, 1, 1, 1, 1],
  ].map((n) => n === 1),
};
const T = 40;

describe('tiles', () => {
  it('finds the tile under a point and its middle', () => {
    expect(tileAt(T, 45, 85)).toEqual({ tx: 1, ty: 2 });
    expect(tileCenter(T, { tx: 1, ty: 2 })).toEqual({ x: 60, y: 100 });
    expect(pointInWall(room, T, 100, 100)).toBe(true);
    expect(pointInWall(room, T, 60, 60)).toBe(false);
  });
});

describe('moveCircle', () => {
  it('moves freely on open floor', () => {
    expect(moveCircle(room, T, { x: 60, y: 60 }, 10, 0, 40)).toEqual({ x: 60, y: 100 });
  });

  it('stops at a wall', () => {
    // Walking left into the outer wall (its edge is at x = 40)
    const p = moveCircle(room, T, { x: 60, y: 60 }, 10, -100, 0);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(60);
  });

  it('slides along a wall when walking at an angle', () => {
    const p = moveCircle(room, T, { x: 60, y: 60 }, 10, -30, 20);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(80);
  });

  it('cannot jump through the middle wall even with a huge step', () => {
    const p = moveCircle(room, T, { x: 100, y: 60 }, 10, 0, 200);
    expect(p.y).toBeLessThanOrEqual(70);
  });
});

describe('seeing', () => {
  it('sees along an open corridor', () => {
    expect(canSee(room, T, { x: 60, y: 60 }, { x: 140, y: 60 })).toBe(true);
  });

  it('does not see through the middle wall', () => {
    expect(canSee(room, T, { x: 60, y: 100 }, { x: 140, y: 100 })).toBe(false);
    const hit = firstWallHit(room, T, { x: 60, y: 100 }, { x: 140, y: 100 });
    expect(hit?.x).toBeGreaterThanOrEqual(80);
    expect(hit?.x).toBeLessThan(90);
  });
});
