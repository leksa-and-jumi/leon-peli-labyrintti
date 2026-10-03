/**
 * Small seeded random number generator (mulberry32).
 * The same seed always gives the same labyrinth.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random whole number from `min` to `max` (both included). */
export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** Mixes two colors: `t` 0 = `from`, 1 = `to`. */
export function mixColor(from: number, to: number, t: number): number {
  const amount = Math.min(Math.max(t, 0), 1);
  const channel = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * amount) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** A color like 0xff8800 as text the browser's canvas understands. */
export function cssColor(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${String(r)},${String(g)},${String(b)},${String(alpha)})`;
}
