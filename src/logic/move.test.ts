import { describe, expect, it } from 'vitest';
import { moveVector } from './move';

describe('moveVector', () => {
  it('stands still with no keys', () => {
    expect(moveVector(false, false, false, false)).toEqual({ x: 0, y: 0 });
  });

  it('moves straight', () => {
    expect(moveVector(false, true, false, false)).toEqual({ x: 1, y: 0 });
    expect(moveVector(false, false, true, false)).toEqual({ x: 0, y: -1 });
  });

  it('is not faster diagonally', () => {
    const v = moveVector(false, true, false, true);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('cancels opposite keys', () => {
    expect(moveVector(true, true, false, false)).toEqual({ x: 0, y: 0 });
  });
});
