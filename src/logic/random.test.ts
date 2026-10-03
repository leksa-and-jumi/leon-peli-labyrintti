import { describe, expect, it } from 'vitest';
import { createRandom, cssColor, mixColor, randomInt } from './random';

describe('createRandom', () => {
  it('gives the same numbers for the same seed', () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays between 0 and 1', () => {
    const r = createRandom(1);
    for (let i = 0; i < 200; i++) {
      const n = r();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('randomInt includes both ends', () => {
    const r = createRandom(3);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(randomInt(r, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });
});

describe('colors', () => {
  it('mixes halfway', () => {
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(mixColor(0x123456, 0xffffff, 0)).toBe(0x123456);
  });

  it('writes colors for the canvas', () => {
    expect(cssColor(0xff8000, 0.5)).toBe('rgba(255,128,0,0.5)');
  });
});
