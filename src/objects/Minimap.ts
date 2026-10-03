import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, MINIMAP } from '../config';
import { distance, type Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { isWall } from '../logic/maze';
import { cssColor } from '../logic/random';

/** A dot on the little map. */
export interface MapDot {
  at: Point;
  color: number;
  size: number;
}

/**
 * A little map of the labyrinth in the bottom-right corner, so you don't get lost.
 * You are the green dot. Enemies show up only when they're close.
 */
export class Minimap {
  private readonly dots: Phaser.GameObjects.Graphics;
  private readonly scale: number;
  private readonly left: number;
  private readonly top: number;

  constructor(scene: Phaser.Scene, labyrinth: Labyrinth, key: string) {
    const { width, height, margin } = MINIMAP;
    this.scale = Math.min(width / labyrinth.width, height / labyrinth.height);
    const w = Math.ceil(labyrinth.width * this.scale);
    const h = Math.ceil(labyrinth.height * this.scale);
    this.left = GAME_WIDTH - margin - w;
    this.top = GAME_HEIGHT - margin - h;

    if (scene.textures.exists(key)) scene.textures.remove(key);
    const texture = scene.textures.createCanvas(key, w, h);
    if (texture) {
      const ctx = texture.getContext();
      ctx.fillStyle = cssColor(MINIMAP.back, MINIMAP.backAlpha);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = cssColor(MINIMAP.wall, MINIMAP.wallAlpha);
      const { grid, tileSize } = labyrinth;
      const s = tileSize * this.scale;
      for (let ty = 0; ty < grid.height; ty++) {
        for (let tx = 0; tx < grid.width; tx++) {
          if (isWall(grid, tx, ty)) ctx.fillRect(tx * s, ty * s, s + 0.3, s + 0.3);
        }
      }
      texture.refresh();
      scene.add
        .image(this.left, this.top, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.hud);
    }
    scene.add
      .rectangle(this.left - 1, this.top - 1, w + 2, h + 2)
      .setOrigin(0, 0)
      .setStrokeStyle(2, MINIMAP.border, 0.8)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.dots = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(DEPTH.hud + 1);
  }

  /** Draw the player and the enemies close to them. */
  update(player: Point | null, enemies: readonly MapDot[]): void {
    this.dots.clear();
    for (const e of enemies) {
      if (player && distance(player, e.at) > MINIMAP.showDistance) continue;
      this.dot(e.at, e.color, e.size);
    }
    if (player) this.dot(player, MINIMAP.player, 3);
  }

  private dot(at: Point, color: number, size: number): void {
    this.dots.fillStyle(color, 1);
    this.dots.fillCircle(this.left + at.x * this.scale, this.top + at.y * this.scale, size);
  }
}
