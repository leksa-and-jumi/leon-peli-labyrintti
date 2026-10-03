import Phaser from 'phaser';
import { BOSS, BULLET, DEMO, DEPTH, ENEMY, LABYRINTH, OUTFITS, PLAYER } from '../config';
import { flyBullet, makeBullet, type Bullet } from '../logic/bullets';
import { angleTo, distance, normalizeAngle, type Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { cellCenterTile, type Tile } from '../logic/maze';
import { pickSpawnTile } from '../logic/spawn';
import { Boss } from './Boss';
import { Enemy, turnTo, type Foe } from './Enemy';
import { GunEffects } from './GunEffects';
import { TopFigure } from './TopFigure';
import { buildWorld } from './World';

/**
 * The battle behind the start menu, like a video of the game: a soldier in camo
 * stands in the middle of a labyrinth and shoots the white stick figures (and
 * sometimes a red axe guy) that come at him, while explosions flash nearby.
 * Nobody can hurt the soldier here.
 */
export class DemoBattle {
  private readonly labyrinth: Labyrinth;
  private readonly rooms: Tile[];
  private readonly hero: TopFigure;
  private readonly fx: GunEffects;
  private foes: Foe[] = [];
  private spawned = 0;
  private heroBullets: Bullet[] = [];
  private foeBullets: Bullet[] = [];
  private lastShotMs = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const world = buildWorld(scene, DEMO, Math.random, 'menu');
    this.labyrinth = world.labyrinth;
    this.rooms = world.rooms;
    // The soldier stands in a room on the left, so the menu buttons don't hide him
    const start = this.labyrinth.centerOf(
      cellCenterTile(1, Math.floor(DEMO.cellsY / 2), LABYRINTH.cellTiles),
    );
    this.hero = new TopFigure(scene, start.x, start.y, {
      color: PLAYER.color,
      outlineColor: PLAYER.outlineColor,
      outlineAlpha: PLAYER.outlineAlpha,
      outfit: OUTFITS.camo,
    });
    this.hero.setWeapon('rifle');
    world.atmosphere.addLantern(() => this.hero.position(), 'menu-lantern', 0.7);
    world.atmosphere.addVignette();
    scene.cameras.main.centerOn(start.x + DEMO.heroScreenX, start.y);
    this.fx = new GunEffects(scene, (x, y) => this.labyrinth.isWallAt({ x, y }));
    this.labyrinth.setTarget(start);

    for (let i = 0; i < DEMO.together; i++) {
      scene.time.delayedCall(i * DEMO.respawnMs, () => {
        this.spawn();
      });
    }
    scene.time.addEvent({
      delay: DEMO.explosionEveryMs,
      loop: true,
      callback: () => {
        this.explosion();
      },
    });
    scene.events.on('update', this.tick, this);
    scene.events.once('shutdown', () => {
      scene.events.off('update', this.tick, this);
    });
  }

  private spawn(): void {
    const tile = pickSpawnTile(
      this.rooms,
      (t) => this.labyrinth.stepsTo(t),
      () => false,
      8,
      Math.random,
    );
    if (!tile) return;
    const at = this.labyrinth.centerOf(tile);
    const target = (): Point => this.hero.position();
    this.spawned += 1;
    if (this.spawned % DEMO.bossEvery === 0) {
      this.foes.push(
        new Boss(
          this.scene,
          this.labyrinth,
          BOSS,
          at,
          target,
          () => {
            // The axe never hurts the soldier in the video
          },
          DEMO.bossLives,
        ),
      );
      return;
    }
    const white = new Enemy(this.scene, this.labyrinth, at, target, (muzzle, angle) => {
      this.foeBullets.push(makeBullet(muzzle, angle));
      this.fx.shot(muzzle, white.figure.handPosition(), angle);
    });
    this.foes.push(white);
  }

  private tick(_time: number, deltaMs: number): void {
    for (const foe of this.foes) foe.update(deltaMs);
    const hero = this.hero.position();

    // The soldier turns to the closest enemy he can see and shoots
    const visible = this.foes
      .filter((f) => f.isAlive() && this.labyrinth.canSee(hero, f.figure.position()))
      .sort((a, b) => distance(hero, a.figure.position()) - distance(hero, b.figure.position()));
    const target = visible[0];
    const now = this.scene.time.now;
    if (target) {
      const aim = angleTo(hero, target.figure.position());
      turnTo(this.hero, aim, deltaMs);
      const aimed = Math.abs(normalizeAngle(aim - this.hero.getAngle())) < 0.1;
      if (aimed && now - this.lastShotMs > DEMO.shootEveryMs) {
        this.lastShotMs = now;
        const muzzle = this.hero.muzzlePosition();
        this.heroBullets.push(makeBullet(muzzle, this.hero.getAngle()));
        this.fx.shot(muzzle, this.hero.handPosition(), this.hero.getAngle());
      }
    }

    const wallHit = (a: Point, b: Point): Point | null => this.labyrinth.wallHit(a, b);
    const live = this.foes.filter((f) => f.isAlive());
    const targets = live.map((f) => ({ center: f.figure.position(), radius: f.figure.radius() }));
    this.heroBullets = this.heroBullets.flatMap((b) => {
      const result = flyBullet(b, BULLET.speed, deltaMs, BULLET.range, wallHit, targets);
      if (result.kind === 'flying') return [result.bullet];
      if (result.kind === 'wall') this.fx.impact(result.at, Math.atan2(b.dy, b.dx));
      if (result.kind === 'hit') {
        const foe = live[result.target];
        if (foe?.takeHit(foe.figure.position(), Math.atan2(b.dy, b.dx))) {
          this.scene.time.delayedCall(DEMO.respawnMs, () => {
            this.spawn();
          });
        }
      }
      return [];
    });
    // The white ones' bullets just disappear before they reach the soldier
    const shield = [{ center: hero, radius: this.hero.radius() + 6 }];
    this.foeBullets = this.foeBullets.flatMap((b) => {
      const result = flyBullet(b, ENEMY.bulletSpeed, deltaMs, BULLET.range, wallHit, shield);
      if (result.kind === 'flying') return [result.bullet];
      if (result.kind === 'wall') this.fx.impact(result.at, Math.atan2(b.dy, b.dx));
      return [];
    });
    this.foes = this.foes.filter((f) => f.isAlive());
    this.fx.update(deltaMs, [...this.heroBullets, ...this.foeBullets]);
  }

  /** A flash and a cloud of smoke somewhere in the labyrinth nearby. */
  private explosion(): void {
    const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
    if (!room) return;
    const { x, y } = this.labyrinth.centerOf(room);
    const flash = this.scene.add.circle(x, y, 8, 0xffe08a, 0.9).setDepth(DEPTH.glow);
    const fire = this.scene.add
      .circle(x, y, 14, 0xff7a1a, 0.6)
      .setDepth(DEPTH.glow)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: [flash, fire],
      scale: 5,
      alpha: 0,
      duration: 550,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy();
        fire.destroy();
      },
    });
    for (let i = 0; i < 6; i++) {
      const smoke = this.scene.add.circle(x, y, 10, 0x3a3340, 0.5).setDepth(DEPTH.mist);
      this.scene.tweens.add({
        targets: smoke,
        x: x + (Math.random() - 0.5) * 90,
        y: y + (Math.random() - 0.5) * 90,
        scale: 3 + Math.random() * 2,
        alpha: 0,
        duration: 1800 + Math.random() * 800,
        delay: i * 80,
        ease: 'Sine.easeOut',
        onComplete: () => {
          smoke.destroy();
        },
      });
    }
  }
}
