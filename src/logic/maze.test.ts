import { describe, expect, it } from 'vitest';
import { cellCenterTile, countFloor, generateMaze, isWall, type TileGrid } from './maze';
import { createRandom } from './random';

/** All floor tiles you can walk to from one floor tile. */
function reachable(grid: TileGrid, start: { tx: number; ty: number }): number {
  const seen = new Set<number>([start.ty * grid.width + start.tx]);
  const queue = [start];
  while (queue.length > 0) {
    const t = queue.shift();
    if (!t) break;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = t.tx + dx;
      const ny = t.ty + dy;
      const key = ny * grid.width + nx;
      if (isWall(grid, nx, ny) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ tx: nx, ty: ny });
    }
  }
  return seen.size;
}

describe('generateMaze', () => {
  const options = { cellsX: 6, cellsY: 4, cellTiles: 3, extraOpenings: 0.2 };

  it('has the right size, with walls all around', () => {
    const grid = generateMaze(options, createRandom(1));
    expect(grid.width).toBe(6 * 4 + 1);
    expect(grid.height).toBe(4 * 4 + 1);
    for (let x = 0; x < grid.width; x++) {
      expect(isWall(grid, x, 0)).toBe(true);
      expect(isWall(grid, x, grid.height - 1)).toBe(true);
    }
  });

  it('every floor tile can be reached', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const grid = generateMaze(options, createRandom(seed));
      expect(reachable(grid, cellCenterTile(0, 0, 3))).toBe(countFloor(grid));
    }
  });

  it('without extra openings it is a perfect maze (no loops)', () => {
    const grid = generateMaze({ ...options, extraOpenings: 0 }, createRandom(9));
    const rooms = 6 * 4;
    // Every room, plus one 3-tile doorway for each of the (rooms - 1) paths between them
    expect(countFloor(grid)).toBe(rooms * 9 + (rooms - 1) * 3);
  });

  it('extra openings knock down more walls', () => {
    const perfect = generateMaze({ ...options, extraOpenings: 0 }, createRandom(9));
    const ruined = generateMaze({ ...options, extraOpenings: 0.5 }, createRandom(9));
    expect(countFloor(ruined)).toBeGreaterThan(countFloor(perfect));
  });

  it('counts outside the map as wall', () => {
    const grid = generateMaze(options, createRandom(1));
    expect(isWall(grid, -1, 3)).toBe(true);
    expect(isWall(grid, 3, 999)).toBe(true);
  });

  it('rejects an empty maze', () => {
    expect(() => generateMaze({ ...options, cellsX: 0 }, createRandom(1))).toThrow(RangeError);
  });
});
