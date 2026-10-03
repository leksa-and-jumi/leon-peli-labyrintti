import Phaser from 'phaser';
import { browserStorage } from '../browserStorage';
import {
  BOSS,
  BULLET,
  COLORS,
  DEPTH,
  DIFFICULTIES,
  DUST,
  ENEMY,
  GAME_OVER,
  GAME_WIDTH,
  GIANT,
  HINT,
  LABYRINTH,
  MINIMAP,
  OUTFITS,
  PLAYER,
  RELOAD_BAR,
  SOUND,
  START_POINTS,
  WEAPONS,
  type OutfitId,
} from '../config';
import { flyBullet, makeBullet, type Bullet } from '../logic/bullets';
import { enemyFor, type Difficulty } from '../logic/difficulty';
import { add, angleTo, distance, fromAngle, type Point } from '../logic/geometry';
import type { Labyrinth } from '../logic/labyrinth';
import { formatLives, loseLife } from '../logic/lives';
import type { Tile } from '../logic/maze';
import { moveVector } from '../logic/move';
import { createRandom } from '../logic/random';
import { canShoot, reloadProgress } from '../logic/reload';
import { loadSave, recordScore, writeSave } from '../logic/save';
import { addPoints, formatBest, formatScore } from '../logic/score';
import { buy, type ShopItem } from '../logic/shop';
import { pickSpawnTile } from '../logic/spawn';
import { Sfx } from '../audio/Sfx';
import { Boss } from '../objects/Boss';
import { BrokenFigure } from '../objects/BrokenFigure';
import { Enemy, turnTo, type Foe } from '../objects/Enemy';
import { showGameOverSign } from '../objects/GameOverSign';
import { GunEffects } from '../objects/GunEffects';
import { Minimap } from '../objects/Minimap';
import { TopFigure } from '../objects/TopFigure';
import { buildWorld } from '../objects/World';
import type { ShopData } from './ShopScene';

/** Leo's labyrinth: the black stick figure hunted by the white ones in the dark stone maze. */
export class MainScene extends Phaser.Scene {
  private labyrinth!: Labyrinth;
  private rooms: Tile[] = [];
  private random: () => number = Math.random;
  private player!: TopFigure;
  private foes: Foe[] = [];
  private enemyCount = 0;
  /** Enemies on their way (waiting for their turn to appear). */
  private pendingSpawns = 0;
  /** Each move has two keys: letters on the left hand, arrows on the right. */
  private upKeys: Phaser.Input.Keyboard.Key[] = [];
  private downKeys: Phaser.Input.Keyboard.Key[] = [];
  private leftKeys: Phaser.Input.Keyboard.Key[] = [];
  private rightKeys: Phaser.Input.Keyboard.Key[] = [];
  /** Once the mouse has moved, the player looks at the mouse. Before that, the way they walk. */
  private usedMouse = false;
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private gunFx!: GunEffects;
  private minimap!: Minimap;
  /** What the camera follows: the player, softly. */
  private readonly cameraTarget = { x: 0, y: 0 };
  private lives = 0;
  private livesText!: Phaser.GameObjects.Text;
  private playerAlive = true;
  private lastShotMs: number | null = null;
  private score = 0;
  private shopClosedKeyTime: number | null = null;
  private sfx!: Sfx;
  private rifleUpgrade = false;
  private muted = false;
  private ownedOutfits = new Set<OutfitId>(['black']);
  private wornOutfit: OutfitId = 'black';
  private difficulty: Difficulty = 'normal';
  /** Points earned this game (spending in the shop doesn't lower it). This is what records count. */
  private earned = 0;
  private bestBefore = 0;
  private bestText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private reloadBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainScene');
  }

  create(data: { difficulty?: Difficulty } = {}): void {
    this.difficulty = data.difficulty ?? 'normal';
    // Start fresh (also when playing again)
    this.foes = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.lives = PLAYER.lives;
    this.playerAlive = true;
    this.lastShotMs = null;
    this.score = START_POINTS;
    this.earned = 0;
    this.enemyCount = 0;
    this.pendingSpawns = 0;
    this.usedMouse = false;
    this.ownedOutfits = new Set<OutfitId>(['black']);
    this.wornOutfit = 'black';

    const save = loadSave(browserStorage());
    this.muted = save.muted;
    this.sfx = new Sfx(this, this.muted);

    // A brand new labyrinth every game
    this.random = createRandom(Math.floor(Math.random() * 2 ** 31));
    const world = buildWorld(this, LABYRINTH, this.random, 'main');
    this.labyrinth = world.labyrinth;
    this.rooms = world.rooms;

    this.player = new TopFigure(
      this,
      world.start.x,
      world.start.y,
      {
        color: PLAYER.color,
        outlineColor: PLAYER.outlineColor,
        outlineAlpha: PLAYER.outlineAlpha,
      },
      -Math.PI / 2,
    );
    this.player.setOnStep(() => {
      this.sfx.footstep();
      this.dustAt(this.player.position());
    });
    // A bought rifle is saved, so it's still yours after dying
    if (save.rifle) this.player.setWeapon('rifle');
    this.rifleUpgrade = save.rifleUpgrade;

    world.atmosphere.addLantern(() => this.player.position(), 'main-lantern');
    world.atmosphere.addVignette();
    this.cameraTarget.x = world.start.x;
    this.cameraTarget.y = world.start.y;
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);

    this.gunFx = new GunEffects(this, (x, y) => this.labyrinth.isWallAt({ x, y }));
    this.addHud(save.best[this.difficulty] ?? 0);
    this.minimap = new Minimap(this, this.labyrinth, 'main-map');
    this.addControls();

    this.labyrinth.setTarget(world.start);
    this.fillUpEnemies(0);
  }

  /** Texts and bars that stay still on the screen while the camera moves. */
  private addHud(best: number): void {
    const fixed = <
      T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
    >(
      o: T,
    ): T => {
      o.setScrollFactor(0);
      o.setDepth(DEPTH.hud);
      return o;
    };
    const shade = { stroke: '#000000', strokeThickness: 4 };
    fixed(this.add.text(16, 16, HINT, { fontSize: '18px', color: COLORS.text, ...shade }));
    fixed(this.add.text(16, RELOAD_BAR.y - 8, '🔫', { fontSize: '20px' }));
    this.reloadBar = fixed(this.add.graphics());
    this.bestBefore = best;
    this.bestText = fixed(
      this.add
        .text(GAME_WIDTH - 16, 52, formatBest(this.bestBefore), {
          fontSize: '16px',
          color: COLORS.text,
          ...shade,
        })
        .setOrigin(1, 0),
    );
    this.scoreText = fixed(
      this.add
        .text(GAME_WIDTH / 2, 16, formatScore(this.score), {
          fontSize: '28px',
          color: COLORS.text,
          fontStyle: 'bold',
          ...shade,
        })
        .setOrigin(0.5, 0),
    );
    this.livesText = fixed(
      this.add
        .text(GAME_WIDTH - 16, 16, formatLives(this.lives, PLAYER.lives), { fontSize: '26px' })
        .setOrigin(1, 0),
    );
  }

  private addControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is not available');
    }
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.upKeys = [keyboard.addKey(KeyCodes.W), keyboard.addKey(KeyCodes.UP)];
    this.downKeys = [keyboard.addKey(KeyCodes.S), keyboard.addKey(KeyCodes.DOWN)];
    this.leftKeys = [keyboard.addKey(KeyCodes.A), keyboard.addKey(KeyCodes.LEFT)];
    this.rightKeys = [keyboard.addKey(KeyCodes.D), keyboard.addKey(KeyCodes.RIGHT)];
    keyboard.on('keydown-M', () => {
      this.toggleSound();
    });
    // Space shoots too, handy on a laptop
    keyboard.addKey(KeyCodes.SPACE).on('down', () => {
      this.tryShoot();
    });
    keyboard.on('keydown-K', (event: KeyboardEvent) => {
      // The same K press that closed the shop must not open it again
      if (event.timeStamp === this.shopClosedKeyTime) return;
      this.openShop();
    });

    this.input.on('pointermove', () => {
      this.usedMouse = true;
    });
    // A mouse click or a tap on the laptop's touchpad shoots (not the right button)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) return;
      this.usedMouse = true;
      this.tryShoot();
    });
  }

  private tryShoot(): void {
    if (!this.playerAlive) return;
    // The gun has to reload between shots
    if (!canShoot(this.time.now, this.lastShotMs, this.cooldownMs())) return;
    this.lastShotMs = this.time.now;
    this.shoot(this.player, 'player');
  }

  update(_time: number, delta: number): void {
    if (this.playerAlive) {
      this.movePlayer(delta);
      this.labyrinth.setTarget(this.player.position());
    }
    for (const foe of this.foes) foe.update(delta);
    this.keepApart();
    this.flyBullets(delta);
    this.foes = this.foes.filter((f) => f.isAlive());

    this.gunFx.update(delta, [...this.playerBullets, ...this.enemyBullets]);
    this.drawReloadBar();
    const p = this.player.position();
    this.cameraTarget.x = p.x;
    this.cameraTarget.y = p.y;
    this.minimap.update(
      this.playerAlive ? p : null,
      this.foes.map((f) => ({
        at: f.figure.position(),
        color: f.kind === 'white' ? MINIMAP.enemy : MINIMAP.boss,
        size: f.kind === 'white' ? 2.5 : 3.5,
      })),
    );
  }

  /** WASD or the arrows walk in 8 directions. The player looks at the mouse, or the way they walk. */
  private movePlayer(delta: number): void {
    const isDown = (keys: Phaser.Input.Keyboard.Key[]): boolean => keys.some((k) => k.isDown);
    const v = moveVector(
      isDown(this.leftKeys),
      isDown(this.rightKeys),
      isDown(this.upKeys),
      isDown(this.downKeys),
    );
    const step = (PLAYER.walkSpeed * delta) / 1000;
    const moving = v.x !== 0 || v.y !== 0;
    this.player.setPosition(
      this.labyrinth.move(this.player.position(), this.player.radius(), v.x * step, v.y * step),
    );
    this.player.setWalking(moving ? PLAYER.stepMs : null);

    if (this.usedMouse) {
      const pointer = this.input.activePointer;
      const aim = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (distance(aim, this.player.position()) > 4) {
        this.player.setAngle(angleTo(this.player.position(), aim));
      }
    } else if (moving) {
      turnTo(this.player, Math.atan2(v.y, v.x), delta * 2);
    }
  }

  /** Bodies push each other apart, so nobody walks through anybody. */
  private keepApart(): void {
    const bodies = this.foes.map((f) => f.figure);
    if (this.playerAlive) bodies.push(this.player);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        if (!a || !b) continue;
        const d = distance(a.position(), b.position());
        const overlap = a.radius() + b.radius() - d;
        if (overlap <= 0 || d === 0) continue;
        const angle = angleTo(a.position(), b.position());
        const push = fromAngle(angle, overlap / 2);
        a.setPosition(this.labyrinth.move(a.position(), a.radius(), -push.x, -push.y));
        b.setPosition(this.labyrinth.move(b.position(), b.radius(), push.x, push.y));
      }
    }
  }

  /** Bullets fly: they break enemies, hurt the player, or chip the walls. */
  private flyBullets(delta: number): void {
    const wallHit = (a: Point, b: Point): Point | null => this.labyrinth.wallHit(a, b);

    const live = this.foes.filter((f) => f.isAlive());
    const foeTargets = live.map((f) => ({
      center: f.figure.position(),
      radius: f.figure.radius(),
    }));
    this.playerBullets = this.playerBullets.flatMap((b) => {
      const result = flyBullet(b, BULLET.speed, delta, BULLET.range, wallHit, foeTargets);
      if (result.kind === 'flying') return [result.bullet];
      if (result.kind === 'wall') this.hitWall(result.at, b);
      if (result.kind === 'hit') {
        const foe = live[result.target];
        if (foe) this.hitFoe(foe, b);
      }
      return [];
    });

    const playerTargets = this.playerAlive
      ? [{ center: this.player.position(), radius: this.player.radius() }]
      : [];
    this.enemyBullets = this.enemyBullets.flatMap((b) => {
      const result = flyBullet(b, ENEMY.bulletSpeed, delta, BULLET.range, wallHit, playerTargets);
      if (result.kind === 'flying') return [result.bullet];
      if (result.kind === 'wall') this.hitWall(result.at, b);
      if (result.kind === 'hit') {
        const angle = Math.atan2(b.dy, b.dx);
        this.hurtPlayer(add(this.player.position(), fromAngle(angle + Math.PI, 6)), angle);
      }
      return [];
    });
  }

  private hitWall(at: Point, bullet: Bullet): void {
    this.gunFx.impact(at, Math.atan2(bullet.dy, bullet.dx));
    if (distance(at, this.player.position()) < SOUND.hearingDistance) this.sfx.ricochet();
  }

  /** A bullet hit an enemy: it blinks, or breaks in two on its last life. */
  private hitFoe(foe: Foe, bullet: Bullet): void {
    const angle = Math.atan2(bullet.dy, bullet.dx);
    const hit = add(foe.figure.position(), fromAngle(angle + Math.PI, foe.figure.radius() * 0.4));
    const broke = foe.takeHit(hit, angle);
    if (!broke) {
      this.sfx.hurt(foe.voice);
      return;
    }
    this.sfx.scream(foe.voice);
    this.score = addPoints(this.score, foe.points);
    this.scoreText.setText(formatScore(this.score));
    this.earned = addPoints(this.earned, foe.points);
    this.bestText.setText(formatBest(Math.max(this.bestBefore, this.earned)));
    this.fillUpEnemies(ENEMY.respawnMs);
  }

  /** M turns all sounds off and on. The choice is saved. */
  private toggleSound(): void {
    this.muted = !this.muted;
    this.sfx.setMuted(this.muted);
    writeSave(browserStorage(), { ...loadSave(browserStorage()), muted: this.muted });
  }

  /** How long the gun in the hand reloads. The rifle upgrade makes the rifle much faster. */
  private cooldownMs(): number {
    const weapon = this.player.getWeapon();
    if (weapon === 'rifle' && this.rifleUpgrade) return WEAPONS.rifle.upgradedCooldownMs;
    return WEAPONS[weapon].cooldownMs;
  }

  private drawReloadBar(): void {
    const { x, y, width, height, empty, filling, ready } = RELOAD_BAR;
    const progress = reloadProgress(this.time.now, this.lastShotMs, this.cooldownMs());
    this.reloadBar.clear();
    this.reloadBar.fillStyle(empty, 1);
    this.reloadBar.fillRect(x, y, width, height);
    this.reloadBar.fillStyle(progress >= 1 ? ready : filling, 1);
    this.reloadBar.fillRect(x, y, width * progress, height);
  }

  /** K opens the shop. The game waits until the shop closes. */
  private openShop(): void {
    if (!this.playerAlive) return;
    const data: ShopData = {
      getScore: () => this.score,
      owns: (item) => this.owns(item),
      hasNeeded: (item) => this.hasNeeded(item),
      purchase: (item) => this.purchase(item),
      wears: (item) => item.outfit === this.wornOutfit,
      wear: (item) => {
        this.wear(item);
      },
      onClose: (keyTime) => {
        this.shopClosedKeyTime = keyTime ?? null;
        this.scene.resume();
      },
    };
    this.scene.launch('ShopScene', data);
    this.scene.pause();
  }

  private purchase(item: ShopItem): boolean {
    const result = buy(this.score, item, this.owns(item), this.hasNeeded(item));
    if (!result.ok) return false;
    this.score = result.score;
    this.scoreText.setText(formatScore(this.score));
    this.sfx.buy();
    if (item.id === 'life') {
      this.lives += 1;
      this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    }
    if (item.id === 'rifle') {
      this.player.setWeapon('rifle');
      writeSave(browserStorage(), { ...loadSave(browserStorage()), rifle: true });
    }
    if (item.id === 'rifleUpgrade') {
      this.rifleUpgrade = true;
      writeSave(browserStorage(), { ...loadSave(browserStorage()), rifleUpgrade: true });
    }
    const outfit = outfitOf(item);
    if (outfit) {
      this.ownedOutfits.add(outfit);
      this.wear(item);
    }
    return true;
  }

  /** Does the player already have this one-time item? */
  private owns(item: ShopItem): boolean {
    if (item.id === 'rifle') return this.player.getWeapon() === 'rifle';
    if (item.id === 'rifleUpgrade') return this.rifleUpgrade;
    const outfit = outfitOf(item);
    return outfit !== null && this.ownedOutfits.has(outfit);
  }

  /** Does the player have what this item needs first (like the rifle for its upgrade)? */
  private hasNeeded(item: ShopItem): boolean {
    if (item.needs === undefined) return true;
    return this.owns({ ...item, id: item.needs });
  }

  /** Put on clothes the player owns. */
  private wear(item: ShopItem): void {
    const outfit = outfitOf(item);
    if (!outfit || !this.ownedOutfits.has(outfit)) return;
    this.wornOutfit = outfit;
    this.player.setOutfit(OUTFITS[outfit]);
  }

  /**
   * Keep the right number of enemies hunting you (more on harder levels):
   * the first after `firstDelayMs`, the rest a little after each other.
   */
  private fillUpEnemies(firstDelayMs: number): void {
    const together = DIFFICULTIES[this.difficulty].together;
    const missing = together - this.foes.filter((f) => f.isAlive()).length - this.pendingSpawns;
    for (let i = 0; i < missing; i++) {
      this.pendingSpawns += 1;
      this.time.delayedCall(firstDelayMs + i * ENEMY.staggerMs, () => {
        this.pendingSpawns -= 1;
        this.spawnEnemy();
      });
    }
  }

  /**
   * A new enemy appears somewhere far away in the labyrinth, out of sight.
   * Who it is depends on the level: white ones, the axe guy or the giant.
   */
  private spawnEnemy(): void {
    if (!this.playerAlive) return;
    const tile = pickSpawnTile(
      this.rooms,
      (t) => this.labyrinth.stepsTo(t),
      (t) => this.labyrinth.canSee(this.player.position(), this.labyrinth.centerOf(t)),
      ENEMY.spawnDistance,
      this.random,
    );
    if (!tile) return;
    const at = this.labyrinth.centerOf(tile);
    const target = (): Point => this.player.position();
    this.enemyCount += 1;
    const next = enemyFor(DIFFICULTIES[this.difficulty], this.enemyCount);

    let foe: Foe;
    if (next.kind !== 'white') {
      const big = next.kind === 'giant' ? GIANT : BOSS;
      foe = new Boss(
        this,
        this.labyrinth,
        big,
        at,
        target,
        (hit, pushAngle, damage) => {
          this.sfx.chop();
          this.cameras.main.shake(160, 0.008 * damage);
          if (this.playerAlive) this.hurtPlayer(hit, pushAngle, damage);
        },
        next.lives,
      );
    } else {
      const white = new Enemy(
        this,
        this.labyrinth,
        at,
        target,
        () => {
          this.shoot(white.figure, 'enemy');
        },
        next.lives ?? ENEMY.lives,
      );
      foe = white;
    }
    const heavy = foe.kind !== 'white';
    foe.figure.setOnStep(() => {
      const p = foe.figure.position();
      if (distance(p, this.player.position()) > SOUND.hearingDistance) return;
      this.sfx.footstep(heavy, !heavy);
      this.dustAt(p, heavy ? 2 : 1);
    });
    this.foes.push(foe);
  }

  /** A bullet, axe or club hit the player: lose lives, and break on the last one. */
  private hurtPlayer(hit: Point, pushAngle: number, damage = 1): void {
    if (!this.playerAlive) return;
    this.lives = loseLife(this.lives, damage);
    this.livesText.setText(formatLives(this.lives, PLAYER.lives));
    this.sfx[this.lives === 0 ? 'scream' : 'hurt']('player');
    this.cameras.main.shake(120, 0.005);
    if (this.lives === 0) this.breakPlayer(hit, pushAngle);
    else this.player.flash(PLAYER.hitColor, PLAYER.hitFlashMs);
  }

  /** Out of lives: the player breaks in two like the white ones, and the attacks stop. */
  private breakPlayer(hit: Point, pushAngle: number): void {
    this.playerAlive = false;
    for (const foe of this.foes) foe.stopShooting();
    new BrokenFigure(this, this.labyrinth, this.player, hit, pushAngle);
    this.player.destroy();

    // Save the best score of this level
    const record = recordScore(loadSave(browserStorage()), this.difficulty, this.earned);
    writeSave(browserStorage(), record.save);

    this.time.delayedCall(GAME_OVER.delayMs, () => {
      showGameOverSign(
        this,
        () => {
          // Back to the start menu to pick a level again
          this.scene.start('MenuScene');
        },
        record.newRecord ? this.earned : null,
      );
    });
  }

  /** A little puff of dust kicked up by a footstep. `size` is bigger for heavy feet. */
  private dustAt(at: Point, size = 1): void {
    for (let i = 0; i < DUST.puffs; i++) {
      const puff = this.add
        .circle(
          at.x + (Math.random() - 0.5) * 20,
          at.y + (Math.random() - 0.5) * 20,
          (2 + Math.random() * 2) * size,
          DUST.color,
          DUST.alpha,
        )
        .setDepth(DEPTH.shadows);
      this.tweens.add({
        targets: puff,
        x: puff.x + (Math.random() - 0.5) * 24,
        y: puff.y + (Math.random() - 0.5) * 24,
        scale: 2.5,
        alpha: 0,
        duration: DUST.ms,
        ease: 'Sine.easeOut',
        onComplete: () => {
          puff.destroy();
        },
      });
    }
  }

  /**
   * BANG: a bullet leaves the gun. If the gun pokes into a wall (standing right
   * at it), the bullet hits the wall at once.
   */
  private shoot(figure: TopFigure, shooter: 'player' | 'enemy'): void {
    const muzzle = figure.muzzlePosition();
    const angle = figure.getAngle() + figure.pose().gunAngle;
    const wall = this.labyrinth.wallHit(figure.position(), muzzle);
    this.gunFx.shot(wall ?? muzzle, figure.handPosition(), angle);
    const near = distance(figure.position(), this.player.position()) < SOUND.hearingDistance * 1.5;
    if (shooter === 'player') this.sfx.gunshot(figure.getWeapon());
    else if (near) this.sfx.gunshot('pistol', true);
    if (wall) {
      this.gunFx.impact(wall, angle);
      return;
    }
    const bullet = makeBullet(muzzle, angle);
    if (shooter === 'player') this.playerBullets.push(bullet);
    else this.enemyBullets.push(bullet);
  }
}

/** Which outfit a shop item gives, or null if it isn't clothes. */
function outfitOf(item: ShopItem): OutfitId | null {
  return item.outfit !== undefined && item.outfit in OUTFITS ? (item.outfit as OutfitId) : null;
}
