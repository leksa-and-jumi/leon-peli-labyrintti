import { isWall, type Tile, type TileGrid } from './maze';

/** Steps to the 8 neighbours: straight ones cost 1, diagonal ones √2. */
const NEIGHBOURS = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: Math.SQRT2 },
  { dx: 1, dy: -1, cost: Math.SQRT2 },
  { dx: -1, dy: 1, cost: Math.SQRT2 },
  { dx: -1, dy: -1, cost: Math.SQRT2 },
] as const;

/** Can you step from a tile to its neighbour? Diagonal steps must not cut a wall's corner. */
function canStep(grid: TileGrid, tx: number, ty: number, dx: number, dy: number): boolean {
  if (isWall(grid, tx + dx, ty + dy)) return false;
  if (dx !== 0 && dy !== 0) return !isWall(grid, tx + dx, ty) && !isWall(grid, tx, ty + dy);
  return true;
}

/** Is any of the 8 tiles around this one a wall? */
function nextToWall(grid: TileGrid, tx: number, ty: number): boolean {
  return NEIGHBOURS.some(({ dx, dy }) => isWall(grid, tx + dx, ty + dy));
}

/**
 * How far every tile is from `target`, walking around the walls (a "smell map").
 * Enemies follow it downhill to find the player. Tiles right next to a wall cost
 * `wallPenalty` extra, so the big guys walk in the middle of the corridors.
 * Unreachable tiles are Infinity.
 */
export function distanceField(grid: TileGrid, target: Tile, wallPenalty = 0): Float64Array {
  const { width, height } = grid;
  const field = new Float64Array(width * height).fill(Infinity);
  if (isWall(grid, target.tx, target.ty)) return field;
  const start = target.ty * width + target.tx;
  field[start] = 0;
  // A small "who's closest" heap: [distance, tile index]
  const heap: [number, number][] = [[0, start]];
  while (heap.length > 0) {
    const [d, index] = popMin(heap);
    if (d > (field[index] ?? Infinity)) continue;
    const tx = index % width;
    const ty = Math.floor(index / width);
    for (const { dx, dy, cost } of NEIGHBOURS) {
      if (!canStep(grid, tx, ty, dx, dy)) continue;
      const nx = tx + dx;
      const ny = ty + dy;
      const next = d + cost + (nextToWall(grid, nx, ny) ? wallPenalty : 0);
      const ni = ny * width + nx;
      if (next < (field[ni] ?? Infinity)) {
        field[ni] = next;
        pushHeap(heap, [next, ni]);
      }
    }
  }
  return field;
}

/** The distance of one tile in a field (Infinity outside the map). */
export function fieldAt(grid: TileGrid, field: Float64Array, tile: Tile): number {
  if (tile.tx < 0 || tile.ty < 0 || tile.tx >= grid.width || tile.ty >= grid.height) {
    return Infinity;
  }
  return field[tile.ty * grid.width + tile.tx] ?? Infinity;
}

/** The neighbouring tile that's closest to the target, or null when already there (or lost). */
export function nextTile(grid: TileGrid, field: Float64Array, from: Tile): Tile | null {
  let best: Tile | null = null;
  let bestDistance = fieldAt(grid, field, from);
  for (const { dx, dy } of NEIGHBOURS) {
    if (!canStep(grid, from.tx, from.ty, dx, dy)) continue;
    const tile = { tx: from.tx + dx, ty: from.ty + dy };
    const d = fieldAt(grid, field, tile);
    if (d < bestDistance) {
      bestDistance = d;
      best = tile;
    }
  }
  return best;
}

function pushHeap(heap: [number, number][], item: [number, number]): void {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    const p = heap[parent];
    const c = heap[i];
    if (!p || !c || p[0] <= c[0]) break;
    heap[parent] = c;
    heap[i] = p;
    i = parent;
  }
}

function popMin(heap: [number, number][]): [number, number] {
  const top = heap[0] ?? [Infinity, -1];
  const last = heap.pop();
  if (heap.length === 0 || !last) return top;
  heap[0] = last;
  let i = 0;
  for (;;) {
    const l = i * 2 + 1;
    const r = l + 1;
    let smallest = i;
    if ((heap[l]?.[0] ?? Infinity) < (heap[smallest]?.[0] ?? Infinity)) smallest = l;
    if ((heap[r]?.[0] ?? Infinity) < (heap[smallest]?.[0] ?? Infinity)) smallest = r;
    if (smallest === i) break;
    const a = heap[i];
    const b = heap[smallest];
    if (!a || !b) break;
    heap[i] = b;
    heap[smallest] = a;
    i = smallest;
  }
  return top;
}
