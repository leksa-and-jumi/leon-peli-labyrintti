import { describe, expect, it } from 'vitest';
import { Labyrinth } from './labyrinth';
import type { TileGrid } from './maze';

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

describe('Labyrinth', () => {
  const lab = new Labyrinth(u, 40, 0);
  lab.setTarget({ x: 140, y: 60 });

  it('knows its size in pixels', () => {
    expect(lab.width).toBe(200);
    expect(lab.height).toBe(200);
  });

  it('leads around the wall to the target', () => {
    // From the top-left, the way goes down first
    expect(lab.waypoint({ x: 60, y: 60 }, { x: 140, y: 60 }, 100)).toEqual({ x: 60, y: 100 });
  });

  it('walks straight to a target it can see', () => {
    expect(lab.waypoint({ x: 140, y: 140 }, { x: 140, y: 60 }, 200)).toEqual({ x: 140, y: 60 });
  });

  it('counts steps to the target', () => {
    expect(lab.stepsTo({ tx: 3, ty: 1 })).toBe(0);
    expect(lab.stepsTo({ tx: 1, ty: 1 })).toBeCloseTo(6);
  });

  it('does not see through walls', () => {
    expect(lab.canSee({ x: 60, y: 60 }, { x: 140, y: 60 })).toBe(false);
    expect(lab.wallHit({ x: 60, y: 60 }, { x: 140, y: 60 })).not.toBeNull();
  });
});
