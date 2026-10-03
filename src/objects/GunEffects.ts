import Phaser from 'phaser';
import { DEPTH, GUN_FX } from '../config';
import { bounceOffWalls, landOnFloor, stepFlyer, type Flyer } from '../logic/blood';
import { bulletAngle, type Bullet } from '../logic/bullets';
import { add, fromAngle, rotate, type Point } from '../logic/geometry';

/** Shells are drawn a bit higher on the screen the higher they fly. */
const HEIGHT_ON_SCREEN = 0.6;

interface Shell {
  drop: Flyer;
  shape: Phaser.GameObjects.Rectangle;
  spin: number;
  resting: boolean;
  /** When to start fading away (scene time, ms). */
  fadeAt: number;
}

/**
 * Everything that makes shooting look real: a bright muzzle flash with a glow,
 * a puff of smoke, glowing bullet trails, brass shells that fly out of the gun,
 * bounce on the stones and lie there, and sparks and dust where bullets hit a wall.
 */
export class GunEffects {
  private readonly shells: Shell[] = [];
  private readonly trails: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Is there a wall at this spot? Shells bounce off walls. */
    private readonly isWall: (x: number, y: number) => boolean,
  ) {
    this.trails = scene.add.graphics().setDepth(DEPTH.glow);
  }

  /** Flash, smoke and a flying shell for one shot. */
  shot(muzzle: Point, hand: Point, angle: number): void {
    this.flash(muzzle, angle);
    this.smoke(muzzle, angle);
    this.ejectShell(hand, angle);
  }

  /** A star-shaped burst of fire pointing forward, with a soft glow around it. */
  private flash(at: Point, angle: number): void {
    const { glowRadius, length, durationMs } = GUN_FX.flash;
    const g = this.scene.add.graphics({ x: at.x, y: at.y }).setRotation(angle).setDepth(DEPTH.glow);
    g.fillStyle(GUN_FX.flash.glow, 0.25);
    g.fillCircle(0, 0, glowRadius);
    g.fillStyle(GUN_FX.flash.outer, 0.9);
    g.fillTriangle(0, -6, 0, 6, length, 0);
    g.fillTriangle(0, 0, length * 0.4, -9, length * 0.5, 0);
    g.fillTriangle(0, 0, length * 0.4, 9, length * 0.5, 0);
    g.fillStyle(GUN_FX.flash.inner, 1);
    g.fillCircle(3, 0, 4);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.3,
      duration: durationMs,
      onComplete: () => {
        g.destroy();
      },
    });
  }

  /** Grey smoke that drifts forward and spreads out. */
  private smoke(at: Point, angle: number): void {
    const forward = fromAngle(angle);
    for (let i = 0; i < GUN_FX.smoke.puffs; i++) {
      const puff = this.scene.add
        .circle(
          at.x + forward.x * i * 4,
          at.y + forward.y * i * 4,
          3 + Math.random() * 3,
          GUN_FX.smoke.color,
          GUN_FX.smoke.alpha,
        )
        .setDepth(DEPTH.effects);
      const drift = 10 + Math.random() * 20;
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + forward.x * drift + (Math.random() - 0.5) * 16,
        y: puff.y + forward.y * drift + (Math.random() - 0.5) * 16,
        scale: 3 + Math.random() * 2,
        alpha: 0,
        duration: GUN_FX.smoke.ms * (0.7 + Math.random() * 0.6),
        ease: 'Sine.easeOut',
        onComplete: () => {
          puff.destroy();
        },
      });
    }
  }

  /** A brass shell pops out of the right side of the gun, a bit backwards and up. */
  private ejectShell(at: Point, angle: number): void {
    const { width, height, color } = GUN_FX.shell;
    const shape = this.scene.add
      .rectangle(at.x, at.y, width, height, color)
      .setDepth(DEPTH.effects);
    const out = rotate({ x: -(20 + Math.random() * 40), y: 70 + Math.random() * 80 }, angle);
    this.shells.push({
      shape,
      drop: { x: at.x, y: at.y, z: 12, vx: out.x, vy: out.y, vz: 120 + Math.random() * 100 },
      spin: (Math.random() - 0.5) * 30,
      resting: false,
      fadeAt: this.scene.time.now + GUN_FX.shell.lieMs,
    });
    // Not too many shells lying around at once
    while (this.shells.length > GUN_FX.shell.max) {
      this.shells.shift()?.shape.destroy();
    }
  }

  /** A bullet hits a stone wall: sparks fly back, dust puffs and a dark mark stays. */
  impact(at: Point, bulletDirection: number): void {
    const { sparks, spark, dust, mark, markMs } = GUN_FX.impact;
    const back = bulletDirection + Math.PI;
    const spot = add(at, fromAngle(back, 3));
    for (let i = 0; i < sparks; i++) {
      const a = back + (Math.random() - 0.5) * 2.2;
      const d = 12 + Math.random() * 26;
      const end = add(spot, fromAngle(a, d));
      const line = this.scene.add
        .line(
          0,
          0,
          spot.x,
          spot.y,
          spot.x + (end.x - spot.x) * 0.3,
          spot.y + (end.y - spot.y) * 0.3,
          spark,
        )
        .setOrigin(0, 0)
        .setLineWidth(1.5)
        .setDepth(DEPTH.glow);
      this.scene.tweens.add({
        targets: line,
        x: end.x - spot.x,
        y: end.y - spot.y,
        alpha: 0,
        duration: 160 + Math.random() * 140,
        ease: 'Quad.easeOut',
        onComplete: () => {
          line.destroy();
        },
      });
    }
    for (let i = 0; i < 3; i++) {
      const puff = this.scene.add
        .circle(spot.x, spot.y, 3 + Math.random() * 2, dust, 0.45)
        .setDepth(DEPTH.effects);
      const d = add(spot, fromAngle(back + (Math.random() - 0.5) * 1.5, 10 + Math.random() * 12));
      this.scene.tweens.add({
        targets: puff,
        x: d.x,
        y: d.y,
        scale: 3,
        alpha: 0,
        duration: 600 + Math.random() * 300,
        ease: 'Sine.easeOut',
        onComplete: () => {
          puff.destroy();
        },
      });
    }
    const hole = this.scene.add.circle(at.x, at.y, 2.5, mark, 0.9).setDepth(DEPTH.floorMarks);
    this.scene.tweens.add({
      targets: hole,
      alpha: 0,
      delay: markMs,
      duration: 1000,
      onComplete: () => {
        hole.destroy();
      },
    });
  }

  /** Every frame: move the shells and draw the bullets' glowing trails. */
  update(deltaMs: number, bullets: readonly Bullet[]): void {
    const now = this.scene.time.now;
    const { gravity, drag, bounciness, minBounce, fadeMs } = GUN_FX.shell;
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      if (!s) continue;
      if (now >= s.fadeAt) {
        s.shape.setAlpha(s.shape.alpha - deltaMs / fadeMs);
        if (s.shape.alpha <= 0) {
          s.shape.destroy();
          this.shells.splice(i, 1);
          continue;
        }
      }
      if (s.resting) continue;
      const moved = bounceOffWalls(
        s.drop,
        stepFlyer(s.drop, deltaMs, gravity, drag),
        this.isWall,
        bounciness,
      );
      const landed = landOnFloor(moved, bounciness, minBounce);
      s.drop = landed.flyer;
      s.resting = landed.resting;
      s.shape.setPosition(s.drop.x, s.drop.y - s.drop.z * HEIGHT_ON_SCREEN);
      s.shape.rotation += s.spin * (deltaMs / 1000);
      if (s.resting) s.shape.setDepth(DEPTH.floorMarks);
    }

    // Each bullet: a fading streak behind it and a bright hot tip
    const { length, color, tip, width } = GUN_FX.trail;
    this.trails.clear();
    for (const b of bullets) {
      const backX = -Math.cos(bulletAngle(b));
      const backY = -Math.sin(bulletAngle(b));
      const tail = Math.min(length, b.traveled);
      const steps = 6;
      for (let k = 0; k < steps; k++) {
        const a = (tail * k) / steps;
        const c = (tail * (k + 1)) / steps;
        this.trails.lineStyle(width * (1 - k / steps), color, 0.6 * (1 - k / steps));
        this.trails.lineBetween(b.x + backX * a, b.y + backY * a, b.x + backX * c, b.y + backY * c);
      }
      this.trails.fillStyle(tip, 1);
      this.trails.fillCircle(b.x, b.y, width * 0.9);
    }
  }
}
