import Phaser from 'phaser';
import { ATMOSPHERE, DEPTH, GAME_HEIGHT, GAME_WIDTH, RUINS } from '../config';
import type { Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { cssColor } from '../logic/random';

/** Something that drifts slowly across the labyrinth and comes back from the other side. */
interface Drifter {
  shape: Phaser.GameObjects.Graphics;
  speed: number;
  width: number;
}

interface Firefly {
  dot: Phaser.GameObjects.Image;
  home: Point;
  phase: number;
  speed: number;
}

/**
 * The night in the labyrinth: darkness everywhere except around your lantern,
 * flickering torches on the walls, fireflies, mist and cloud shadows drifting
 * over the stones, and darker screen edges like an old camera.
 */
export class Atmosphere {
  private readonly drifters: Drifter[] = [];
  private readonly fireflies: Firefly[] = [];
  private lantern: { image: Phaser.GameObjects.Image; follow: () => Point } | null = null;
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labyrinth: Labyrinth,
  ) {
    scene.events.on('update', this.tick, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.tick, this);
    });
  }

  /**
   * It's dark in the labyrinth: you only see well near your own lantern.
   * A big picture, clear in the middle and dark at the edges, follows `follow`.
   */
  addLantern(
    follow: () => Point,
    key: string,
    darkness: number = ATMOSPHERE.lantern.darkness,
  ): void {
    const { inner, outer, color } = ATMOSPHERE.lantern;
    const w = GAME_WIDTH * 2 + 200;
    const h = GAME_HEIGHT * 2 + 200;
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    const texture = this.scene.textures.createCanvas(key, w, h);
    if (!texture) return;
    const ctx = texture.getContext();
    const gradient = ctx.createRadialGradient(w / 2, h / 2, inner, w / 2, h / 2, outer);
    gradient.addColorStop(0, cssColor(color, 0));
    gradient.addColorStop(0.5, cssColor(color, darkness * 0.6));
    gradient.addColorStop(1, cssColor(color, darkness));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    texture.refresh();
    const image = this.scene.add.image(0, 0, key).setDepth(DEPTH.darkness);
    this.lantern = { image, follow };
    // The flame in the lantern flickers a tiny bit
    this.scene.tweens.add({
      targets: image,
      scale: 1.025,
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tick(0, 0);
  }

  /** Burning torches: a flickering flame and a warm glow that shines through the dark. */
  addTorches(spots: readonly Point[]): void {
    const { flame, core, glow } = RUINS.torch;
    const { radius, alpha } = ATMOSPHERE.torchGlow;
    for (const spot of spots) {
      const light = this.glow(spot.x, spot.y + 12, radius, glow, alpha);
      const inner = this.glow(spot.x, spot.y + 2, radius * 0.35, flame, alpha);
      const fire = this.scene.add.circle(spot.x, spot.y - 2, 5, flame, 1).setDepth(DEPTH.glow);
      const hot = this.scene.add.circle(spot.x, spot.y - 1, 2.5, core, 1).setDepth(DEPTH.glow);
      for (const [target, scale, ms] of [
        [light, light.scale * 1.08, 140],
        [inner, inner.scale * 1.15, 110],
        [fire, 1.35, 90],
        [hot, 1.3, 70],
      ] as const) {
        this.scene.tweens.add({
          targets: target,
          scale,
          duration: ms + Math.random() * 60,
          yoyo: true,
          repeat: -1,
          delay: Math.random() * 200,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /** Little glowing bugs that float around in the dark corridors. */
  addFireflies(spots: readonly Point[]): void {
    const { color } = ATMOSPHERE.fireflies;
    for (const home of spots) {
      const dot = this.glow(home.x, home.y, 9, color, 0.9);
      this.scene.tweens.add({
        targets: dot,
        alpha: 0.1,
        duration: 500 + Math.random() * 1500,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 2000,
        ease: 'Sine.easeInOut',
      });
      this.fireflies.push({
        dot,
        home,
        phase: Math.random() * 10,
        speed: 0.4 + Math.random() * 0.6,
      });
    }
  }

  /** A soft round light: bright in the middle, fading out to nothing. It brightens what's under it. */
  private glow(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Image {
    const key = 'soft-glow';
    const size = 128;
    if (!this.scene.textures.exists(key)) {
      const texture = this.scene.textures.createCanvas(key, size, size);
      if (texture) {
        const ctx = texture.getContext();
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        texture.refresh();
      }
    }
    return this.scene.add
      .image(x, y, key)
      .setScale((radius * 2) / size)
      .setTint(color)
      .setAlpha(alpha)
      .setDepth(DEPTH.glow)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Thin mist and slow cloud shadows drifting over the labyrinth. */
  addMistAndClouds(): void {
    const { width, height } = this.labyrinth;
    const mist = ATMOSPHERE.mist;
    for (let i = 0; i < mist.count; i++) {
      const g = this.scene.add.graphics().setDepth(DEPTH.mist);
      const w = 300 + Math.random() * 300;
      g.fillStyle(mist.color, mist.alpha);
      g.fillEllipse(0, 0, w, 120);
      g.fillEllipse(w * 0.2, -20, w * 0.6, 80);
      g.setPosition(Math.random() * width, Math.random() * height);
      this.drifters.push({ shape: g, speed: 8 + Math.random() * 10, width: w });
    }
    const clouds = ATMOSPHERE.cloudShadows;
    for (let i = 0; i < clouds.count; i++) {
      const g = this.scene.add.graphics().setDepth(DEPTH.mist - 1);
      const w = 400 + Math.random() * 300;
      g.fillStyle(clouds.color, clouds.alpha);
      for (let k = 0; k < 6; k++) {
        g.fillEllipse(
          (k / 5) * w - w / 2,
          (Math.random() - 0.5) * 60,
          160 + Math.random() * 120,
          120 + Math.random() * 80,
        );
      }
      g.setPosition(Math.random() * width, Math.random() * height);
      this.drifters.push({ shape: g, speed: 5 + Math.random() * 6, width: w });
    }
  }

  /** Darker edges around the screen, like an old camera. Stays still when the camera moves. */
  addVignette(depth: number = DEPTH.vignette): void {
    const { size, alpha } = ATMOSPHERE.vignette;
    const g = this.scene.add.graphics().setDepth(depth).setScrollFactor(0);
    const black = 0x000000;
    g.fillGradientStyle(black, black, black, black, alpha, 0, alpha, 0);
    g.fillRect(0, 0, size, GAME_HEIGHT);
    g.fillGradientStyle(black, black, black, black, 0, alpha, 0, alpha);
    g.fillRect(GAME_WIDTH - size, 0, size, GAME_HEIGHT);
    g.fillGradientStyle(black, black, black, black, alpha, alpha, 0, 0);
    g.fillRect(0, 0, GAME_WIDTH, size);
    g.fillGradientStyle(black, black, black, black, 0, 0, alpha, alpha);
    g.fillRect(0, GAME_HEIGHT - size, GAME_WIDTH, size);
  }

  private tick(_time: number, deltaMs: number): void {
    this.time += deltaMs / 1000;
    for (const d of this.drifters) {
      d.shape.x += (d.speed * deltaMs) / 1000;
      if (d.shape.x - d.width / 2 > this.labyrinth.width) d.shape.x = -d.width / 2;
    }
    for (const f of this.fireflies) {
      const t = this.time * f.speed + f.phase;
      f.dot.setPosition(
        f.home.x + Math.sin(t) * 18 + Math.sin(t * 2.3) * 6,
        f.home.y + Math.cos(t * 0.8) * 14 + Math.sin(t * 1.7) * 5,
      );
    }
    if (this.lantern) {
      const p = this.lantern.follow();
      this.lantern.image.setPosition(p.x, p.y);
    }
  }
}
