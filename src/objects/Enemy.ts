import Phaser from 'phaser';
import type { Voice } from '../audio/Sfx';
import { ENEMY, MOTION, PLAYER, POINTS_PER_KILL } from '../config';
import { angleTo, distance, normalizeAngle, turnToward, type Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { loseLife } from '../logic/lives';
import { canShoot } from '../logic/reload';
import type { EnemyKind } from '../logic/spawn';
import { BrokenFigure } from './BrokenFigure';
import { TopFigure } from './TopFigure';

/** Anything the player can shoot at: a white stick figure, the axe guy or the giant. */
export interface Foe {
  readonly figure: TopFigure;
  readonly kind: EnemyKind;
  /** Points the player gets for breaking it. */
  readonly points: number;
  /** How it sounds when hit or breaking. */
  readonly voice: Voice;
  update(deltaMs: number): void;
  isAlive(): boolean;
  /** Returns true if this hit broke it. `pushAngle` is the way the bullet flew. */
  takeHit(hit: Point, pushAngle: number): boolean;
  /** The player is out of lives: stop attacking. */
  stopShooting(): void;
}

/**
 * Walks toward a spot in the labyrinth, turning to face the way it goes.
 * Shared by all the enemies.
 */
export function walkToward(
  figure: TopFigure,
  labyrinth: Labyrinth,
  goal: Point,
  speed: number,
  deltaMs: number,
): void {
  const me = figure.position();
  const d = distance(me, goal);
  if (d < 1) return;
  const step = Math.min(d, (speed * deltaMs) / 1000);
  const dx = ((goal.x - me.x) / d) * step;
  const dy = ((goal.y - me.y) / d) * step;
  figure.setPosition(labyrinth.move(me, figure.radius(), dx, dy));
  turnTo(figure, angleTo(me, goal), deltaMs);
}

/** Turns smoothly toward an angle. */
export function turnTo(figure: TopFigure, angle: number, deltaMs: number): void {
  figure.setAngle(turnToward(figure.getAngle(), angle, (MOTION.turnSpeed * deltaMs) / 1000));
}

/**
 * A white stick figure that hunts the player through the labyrinth. It follows
 * the way to the player around the walls, and when it sees the player it
 * turns, aims and shoots.
 */
export class Enemy implements Foe {
  readonly figure: TopFigure;
  readonly kind = 'white';
  readonly points = POINTS_PER_KILL;
  readonly voice = 'white';
  private alive = true;
  private lives: number;
  private canShoot = true;
  /** When it first saw the player this time, or null when it can't see them. */
  private seenSince: number | null = null;
  private lastShotMs: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly labyrinth: Labyrinth,
    start: Point,
    private readonly getTarget: () => Point,
    private readonly onShoot: (muzzle: Point, angle: number) => void,
    /** Hits it takes to break this one (depends on the difficulty). */
    lives: number = ENEMY.lives,
  ) {
    this.lives = lives;
    this.figure = new TopFigure(
      scene,
      start.x,
      start.y,
      {
        color: ENEMY.color,
        outlineColor: ENEMY.outlineColor,
        outlineAlpha: ENEMY.outlineAlpha,
      },
      angleTo(start, getTarget()),
    );
  }

  stopShooting(): void {
    this.canShoot = false;
  }

  isAlive(): boolean {
    return this.alive;
  }

  /**
   * Hit by a bullet: blink red, or break in two when it was the last life.
   * Returns true if it broke.
   */
  takeHit(hit: Point, pushAngle: number): boolean {
    if (!this.alive) return false;
    this.lives = loseLife(this.lives);
    // Being shot makes it notice where you are
    this.seenSince ??= this.scene.time.now;
    if (this.lives > 0) {
      this.figure.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
      return false;
    }
    this.alive = false;
    const f = this.figure;
    new BrokenFigure(this.scene, this.labyrinth, f, hit, pushAngle);
    f.destroy();
    return true;
  }

  update(deltaMs: number): void {
    if (!this.alive) return;
    const now = this.scene.time.now;
    const me = this.figure.position();
    const target = this.getTarget();
    const d = distance(me, target);
    const sees = d < ENEMY.sightRange && this.labyrinth.canSee(me, target);

    if (!sees) {
      // Follow the way through the labyrinth
      this.seenSince = null;
      const next = this.labyrinth.waypoint(me, target, 0);
      walkToward(this.figure, this.labyrinth, next, ENEMY.walkSpeed, deltaMs);
      this.figure.setWalking(ENEMY.stepMs);
      return;
    }

    // In sight: aim, come a bit closer, and shoot
    this.seenSince ??= now;
    const aim = angleTo(me, target);
    if (d > ENEMY.keepAway) {
      walkToward(this.figure, this.labyrinth, target, ENEMY.walkSpeed, deltaMs);
      this.figure.setWalking(ENEMY.stepMs);
    } else {
      this.figure.setWalking(null);
    }
    turnTo(this.figure, aim, deltaMs);

    const aimed = Math.abs(normalizeAngle(aim - this.figure.getAngle())) < 0.15;
    const ready =
      now - this.seenSince >= ENEMY.firstShotMs &&
      canShoot(now, this.lastShotMs, ENEMY.shootIntervalMs);
    if (this.canShoot && aimed && ready) {
      this.lastShotMs = now;
      this.onShoot(this.figure.muzzlePosition(), this.figure.getAngle());
    }
  }
}
