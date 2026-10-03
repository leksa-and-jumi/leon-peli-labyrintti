import { describe, expect, it } from 'vitest';
import { bounceOffWalls, dropShape, landOnFloor, stepFlyer, type Flyer } from './blood';

const thrown: Flyer = { x: 0, y: 0, z: 10, vx: 100, vy: 0, vz: 50 };

describe('stepFlyer', () => {
  it('flies forward and gravity pulls it down', () => {
    const f = stepFlyer(thrown, 100, 1000, 0);
    expect(f.x).toBeCloseTo(10);
    expect(f.vz).toBeCloseTo(-50);
  });

  it('air slows it down', () => {
    expect(stepFlyer(thrown, 100, 0, 2).vx).toBeLessThan(100);
  });
});

describe('landOnFloor', () => {
  it('keeps flying while up in the air', () => {
    expect(landOnFloor(thrown, 0.4, 20).resting).toBe(false);
  });

  it('bounces back up when it lands fast', () => {
    const { flyer, resting } = landOnFloor({ ...thrown, z: -1, vz: -200 }, 0.4, 20);
    expect(resting).toBe(false);
    expect(flyer.vz).toBeCloseTo(80);
    expect(flyer.z).toBe(0);
  });

  it('lies still after a soft landing', () => {
    const { flyer, resting } = landOnFloor({ ...thrown, z: -1, vz: -30 }, 0.4, 20);
    expect(resting).toBe(true);
    expect(flyer.vx).toBe(0);
  });
});

describe('bounceOffWalls', () => {
  const wallAtRight = (x: number): boolean => x > 5;

  it('bounces back from a wall', () => {
    const before = { ...thrown, x: 4 };
    const after = { ...thrown, x: 6 };
    const f = bounceOffWalls(before, after, wallAtRight, 0.5);
    expect(f.x).toBe(4);
    expect(f.vx).toBe(-50);
  });

  it('flies on with no wall', () => {
    const f = bounceOffWalls(thrown, { ...thrown, x: 3 }, wallAtRight, 0.5);
    expect(f.x).toBe(3);
  });
});

describe('dropShape', () => {
  it('stretches fast drops, up to a limit', () => {
    expect(dropShape(0, 0, 3).stretch).toBe(1);
    expect(dropShape(4000, 0, 3).stretch).toBe(3);
  });
});
