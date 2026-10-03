/** A map made of square tiles. Each tile is a wall or floor. */
export interface TileGrid {
  width: number;
  height: number;
  /** `walls[y * width + x]` is true for a wall. */
  walls: boolean[];
}

/** A tile's place in the grid. */
export interface Tile {
  tx: number;
  ty: number;
}

/** Is there a wall here? Everything outside the map counts as wall. */
export function isWall(grid: TileGrid, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= grid.width || ty >= grid.height) return true;
  return grid.walls[ty * grid.width + tx] ?? true;
}

export interface MazeOptions {
  /** Rooms across and down. */
  cellsX: number;
  cellsY: number;
  /** How many tiles wide each room and corridor is. Walls are one tile thick. */
  cellTiles: number;
  /** 0–1: how many extra walls are knocked down, so there are loops and fewer dead ends. */
  extraOpenings: number;
}

/**
 * Builds a labyrinth: first a maze where every room can be reached
 * (a path is dug from room to room until all are visited), then some extra
 * walls fall down, like crumbled ruins, so you can run around in loops.
 */
export function generateMaze(options: MazeOptions, random: () => number): TileGrid {
  const { cellsX, cellsY, cellTiles: k, extraOpenings } = options;
  if (cellsX < 1 || cellsY < 1 || k < 1) {
    throw new RangeError('A maze needs at least one room');
  }
  const width = cellsX * (k + 1) + 1;
  const height = cellsY * (k + 1) + 1;
  const walls = new Array<boolean>(width * height).fill(true);
  const dig = (tx: number, ty: number): void => {
    walls[ty * width + tx] = false;
  };

  // Every room is floor
  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) dig(cx * (k + 1) + 1 + i, cy * (k + 1) + 1 + j);
      }
    }
  }

  /** Knock down the wall between a room and its right (dx 1) or lower (dy 1) neighbour. */
  const open = (cx: number, cy: number, dx: number, dy: number): void => {
    const left = Math.min(cx, cx + dx);
    const top = Math.min(cy, cy + dy);
    for (let i = 0; i < k; i++) {
      if (dx !== 0) dig(left * (k + 1) + k + 1, top * (k + 1) + 1 + i);
      else dig(left * (k + 1) + 1 + i, top * (k + 1) + k + 1);
    }
  };

  // Dig a path from room to room, backing up at dead ends, until every room is visited
  const visited = new Array<boolean>(cellsX * cellsY).fill(false);
  const stack: [number, number][] = [[0, 0]];
  visited[0] = true;
  const directions: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (!top) break;
    const [cx, cy] = top;
    const choices = directions.filter(([dx, dy]) => {
      const nx = cx + dx;
      const ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < cellsX && ny < cellsY && !visited[ny * cellsX + nx];
    });
    if (choices.length === 0) {
      stack.pop();
      continue;
    }
    const [dx, dy] = choices[Math.floor(random() * choices.length)] ?? [1, 0];
    open(cx, cy, dx, dy);
    visited[(cy + dy) * cellsX + cx + dx] = true;
    stack.push([cx + dx, cy + dy]);
  }

  // Crumbled walls: some extra openings make loops
  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      if (cx + 1 < cellsX && random() < extraOpenings) open(cx, cy, 1, 0);
      if (cy + 1 < cellsY && random() < extraOpenings) open(cx, cy, 0, 1);
    }
  }
  return { width, height, walls };
}

/** The middle tile of room (cx, cy). */
export function cellCenterTile(cx: number, cy: number, cellTiles: number): Tile {
  const middle = Math.floor(cellTiles / 2);
  return { tx: cx * (cellTiles + 1) + 1 + middle, ty: cy * (cellTiles + 1) + 1 + middle };
}

/** The middle tiles of every room. Good places to start from. */
export function cellCenters(cellsX: number, cellsY: number, cellTiles: number): Tile[] {
  const tiles: Tile[] = [];
  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) tiles.push(cellCenterTile(cx, cy, cellTiles));
  }
  return tiles;
}

/** How many floor tiles there are. */
export function countFloor(grid: TileGrid): number {
  return grid.walls.filter((w) => !w).length;
}
