import { describe, expect, it } from 'vitest';
import {
  angleTo,
  lerpAngle,
  normalizeAngle,
  rotate,
  segmentHitsCircle,
  smoothingStep,
  turnToward,
} from './geometry';

describe('angles', () => {
  it('points right, down and left', () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(0);
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(angleTo({ x: 0, y: 0 }, { x: -5, y: 0 }))).toBeCloseTo(Math.PI);
  });

  it('keeps angles between -π and π', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it('turns the short way round', () => {
    // From just below left to just above left: a tiny turn, not a full circle
    expect(lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5)).toBeCloseTo(Math.PI);
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnToward(0, -1, 0.25)).toBeCloseTo(-0.25);
    expect(turnToward(0, 0.1, 0.25)).toBeCloseTo(0.1);
  });

  it('rotates a point', () => {
    const p = rotate({ x: 10, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });
});

describe('segmentHitsCircle', () => {
  const body = { x: 50, y: 0 };

  it('hits a body the bullet flies through', () => {
    expect(segmentHitsCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, body, 10)).toBe(true);
  });

  it('misses a body the bullet flies past', () => {
    expect(segmentHitsCircle({ x: 0, y: 20 }, { x: 100, y: 20 }, body, 10)).toBe(false);
  });

  it('misses a body the bullet has not reached yet', () => {
    expect(segmentHitsCircle({ x: 0, y: 0 }, { x: 30, y: 0 }, body, 10)).toBe(false);
  });
});

describe('smoothingStep', () => {
  it('moves more when more time passes', () => {
    expect(smoothingStep(32, 14)).toBeGreaterThan(smoothingStep(16, 14));
    expect(smoothingStep(0, 14)).toBe(0);
  });
});
