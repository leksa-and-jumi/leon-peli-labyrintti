import { canSee, firstWallHit, moveCircle, pointInWall, tileAt, tileCenter } from './collide';
import { distance, type Point } from './geometry';
import type { Tile, TileGrid } from './maze';
import { distanceField, fieldAt, nextTile } from './path';

/**
 * The labyrinth in pixels: walls, walking without going through them, seeing
 * around corners, and the "smell map" that leads enemies to the player.
 */
export class Labyrinth {
  private field: Float64Array;
  private target: Tile = { tx: -1, ty: -1 };

  constructor(
    readonly grid: TileGrid,
    readonly tileSize: number,
    /** Extra cost for walking right next to a wall. */
    private readonly wallPenalty: number,
  ) {
    this.field = new Float64Array(grid.width * grid.height).fill(Infinity);
  }

  get width(): number {
    return this.grid.width * this.tileSize;
  }

  get height(): number {
    return this.grid.height * this.tileSize;
  }

  tileOf(p: Point): Tile {
    return tileAt(this.tileSize, p.x, p.y);
  }

  centerOf(tile: Tile): Point {
    return tileCenter(this.tileSize, tile);
  }

  isWallAt(p: Point): boolean {
    return pointInWall(this.grid, this.tileSize, p.x, p.y);
  }

  /** Moves a round body without walking through walls. */
  move(from: Point, radius: number, dx: number, dy: number): Point {
    return moveCircle(this.grid, this.tileSize, from, radius, dx, dy);
  }

  canSee(a: Point, b: Point): boolean {
    return canSee(this.grid, this.tileSize, a, b);
  }

  /** Where the line from `a` to `b` first hits a wall, or null. */
  wallHit(a: Point, b: Point): Point | null {
    return firstWallHit(this.grid, this.tileSize, a, b);
  }

  /** Point the smell map at the player. Only rebuilt when they step onto a new tile. */
  setTarget(p: Point): void {
    const tile = this.tileOf(p);
    if (tile.tx === this.target.tx && tile.ty === this.target.ty) return;
    if (this.isWallAt(p)) return;
    this.target = tile;
    this.field = distanceField(this.grid, tile, this.wallPenalty);
  }

  /** How many steps from this tile to the target. */
  stepsTo(tile: Tile): number {
    return fieldAt(this.grid, this.field, tile);
  }

  /**
   * Where to walk next to get closer to the target: the middle of the next tile
   * on the way, or the target itself when it's in sight and close.
   */
  waypoint(from: Point, goal: Point, shortcut: number): Point {
    if (distance(from, goal) < shortcut && this.canSee(from, goal)) return goal;
    const next = nextTile(this.grid, this.field, this.tileOf(from));
    return next ? this.centerOf(next) : goal;
  }
}
