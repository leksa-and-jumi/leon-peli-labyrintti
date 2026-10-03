import Phaser from 'phaser';
import type { Voice } from '../audio/Sfx';
import { DEPTH, LABYRINTH, PLAYER, type BigFoeKind } from '../config';
import { angleTo, distance, type Point } from '../logic/geometry';
import { healthFraction } from '../logic/health';
import type { Labyrinth } from '../logic/labyrinth';
import { loseLife } from '../logic/lives';
import { canShoot } from '../logic/reload';
import { bodyRadius } from '../logic/topPose';
import { BrokenFigure } from './BrokenFigure';
import { turnTo, walkToward, type Foe } from './Enemy';
import { TopFigure } from './TopFigure';

/**
 * A big enemy that follows the player through the labyrinth and swings when close:
 * the red axe guy or the giant with a club. Has a health bar over his head.
 * `kind` holds his size, speed, lives and so on.
 */
export class Boss implements Foe {
  readonly figure: TopFigure;
  readonly kind: 'boss' | 'giant';
  readonly points: number;
  readonly voice: Voice;
  private readonly healthBar: Phaser.GameObjects.Graphics;
  private chopping = false;
  private alive = true;
  private canChop = true;
  private lives: number;
  private lastChopMs: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labyrinth: Labyrinth,
    private readonly big: BigFoeKind,
    start: Point,
    /** Where the player is now, so he can follow. */
    private readonly getTarget: () => Point,
    /**
     * Called when the axe or club lands on the player. `pushAngle` is the way the
     * swing goes, `damage` how many hearts it takes.
     */
    private readonly onChop: (hit: Point, pushAngle: number, damage: number) => void,
    /** How many hits he takes, if different from `big.lives` (like on Hard). */
    private readonly maxLives: number = big.lives,
  ) {
    this.kind = big.weapon === 'club' ? 'giant' : 'boss';
    this.points = big.points;
    this.voice = big.voice;
    this.lives = maxLives;
    this.figure = new TopFigure(
      scene,
      start.x,
      start.y,
      {
        color: big.color,
        outlineColor: big.outlineColor,
        outlineAlpha: big.outlineAlpha,
        height: big.height,
      },
      angleTo(start, getTarget()),
      'raise',
    );
    this.figure.setWeapon(big.weapon);
    this.healthBar = scene.add.graphics().setDepth(DEPTH.bodies + 1);
    this.drawHealthBar();
  }

  isAlive(): boolean {
    return this.alive;
  }

  stopShooting(): void {
    this.canChop = false;
  }

  takeHit(hit: Point, pushAngle: number): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    this.drawHealthBar();
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.alive = false;
    this.healthBar.destroy();
    const f = this.figure;
    new BrokenFigure(this.scene, this.labyrinth, f, hit, pushAngle);
    f.destroy();
    return true;
  }

  update(deltaMs: number): void {
    if (!this.alive) return;
    const me = this.figure.position();
    const target = this.getTarget();
    const gap = distance(me, target) - this.figure.radius() - bodyRadius(PLAYER.height);
    if (!this.chopping) this.figure.setStance('raise');

    if (gap > this.big.reach) {
      // Still on the way: follow the path, or go straight when he sees you close by
      const next = this.labyrinth.waypoint(me, target, LABYRINTH.tileSize * 4);
      walkToward(this.figure, this.labyrinth, next, this.big.walkSpeed, deltaMs);
      this.figure.setWalking(this.big.stepMs);
      this.drawHealthBar();
      return;
    }

    // Next to the player: face them and chop right away, then again after every pause
    this.figure.setWalking(null);
    turnTo(this.figure, angleTo(me, target), deltaMs);
    this.drawHealthBar();
    if (this.canChop && canShoot(this.scene.time.now, this.lastChopMs, this.big.chopIntervalMs)) {
      this.lastChopMs = this.scene.time.now;
      this.chop();
    }
  }

  /** Swing the axe down, hurt the player, then raise it again. */
  private chop(): void {
    if (!this.alive || !this.canChop) return;
    this.chopping = true;
    this.figure.setStance('chop');
    this.onChop(this.figure.muzzlePosition(), this.figure.getAngle(), this.big.damage);
    this.scene.time.delayedCall(this.big.chopDownMs, () => {
      this.chopping = false;
      if (this.alive) this.figure.setStance('raise');
    });
  }

  private drawHealthBar(): void {
    if (!this.alive) return;
    const { width, height, gap, back, fill } = this.big.healthBar;
    const x = this.figure.getX() - width / 2;
    const y = this.figure.getY() - this.figure.radius() * 1.6 - gap - height;
    this.healthBar.clear();
    this.healthBar.fillStyle(back, 1);
    this.healthBar.fillRect(x, y, width, height);
    this.healthBar.fillStyle(fill, 1);
    this.healthBar.fillRect(x, y, width * healthFraction(this.lives, this.maxLives), height);
  }
}
