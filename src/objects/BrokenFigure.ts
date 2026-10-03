import Phaser from 'phaser';
import { BLOOD, BREAK, DEPTH } from '../config';
import { bounceOffWalls, dropShape, landOnFloor, stepFlyer, type Flyer } from '../logic/blood';
import { add, fromAngle, lerpPoint, type Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { lerpTopPose, limpTopPose } from '../logic/topPose';
import { drawFigure, type TopFigure } from './TopFigure';

/** Drops are drawn a bit higher up on the screen the higher they fly, like seen from above at a slant. */
const HEIGHT_ON_SCREEN = 0.6;

/**
 * A stick figure seen from above, broken in two where the bullet hit:
 * the top half with the head and arms is thrown the way the bullet flew and
 * spins, the legs crumple where they stood. Everything goes limp, blood sprays,
 * splats on the stones and pools, and then everything fades away.
 */
export class BrokenFigure {
  /** Blood drops still in the air. They fall every frame until they land. */
  private readonly flying: { drop: Flyer; shape: Phaser.GameObjects.Ellipse }[] = [];
  private bloodOn = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labyrinth: Labyrinth,
    figure: TopFigure,
    hit: Point,
    /** Which way the bullet (or axe) went. The top half flies that way. */
    pushAngle: number,
  ) {
    const pose = figure.pose();
    const look = figure.getLook();
    const weapon = figure.getWeapon();
    const angle = figure.getAngle();
    const start = figure.position();
    const limp = limpTopPose(pose);
    const scale = pose.headRadius / 10;

    // Where the top half lands: thrown forward, but never into a wall
    const wanted = add(start, fromAngle(pushAngle, BREAK.topFly * scale));
    const wall = labyrinth.wallHit(start, wanted);
    const land = wall ? lerpPoint(start, wall, 0.6) : wanted;

    // Blood pools grow where the pieces lie. Made first, so they're under the pieces.
    const pools = [land, start].map((p) => {
      const { width, height, alpha } = BLOOD.pool;
      return scene.add
        .ellipse(p.x, p.y, width * scale, height * scale, BLOOD.dark, alpha)
        .setRotation(Math.random() * Math.PI)
        .setScale(0)
        .setDepth(DEPTH.floorMarks);
    });

    const top = scene.add.graphics({ x: start.x, y: start.y }).setRotation(angle);
    top.setDepth(DEPTH.flying);
    const bottom = scene.add.graphics({ x: start.x, y: start.y }).setRotation(angle);
    bottom.setDepth(DEPTH.floorMarks + 1);

    // Arms and legs go limp bit by bit while the pieces fall
    const state = { limp: 0 };
    const redraw = (): void => {
      const now = lerpTopPose(pose, limp, state.limp);
      top.clear();
      drawFigure(top, now, look, weapon, 'upper');
      bottom.clear();
      drawFigure(bottom, now, look, null, 'lower');
      // Red where it broke
      top.fillStyle(BLOOD.color, 1);
      top.fillCircle(now.leftHip.x * 0.3, 0, 3 * scale);
      bottom.fillStyle(BLOOD.color, 1);
      bottom.fillCircle(now.leftHip.x, 0, 3 * scale);
    };
    redraw();
    scene.tweens.add({
      targets: state,
      limp: 1,
      duration: BREAK.limpMs,
      ease: 'Sine.easeInOut',
      onUpdate: redraw,
    });

    // The top half flies up (looks bigger), spins and lands
    const spin = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.DegToRad(BREAK.topSpin);
    const flight = { t: 0 };
    scene.tweens.add({
      targets: flight,
      t: 1,
      duration: BREAK.topFallMs,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        const p = lerpPoint(start, land, flight.t);
        top.setPosition(p.x, p.y);
        top.setRotation(angle + spin * flight.t);
        top.setScale(1 + BREAK.topArcScale * Math.sin(Math.PI * flight.t));
      },
      onComplete: () => {
        top.setDepth(DEPTH.floorMarks + 2);
        this.settle(top, spin);
        this.growPool(pools[0]);
      },
    });

    // The legs crumple and twist a little where they stood
    scene.tweens.add({
      targets: bottom,
      rotation: angle + Phaser.Math.DegToRad(BREAK.bottomTwist) * Math.sign(spin),
      duration: BREAK.bottomFallMs,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.settle(bottom, -spin);
        this.growPool(pools[1]);
      },
    });

    // Blood: a big spray, more squirts, and drips from the top half while it flies
    const made = this.sprayBlood(hit, pushAngle, BLOOD.drops);
    for (let i = 1; i <= BLOOD.squirts; i++) {
      scene.time.delayedCall(i * BLOOD.squirtEveryMs, () => {
        made.push(...this.sprayBlood(hit, pushAngle, BLOOD.squirtDrops));
      });
    }
    const dripper = scene.time.addEvent({
      delay: BLOOD.dripEveryMs,
      repeat: Math.floor(BLOOD.dripForMs / BLOOD.dripEveryMs),
      callback: () => {
        if (!top.active) return;
        made.push(...this.sprayBlood({ x: top.x, y: top.y }, pushAngle, BLOOD.dripDrops, 0.25));
      },
    });

    scene.time.delayedCall(BREAK.fadeDelayMs, () => {
      dripper.remove();
      this.stopBlood();
      const all = [top, bottom, ...pools, ...made];
      scene.tweens.add({
        targets: all,
        alpha: 0,
        duration: BREAK.fadeMs,
        onComplete: () => {
          all.forEach((o) => {
            o.destroy();
          });
        },
      });
    });
  }

  /** A soft landing: rocks back a little and lies still. */
  private settle(g: Phaser.GameObjects.Graphics, spin: number): void {
    this.scene.tweens.add({
      targets: g,
      angle: g.angle - Math.sign(spin) * BREAK.settleRock,
      duration: BREAK.settleMs,
      yoyo: true,
      ease: 'Sine.easeOut',
    });
  }

  private growPool(pool: Phaser.GameObjects.Ellipse | undefined): void {
    if (!pool) return;
    this.scene.tweens.add({
      targets: pool,
      scale: 1,
      duration: BLOOD.pool.growMs,
      ease: 'Sine.easeOut',
    });
  }

  /** Every frame: move the flying drops, stretch them the way they fly, splat them on landing. */
  private updateBlood(_time: number, deltaMs: number): void {
    const blocked = (x: number, y: number): boolean => this.labyrinth.isWallAt({ x, y });
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      if (!f) continue;
      if (!f.shape.active) {
        this.flying.splice(i, 1);
        continue;
      }
      const moved = stepFlyer(f.drop, deltaMs, BLOOD.gravity, BLOOD.drag);
      const bounced = bounceOffWalls(f.drop, moved, blocked, 0);
      // A drop that hit a wall slides down it and lands at its foot
      const hitWall = bounced.vx !== moved.vx || bounced.vy !== moved.vy;
      f.drop = hitWall ? { ...bounced, vx: 0, vy: 0 } : bounced;
      if (landOnFloor(f.drop, 0, 1).resting) {
        // Splat: flat and dark on the stones
        f.shape
          .setPosition(f.drop.x, f.drop.y)
          .setRotation(Math.random() * Math.PI)
          .setScale(1.4 + Math.random(), 0.6 + Math.random() * 0.4)
          .setFillStyle(BLOOD.dark)
          .setDepth(DEPTH.floorMarks);
        this.flying.splice(i, 1);
        continue;
      }
      const { angle, stretch } = dropShape(
        f.drop.vx,
        f.drop.vy - f.drop.vz * HEIGHT_ON_SCREEN,
        BLOOD.maxStretch,
      );
      f.shape
        .setPosition(f.drop.x, f.drop.y - f.drop.z * HEIGHT_ON_SCREEN)
        .setRotation(angle)
        .setScale(stretch, 0.8);
    }
  }

  private startBlood(): void {
    this.bloodOn = true;
    this.scene.events.on('update', this.updateBlood, this);
    this.scene.events.once('shutdown', this.stopBlood, this);
  }

  private stopBlood(): void {
    if (!this.bloodOn) return;
    this.bloodOn = false;
    this.scene.events.off('update', this.updateBlood, this);
    this.scene.events.off('shutdown', this.stopBlood, this);
  }

  /**
   * Blood shoots out of `from`: drops fly mostly the way the bullet went, fall
   * and splat on the floor, and a fine red mist puffs out and fades.
   * `power` below 1 makes small drips.
   */
  private sprayBlood(
    from: Point,
    pushAngle: number,
    count: number,
    power = 1,
  ): Phaser.GameObjects.Shape[] {
    const scene = this.scene;
    if (!this.bloodOn) this.startBlood();
    const made: Phaser.GameObjects.Shape[] = [];
    for (let i = 0; i < count; i++) {
      const radius = BLOOD.minRadius + Math.random() * (BLOOD.maxRadius - BLOOD.minRadius);
      // Darker and lighter reds, like real blood
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(BLOOD.color),
        Phaser.Display.Color.ValueToColor(BLOOD.dark),
        100,
        Math.random() * 70,
      );
      const shape = scene.add
        .ellipse(
          from.x,
          from.y,
          radius * 2,
          radius * 2,
          Phaser.Display.Color.GetColor(color.r, color.g, color.b),
        )
        .setDepth(DEPTH.effects);
      made.push(shape);
      // Most drops fly forward (the way the bullet went), a few backward
      const forward = Math.random() < 0.8;
      const spread = (Math.random() - 0.5) * (forward ? 1.3 : 2);
      const angle = pushAngle + (forward ? 0 : Math.PI) + spread;
      const speed = (40 + Math.random() * BLOOD.speed) * power;
      this.flying.push({
        shape,
        drop: {
          x: from.x,
          y: from.y,
          z: 14 + Math.random() * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: Math.random() * BLOOD.upSpeed * power,
        },
      });
    }
    // Fine mist: lots of tiny see-through drops that puff out and fade fast
    const mistCount = Math.round(BLOOD.mist * power);
    const push = fromAngle(pushAngle);
    for (let i = 0; i < mistCount; i++) {
      const puff = scene.add
        .circle(from.x, from.y, 0.8 + Math.random() * 1.6, BLOOD.color, 0.6)
        .setDepth(DEPTH.effects);
      made.push(puff);
      const a = Math.random() * Math.PI * 2;
      const d = 10 + Math.random() * BLOOD.mistSpread;
      scene.tweens.add({
        targets: puff,
        x: from.x + Math.cos(a) * d + push.x * d * 0.6,
        y: from.y + Math.sin(a) * d + push.y * d * 0.6,
        alpha: 0,
        duration: BLOOD.mistMs * (0.6 + Math.random() * 0.8),
        ease: 'Quad.easeOut',
      });
    }
    return made;
  }
}
