import { describe, expect, it } from 'vitest';
import type { Tile } from './maze';
import { pickSpawnTile } from './spawn';

const tiles: Tile[] = [
  { tx: 1, ty: 0 },
  { tx: 5, ty: 0 },
  { tx: 9, ty: 0 },
  { tx: 20, ty: 0 },
];
const distanceOf = (t: Tile): number => (t.tx === 20 ? Infinity : t.tx);

describe('pickSpawnTile', () => {
  it('picks a far-away tile that the player cannot see', () => {
    const tile = pickSpawnTile(
      tiles,
      distanceOf,
      (t) => t.tx === 9,
      4,
      () => 0,
    );
    expect(tile).toEqual({ tx: 5, ty: 0 });
  });

  it('never picks an unreachable tile', () => {
    for (const r of [0, 0.5, 0.99]) {
      expect(
        pickSpawnTile(
          tiles,
          distanceOf,
          () => false,
          4,
          () => r,
        )?.tx,
      ).not.toBe(20);
    }
  });

  it('falls back to the farthest tile', () => {
    expect(
      pickSpawnTile(
        tiles,
        distanceOf,
        () => true,
        4,
        () => 0,
      ),
    ).toEqual({ tx: 9, ty: 0 });
  });

  it('gives null with no tiles at all', () => {
    expect(
      pickSpawnTile(
        [],
        distanceOf,
        () => false,
        4,
        () => 0,
      ),
    ).toBeNull();
  });
});
