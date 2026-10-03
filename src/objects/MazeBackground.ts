import Phaser from 'phaser';
import { DEPTH, LABYRINTH, RUINS } from '../config';
import type { Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { isWall } from '../logic/maze';
import { cssColor, mixColor } from '../logic/random';

const T = LABYRINTH.tileSize;
const BLOCK_W = 22;
const BLOCK_H = 20;

/** The same "random" number every time for the same spot, so stones match across tiles. */
function hash(a: number, b: number): number {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * The labyrinth seen from above, drawn once onto a big picture: worn flagstones
 * and earth, old stone walls with moss (lit by the moon from the top right, so
 * the shadows fall down-left), round columns where only a pillar is left,
 * rubble, grass and torches on the walls. No image files, just shapes.
 */
export class MazeBackground {
  /** Where the torch flames are. The flickering fire is added by the atmosphere. */
  readonly torches: Point[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly labyrinth: Labyrinth,
    private readonly random: () => number,
    key: string,
  ) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, labyrinth.width, labyrinth.height);
    if (!texture) throw new Error('Could not make the labyrinth picture');
    const ctx = texture.getContext();
    this.drawFloor(ctx);
    this.drawShadows(ctx);
    this.drawRubbleAndGrass(ctx);
    this.drawWalls(ctx);
    this.drawTorches(ctx);
    texture.refresh();
    scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(DEPTH.floor);
  }

  private wall(tx: number, ty: number): boolean {
    return isWall(this.labyrinth.grid, tx, ty);
  }

  private forEachTile(fn: (tx: number, ty: number) => void): void {
    const { width, height } = this.labyrinth.grid;
    for (let ty = 0; ty < height; ty++) for (let tx = 0; tx < width; tx++) fn(tx, ty);
  }

  /** Dark earth with worn flagstones. Some stones are missing, some are cracked. */
  private drawFloor(ctx: CanvasRenderingContext2D): void {
    const { floor, flagstone } = RUINS;
    ctx.fillStyle = cssColor(floor.base);
    ctx.fillRect(0, 0, this.labyrinth.width, this.labyrinth.height);

    this.forEachTile((tx, ty) => {
      if (this.wall(tx, ty)) return;
      const x = tx * T;
      const y = ty * T;
      // Some spots have lost their stones: just earth
      if (this.random() < 0.18) {
        ctx.fillStyle = cssColor(floor.dirt, 0.5);
        ctx.beginPath();
        ctx.ellipse(x + T / 2, y + T / 2, T * 0.45, T * 0.35, this.random() * 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.fillStyle = cssColor(flagstone.gap);
      ctx.fillRect(x, y, T, T);
      // Two big stones or four small ones
      const half = T / 2;
      const stones: [number, number, number, number][] =
        this.random() < 0.5
          ? [
              [0, 0, T, half],
              [0, half, T, half],
            ]
          : [
              [0, 0, half, half],
              [half, 0, half, half],
              [0, half, half, half],
              [half, half, half, half],
            ];
      for (const [sx, sy, sw, sh] of stones) {
        if (this.random() < 0.06) continue;
        const shade = mixColor(flagstone.dark, flagstone.light, this.random() * 0.6);
        ctx.fillStyle = cssColor(shade);
        ctx.fillRect(x + sx + 1.5, y + sy + 1.5, sw - 3, sh - 3);
        // Moonlight on the top-right edges, darkness on the bottom-left
        ctx.fillStyle = cssColor(0xffffff, 0.06);
        ctx.fillRect(x + sx + 1.5, y + sy + 1.5, sw - 3, 1.5);
        ctx.fillStyle = cssColor(0x000000, 0.18);
        ctx.fillRect(x + sx + 1.5, y + sy + sh - 3, sw - 3, 1.5);
        if (this.random() < 0.25) this.crack(ctx, x + sx + 3, y + sy + 3, sw - 6, sh - 6);
      }
    });

    // Dark and light blotches of dirt and wear over everything
    for (let i = 0; i < this.labyrinth.width * this.labyrinth.height * 0.0012; i++) {
      const px = this.random() * this.labyrinth.width;
      const py = this.random() * this.labyrinth.height;
      ctx.fillStyle = cssColor(this.random() < 0.5 ? floor.dark : floor.dirt, 0.12);
      ctx.beginPath();
      ctx.ellipse(
        px,
        py,
        8 + this.random() * 30,
        6 + this.random() * 20,
        this.random() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  /** A thin zigzag crack inside a stone. */
  private crack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.strokeStyle = cssColor(RUINS.flagstone.gap, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    let px = x + this.random() * w;
    let py = y;
    ctx.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      px = Math.min(Math.max(px + (this.random() - 0.5) * 10, x), x + w);
      py += h / 4;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  /** Walls throw shadows down-left. Drawn all at once, so they don't get darker where they overlap. */
  private drawShadows(ctx: CanvasRenderingContext2D): void {
    const shadows = document.createElement('canvas');
    shadows.width = this.labyrinth.width;
    shadows.height = this.labyrinth.height;
    const s = shadows.getContext('2d');
    if (!s) return;
    const { x: ox, y: oy, color, alpha, blur } = RUINS.shadow;
    s.fillStyle = cssColor(color);
    // Soft edges, like real moonlight shadows
    s.shadowColor = cssColor(color);
    s.shadowBlur = blur;
    this.forEachTile((tx, ty) => {
      if (!this.wall(tx, ty)) return;
      const x = tx * T;
      const y = ty * T;
      if (this.isPillar(tx, ty)) {
        s.beginPath();
        s.arc(x + T / 2 + ox, y + T / 2 + oy, T * 0.45, 0, Math.PI * 2);
        s.fill();
        return;
      }
      // The block and its slanted shadow
      s.beginPath();
      s.moveTo(x, y);
      s.lineTo(x + T, y);
      s.lineTo(x + T + ox, y + oy);
      s.lineTo(x + T + ox, y + T + oy);
      s.lineTo(x + ox, y + T + oy);
      s.lineTo(x, y + T);
      s.closePath();
      s.fill();
    });
    ctx.globalAlpha = alpha;
    ctx.drawImage(shadows, 0, 0);
    ctx.globalAlpha = 1;
  }

  /** A lone wall tile with floor on all four sides: what's left is a round column. */
  private isPillar(tx: number, ty: number): boolean {
    return (
      !this.wall(tx + 1, ty) &&
      !this.wall(tx - 1, ty) &&
      !this.wall(tx, ty + 1) &&
      !this.wall(tx, ty - 1)
    );
  }

  /** Is this floor tile right next to a wall? */
  private byWall(tx: number, ty: number): boolean {
    return (
      this.wall(tx + 1, ty) ||
      this.wall(tx - 1, ty) ||
      this.wall(tx, ty + 1) ||
      this.wall(tx, ty - 1)
    );
  }

  /** Fallen stones and tufts of grass, mostly along the walls. */
  private drawRubbleAndGrass(ctx: CanvasRenderingContext2D): void {
    const floorTiles: [number, number][] = [];
    this.forEachTile((tx, ty) => {
      if (!this.wall(tx, ty)) floorTiles.push([tx, ty]);
    });
    const pick = (): [number, number] | undefined => {
      // Twice as likely next to a wall
      for (let tries = 0; tries < 3; tries++) {
        const t = floorTiles[Math.floor(this.random() * floorTiles.length)];
        if (t && (this.byWall(t[0], t[1]) || this.random() < 0.4)) return t;
      }
      return floorTiles[Math.floor(this.random() * floorTiles.length)];
    };
    const { stone, moss } = RUINS;
    for (let i = 0; i < RUINS.rubbleCount; i++) {
      const t = pick();
      if (!t) continue;
      const x = t[0] * T + this.random() * T;
      const y = t[1] * T + this.random() * T;
      const r = 2 + this.random() * 6;
      ctx.fillStyle = cssColor(0x000000, 0.35);
      ctx.beginPath();
      ctx.ellipse(x - 2, y + 2.5, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cssColor(mixColor(stone.dark, stone.light, this.random()));
      ctx.beginPath();
      const corners = 5 + Math.floor(this.random() * 3);
      for (let c = 0; c < corners; c++) {
        const a = (c / corners) * Math.PI * 2;
        const rr = r * (0.7 + this.random() * 0.3);
        if (c === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cssColor(stone.highlight, 0.35);
      ctx.beginPath();
      ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < RUINS.grassCount; i++) {
      const t = pick();
      if (!t) continue;
      const x = t[0] * T + this.random() * T;
      const y = t[1] * T + this.random() * T;
      for (let b = 0; b < 6; b++) {
        ctx.strokeStyle = cssColor(this.random() < 0.5 ? moss.dark : moss.light, 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const a = this.random() * Math.PI * 2;
        const l = 3 + this.random() * 6;
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
    }
  }

  /** The stone walls: block tops with moss, a front face where you can see it, and columns. */
  private drawWalls(ctx: CanvasRenderingContext2D): void {
    this.forEachTile((tx, ty) => {
      if (!this.wall(tx, ty)) return;
      if (this.isPillar(tx, ty)) this.drawColumn(ctx, tx * T + T / 2, ty * T + T / 2);
      else this.drawWallTile(ctx, tx, ty);
    });
  }

  private drawWallTile(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
    const { stone, moss } = RUINS;
    const x = tx * T;
    const y = ty * T;
    // With floor below, you see the wall's front face under its top
    const face = this.wall(tx, ty + 1) ? 0 : LABYRINTH.frontFace;
    const topH = T - face;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, T, topH);
    ctx.clip();
    ctx.fillStyle = cssColor(stone.edge);
    ctx.fillRect(x, y, T, topH);
    // Stone blocks in a brick pattern that runs on across tiles
    const firstRow = Math.floor(y / BLOCK_H);
    for (let row = firstRow; row * BLOCK_H < y + topH; row++) {
      const shift = row % 2 === 0 ? 0 : BLOCK_W / 2;
      const firstCol = Math.floor((x - shift) / BLOCK_W);
      for (let col = firstCol; col * BLOCK_W + shift < x + T; col++) {
        const bx = col * BLOCK_W + shift;
        const by = row * BLOCK_H;
        const shade = hash(col, row);
        ctx.fillStyle = cssColor(mixColor(stone.dark, stone.light, 0.25 + shade * 0.6));
        ctx.fillRect(bx + 1, by + 1, BLOCK_W - 2, BLOCK_H - 2);
        ctx.fillStyle = cssColor(stone.highlight, 0.35);
        ctx.fillRect(bx + 1, by + 1, BLOCK_W - 2, 1.5);
        ctx.fillRect(bx + BLOCK_W - 2.5, by + 1, 1.5, BLOCK_H - 2);
        ctx.fillStyle = cssColor(0x000000, 0.25);
        ctx.fillRect(bx + 1, by + BLOCK_H - 2.5, BLOCK_W - 2, 1.5);
        // Moss grows on some stones
        if (hash(col + 17, row - 5) < 0.22) {
          for (let m = 0; m < 5; m++) {
            ctx.fillStyle = cssColor(hash(col, row + m) < 0.5 ? moss.dark : moss.light, 0.75);
            ctx.beginPath();
            ctx.arc(
              bx + 4 + hash(col + m, row) * (BLOCK_W - 8),
              by + 4 + hash(col, row + m * 3) * (BLOCK_H - 8),
              1.5 + hash(col * m, row) * 3,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();

    // Bright moonlit edge where the wall top meets floor on the top or right
    ctx.fillStyle = cssColor(stone.highlight, 0.55);
    if (!this.wall(tx, ty - 1)) ctx.fillRect(x, y, T, 2);
    if (!this.wall(tx + 1, ty)) ctx.fillRect(x + T - 2, y, 2, topH);
    ctx.fillStyle = cssColor(0x000000, 0.35);
    if (!this.wall(tx - 1, ty)) ctx.fillRect(x, y, 2, T);

    if (face === 0) return;
    // Front face: darker stone, getting darker toward the floor
    const fy = y + topH;
    const gradient = ctx.createLinearGradient(0, fy, 0, y + T);
    gradient.addColorStop(0, cssColor(stone.face));
    gradient.addColorStop(1, cssColor(mixColor(stone.face, 0x000000, 0.55)));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, fy, T, face);
    ctx.strokeStyle = cssColor(0x000000, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, fy + face / 2);
    ctx.lineTo(x + T, fy + face / 2);
    for (let bx = x + ((tx % 2) * BLOCK_W) / 2; bx < x + T; bx += BLOCK_W) {
      ctx.moveTo(bx, fy);
      ctx.lineTo(bx, fy + face / 2);
    }
    ctx.stroke();
    ctx.fillStyle = cssColor(stone.highlight, 0.25);
    ctx.fillRect(x, fy, T, 1.5);
  }

  /** A round broken column seen from above, with rings and moonlight on one side. */
  private drawColumn(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const { stone, moss } = RUINS;
    const r = T * 0.46;
    ctx.fillStyle = cssColor(stone.dark);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    const gradient = ctx.createRadialGradient(cx + r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    gradient.addColorStop(0, cssColor(stone.highlight));
    gradient.addColorStop(1, cssColor(stone.dark));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = cssColor(stone.edge, 0.6);
    ctx.lineWidth = 1;
    for (const k of [0.65, 0.4]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = cssColor(moss.dark, 0.7);
    ctx.beginPath();
    ctx.arc(cx - r * 0.45, cy + r * 0.4, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Torch holders on some wall faces. The fire itself is alive, so it's added on top. */
  private drawTorches(ctx: CanvasRenderingContext2D): void {
    const { wood, metal } = RUINS.torch;
    this.forEachTile((tx, ty) => {
      if (!this.wall(tx, ty) || this.wall(tx, ty + 1) || this.isPillar(tx, ty)) return;
      if (this.random() * LABYRINTH.torchEvery >= 1) return;
      const x = tx * T + T / 2;
      const y = (ty + 1) * T - LABYRINTH.frontFace / 2;
      ctx.fillStyle = cssColor(metal);
      ctx.fillRect(x - 5, y - 4, 10, 7);
      ctx.fillStyle = cssColor(wood);
      ctx.fillRect(x - 2, y - 2, 4, 9);
      this.torches.push({ x, y: y + 8 });
    });
  }
}
