import { clamp, type Point } from './geometry';
import { isWall, type Tile, type TileGrid } from './maze';

/** Which tile a point is on. */
export function tileAt(tileSize: number, x: number, y: number): Tile {
  return { tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) };
}

/** The middle of a tile, in pixels. */
export function tileCenter(tileSize: number, tile: Tile): Point {
  return { x: (tile.tx + 0.5) * tileSize, y: (tile.ty + 0.5) * tileSize };
}

/** Is this point inside a wall? */
export function pointInWall(grid: TileGrid, tileSize: number, x: number, y: number): boolean {
  const t = tileAt(tileSize, x, y);
  return isWall(grid, t.tx, t.ty);
}

/** Pushes a round body out of any wall it overlaps. */
function pushOut(grid: TileGrid, tileSize: number, p: Point, radius: number): Point {
  let { x, y } = p;
  const from = tileAt(tileSize, x - radius, y - radius);
  const to = tileAt(tileSize, x + radius, y + radius);
  for (let ty = from.ty; ty <= to.ty; ty++) {
    for (let tx = from.tx; tx <= to.tx; tx++) {
      if (!isWall(grid, tx, ty)) continue;
      const left = tx * tileSize;
      const top = ty * tileSize;
      // The closest point of the wall tile to the body's middle
      const cx = clamp(x, left, left + tileSize);
      const cy = clamp(y, top, top + tileSize);
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d >= radius) continue;
      if (d > 0) {
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
        continue;
      }
      // The middle is inside the wall: go out the nearest side
      const sides = [
        { gap: x - left, x: left - radius, y },
        { gap: left + tileSize - x, x: left + tileSize + radius, y },
        { gap: y - top, x, y: top - radius },
        { gap: top + tileSize - y, x, y: top + tileSize + radius },
      ].sort((a, b) => a.gap - b.gap);
      const nearest = sides[0];
      if (nearest) {
        x = nearest.x;
        y = nearest.y;
      }
    }
  }
  return { x, y };
}

/**
 * Moves a round body by (dx, dy) without going into walls. Bumping into a wall
 * at an angle slides along it, like in real games. Big moves go in small steps
 * so nothing can jump through a wall.
 */
export function moveCircle(
  grid: TileGrid,
  tileSize: number,
  from: Point,
  radius: number,
  dx: number,
  dy: number,
): Point {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (radius / 2)));
  let p = { ...from };
  for (let i = 0; i < steps; i++) {
    p = pushOut(grid, tileSize, { x: p.x + dx / steps, y: p.y }, radius);
    p = pushOut(grid, tileSize, { x: p.x, y: p.y + dy / steps }, radius);
  }
  return p;
}

/**
 * Walks along the line from `a` to `b` and returns the first spot inside a wall,
 * or null if the line is clear. Used for seeing and for bullets hitting walls.
 */
export function firstWallHit(
  grid: TileGrid,
  tileSize: number,
  a: Point,
  b: Point,
  step = tileSize / 5,
): Point | null {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const count = Math.max(1, Math.ceil(length / step));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (pointInWall(grid, tileSize, x, y)) return { x, y };
  }
  return null;
}

/** Can someone at `a` see `b`, with no wall in between? */
export function canSee(grid: TileGrid, tileSize: number, a: Point, b: Point): boolean {
  return firstWallHit(grid, tileSize, a, b) === null;
}
