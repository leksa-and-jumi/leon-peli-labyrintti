import { describe, expect, it } from 'vitest';
import type { TileGrid } from './maze';
import { distanceField, fieldAt, nextTile } from './path';

/** A U-shaped corridor: to get from top-left to top-right you must go down and around. */
const u: TileGrid = {
  width: 5,
  height: 5,
  walls: [
    ...[1, 1, 1, 1, 1],
    ...[1, 0, 1, 0, 1],
    ...[1, 0, 1, 0, 1],
    ...[1, 0, 0, 0, 1],
    ...[1, 1, 1, 1, 1],
  ].map((n) => n === 1),
};

describe('distanceField', () => {
  const field = distanceField(u, { tx: 3, ty: 1 });

  it('is zero at the target', () => {
    expect(fieldAt(u, field, { tx: 3, ty: 1 })).toBe(0);
  });

  it('measures the way around the wall, not straight through it', () => {
    // Down 2, across 2 (one of them diagonal at each corner is blocked), up 2
    expect(fieldAt(u, field, { tx: 1, ty: 1 })).toBeCloseTo(6);
  });

  it('walls are unreachable', () => {
    expect(fieldAt(u, field, { tx: 2, ty: 1 })).toBe(Infinity);
    expect(fieldAt(u, field, { tx: -1, ty: 0 })).toBe(Infinity);
  });

  it('costs more next to walls with a penalty', () => {
    const careful = distanceField(u, { tx: 3, ty: 1 }, 1);
    expect(fieldAt(u, careful, { tx: 1, ty: 1 })).toBeGreaterThan(6);
  });
});

describe('nextTile', () => {
  const field = distanceField(u, { tx: 3, ty: 1 });

  it('goes down first, around the wall', () => {
    expect(nextTile(u, field, { tx: 1, ty: 1 })).toEqual({ tx: 1, ty: 2 });
  });

  it('stops at the target', () => {
    expect(nextTile(u, field, { tx: 3, ty: 1 })).toBeNull();
  });

  it('never cuts a wall corner diagonally', () => {
    // From (1, 2) the diagonal to (2, 3) would scrape the wall at (2, 2)
    expect(nextTile(u, field, { tx: 1, ty: 2 })).toEqual({ tx: 1, ty: 3 });
  });
});
