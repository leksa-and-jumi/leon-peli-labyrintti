import { describe, expect, it } from 'vitest';
import { bulletAngle, flyBullet, makeBullet, stepBullet } from './bullets';

describe('bullets', () => {
  it('flies the way it was shot', () => {
    const b = stepBullet(makeBullet({ x: 10, y: 10 }, Math.PI / 2), 1000, 100);
    expect(b.x).toBeCloseTo(10);
    expect(b.y).toBeCloseTo(110);
    expect(b.traveled).toBeCloseTo(100);
    expect(bulletAngle(b)).toBeCloseTo(Math.PI / 2);
  });

  it('rejects a speed of zero', () => {
    expect(() => stepBullet(makeBullet({ x: 0, y: 0 }, 0), 0, 16)).toThrow(RangeError);
  });
});

describe('flyBullet', () => {
  const noWalls = (): null => null;
  const wallAt50 = (from: { x: number }, to: { x: number }): { x: number; y: number } | null =>
    to.x >= 50 && from.x < 50 ? { x: 50, y: 0 } : null;
  const right = makeBullet({ x: 0, y: 0 }, 0);

  it('keeps flying with nothing in the way', () => {
    const result = flyBullet(right, 1000, 20, 500, noWalls, []);
    expect(result.kind).toBe('flying');
  });

  it('hits a body on the way', () => {
    const result = flyBullet(right, 1000, 100, 500, noWalls, [
      { center: { x: 60, y: 0 }, radius: 10 },
    ]);
    expect(result).toEqual({ kind: 'hit', target: 0 });
  });

  it('a wall in front of the body stops the bullet', () => {
    const result = flyBullet(right, 1000, 100, 500, wallAt50, [
      { center: { x: 80, y: 0 }, radius: 10 },
    ]);
    expect(result).toEqual({ kind: 'wall', at: { x: 50, y: 0 } });
  });

  it('is gone after flying its whole range', () => {
    expect(flyBullet({ ...right, traveled: 495 }, 1000, 10, 500, noWalls, []).kind).toBe('gone');
  });
});
