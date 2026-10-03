import Phaser from 'phaser';
import {
  CAMO_HELMET,
  DEPTH,
  MOTION,
  OUTFIT_PIECE_LENGTH,
  PLAYER,
  RAINBOW_PIECE_LENGTH,
  ROUND_ENDS,
  SHADOW,
  WEAPONS,
  type Weapon,
} from '../config';
import { add, rotate, smoothingStep, type Point, type Segment } from '../logic/geometry';
import {
  camoColorAt,
  outfitColor,
  rainbowColorAt,
  splitSegment,
  type OutfitLook,
} from '../logic/outfit';
import { stepsBetween } from '../logic/steps';
import {
  bodyRadius,
  jointsOf,
  lerpTopPose,
  lowerSegments,
  topPose,
  upperSegments,
  type Stance,
  type TopPose,
} from '../logic/topPose';

export interface FigureLook {
  color: number;
  /** A thin edge around the figure so it shows on any floor. */
  outlineColor: number;
  outlineAlpha: number;
  /** How tall the figure is (from above: how big). The player's height if not given. */
  height?: number;
  /** Clothes. Without them the figure is plain `color`. */
  outfit?: OutfitLook;
}

/**
 * A stick figure seen from straight above, holding a weapon: you see the top
 * of the head, the shoulders, the arms reaching forward and the feet stepping.
 * `x`/`y` is the middle of the body and `angle` the way it looks.
 */
export class TopFigure {
  private readonly g: Phaser.GameObjects.Graphics;
  /** A soft dark spot on the floor, thrown down-left by the moon. */
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private stance: Stance;
  private hitColor: number | null = null;
  private weapon: Weapon = 'pistol';
  /** The pose drawn right now. It glides toward the stance's pose every frame. */
  private current: TopPose;
  /** Walking: how far through the step cycle, and how long one step takes. */
  private walkPhase = 0;
  private walkStepMs: number | null = null;
  /** Called on every footstep, for the step sound. */
  private onStep: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private y: number,
    private look: FigureLook,
    private angle = 0,
    stance: Stance = 'aim',
  ) {
    this.stance = stance;
    const r = this.radius();
    this.shadow = scene.add
      .ellipse(x + SHADOW.x, y + SHADOW.y, r * 2.6, r * 2.2, 0x000000, SHADOW.alpha)
      .setDepth(DEPTH.shadows);
    this.g = scene.add.graphics({ x, y }).setDepth(DEPTH.bodies).setRotation(angle);
    this.current = this.targetPose();
    this.draw();
    scene.events.on('update', this.tick, this);
    // Playing again restarts the scene: stop listening, the old figure is gone
    scene.events.once('shutdown', this.stopTicking, this);
  }

  private stopTicking(): void {
    this.scene.events.off('update', this.tick, this);
    this.scene.events.off('shutdown', this.stopTicking, this);
  }

  /** Every frame: step the feet and glide softly toward the wanted pose. */
  private tick(_time: number, deltaMs: number): void {
    if (this.walkStepMs !== null) {
      const before = this.walkPhase;
      this.walkPhase += (Math.PI * deltaMs) / this.walkStepMs;
      if (stepsBetween(before, this.walkPhase) > 0) this.onStep?.();
    }
    const step = smoothingStep(deltaMs, MOTION.smoothSpeed);
    this.current = lerpTopPose(this.current, this.targetPose(), step);
    this.draw();
  }

  /** Walk (feet step, one step every `stepMs`) or stand still (null). */
  setWalking(stepMs: number | null): void {
    if (stepMs === null && this.walkStepMs !== null) this.walkPhase = 0;
    this.walkStepMs = stepMs;
  }

  /** Something to do on every footstep, like playing a step sound. */
  setOnStep(onStep: (() => void) | null): void {
    this.onStep = onStep;
  }

  private height(): number {
    return this.look.height ?? PLAYER.height;
  }

  /** The pose the figure wants to be in right now. */
  private targetPose(): TopPose {
    return topPose(
      this.height(),
      this.stance,
      this.weapon,
      this.walkStepMs !== null ? this.walkPhase : undefined,
    );
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  position(): Point {
    return { x: this.x, y: this.y };
  }

  setPosition(p: Point): void {
    this.x = p.x;
    this.y = p.y;
    this.g.setPosition(p.x, p.y);
    this.shadow.setPosition(p.x + SHADOW.x, p.y + SHADOW.y);
  }

  /** The way the figure looks, in radians (0 = right). */
  getAngle(): number {
    return this.angle;
  }

  setAngle(angle: number): void {
    this.angle = angle;
    this.g.setRotation(angle);
  }

  /** How wide the body is, for bullets and bumping. */
  radius(): number {
    return bodyRadius(this.height());
  }

  /** Change the pose. The figure glides into it over the next frames. */
  setStance(stance: Stance): void {
    this.stance = stance;
  }

  /** A point of the pose on the screen. */
  private toWorld(local: Point): Point {
    return add(this.position(), rotate(local, this.angle));
  }

  /** Where bullets come out of the gun (or where the axe lands), on the screen. */
  muzzlePosition(): Point {
    const pose = this.pose();
    const tip = rotate(
      { x: WEAPONS[this.weapon].muzzleX * weaponScale(pose), y: 0 },
      pose.gunAngle,
    );
    return this.toWorld(add(pose.gunHand, tip));
  }

  /** Where the gun hand is on the screen (shells pop out here). */
  handPosition(): Point {
    return this.toWorld(this.pose().gunHand);
  }

  /** Blink in a color for a moment, for example red when hit. */
  flash(color: number, durationMs: number): void {
    this.hitColor = color;
    this.draw();
    this.scene.time.delayedCall(durationMs, () => {
      // It may have broken apart while blinking
      if (!this.g.active) return;
      this.hitColor = null;
      this.draw();
    });
  }

  /** Put on different clothes. */
  setOutfit(outfit: OutfitLook): void {
    this.look = { ...this.look, outfit };
    this.draw();
  }

  /** Swap the weapon in the hand, for example to the rifle from the shop. */
  setWeapon(weapon: Weapon): void {
    this.weapon = weapon;
    this.draw();
  }

  getWeapon(): Weapon {
    return this.weapon;
  }

  getLook(): FigureLook {
    return this.look;
  }

  destroy(): void {
    this.stopTicking();
    this.g.destroy();
    this.shadow.destroy();
  }

  /** The pose as it is drawn right now. */
  pose(): TopPose {
    return this.current;
  }

  private draw(): void {
    const look: FigureLook =
      this.hitColor !== null
        ? { ...this.look, outfit: { kind: 'solid', color: this.hitColor } }
        : this.look;
    this.g.clear();
    drawFigure(this.g, this.pose(), look, this.weapon, 'all');
  }
}

/** The clothes a figure wears: its outfit, or plain `color` without one. */
export function lookOutfit(look: FigureLook): OutfitLook {
  return look.outfit ?? { kind: 'solid', color: look.color };
}

/** How thick the lines are: big guys have thicker arms and legs. */
export function lineWidthFor(pose: TopPose): number {
  const s = pose.headRadius / 10;
  return PLAYER.lineWidth * Math.max(1, Math.sqrt(s));
}

/**
 * Draws a figure from above, or one half of it (`upper` = head, arms and weapon,
 * `lower` = legs) for the broken pieces. Pale edge first, then legs, weapon,
 * arms and the head on top.
 */
export function drawFigure(
  g: Phaser.GameObjects.Graphics,
  pose: TopPose,
  look: FigureLook,
  weapon: Weapon | null,
  part: 'all' | 'upper' | 'lower',
): void {
  const width = lineWidthFor(pose);
  const lower = part === 'upper' ? [] : lowerSegments(pose);
  const upper = part === 'lower' ? [] : upperSegments(pose);
  const withTop = part !== 'lower';
  const { outlineColor, outlineAlpha } = look;
  const outfit = lookOutfit(look);

  drawSegments(g, [...lower, ...upper], width + 3, outlineColor, outlineAlpha, width);
  if (withTop && weapon) drawWeapon(g, pose, weapon, outlineColor, outlineAlpha, true);
  if (withTop) {
    g.fillStyle(outlineColor, outlineAlpha);
    g.fillCircle(pose.head.x, pose.head.y, pose.headRadius + 1.5);
  }

  drawOutfitSegments(g, lower, pose, outfit, width);
  if (withTop && weapon) drawWeapon(g, pose, weapon, outlineColor, outlineAlpha, false);
  drawOutfitSegments(g, upper, pose, outfit, width);
  if (withTop) drawHead(g, pose, outfit);
}

/** Plain lines with round joints, used for the pale edge. */
export function drawSegments(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  lineWidth: number,
  color: number,
  alpha: number,
  baseWidth: number,
): void {
  g.lineStyle(lineWidth, color, alpha);
  for (const { from, to } of segments) g.lineBetween(from.x, from.y, to.x, to.y);
  g.fillStyle(color, alpha);
  for (const j of jointsOf(segments)) g.fillCircle(j.x, j.y, roundEnd(lineWidth, j.end, baseWidth));
}

/** Hands and feet are a bit bigger than knees and elbows. */
function roundEnd(lineWidth: number, end: boolean, baseWidth: number): number {
  return end ? lineWidth / 2 + baseWidth * ROUND_ENDS.handGrow : lineWidth / 2;
}

/**
 * Body lines in the outfit's colors. Camo colors each short piece by where it is;
 * the rainbow goes in rings out from the head.
 */
function drawOutfitSegments(
  g: Phaser.GameObjects.Graphics,
  segments: readonly Segment[],
  pose: TopPose,
  outfit: OutfitLook,
  width: number,
): void {
  const ring = (pt: Point): number =>
    Math.hypot(pt.x - pose.head.x, pt.y - pose.head.y) / (pose.headRadius * 3.2);
  const colorAt = (pt: Point, index: number): number => {
    if (outfit.kind === 'rainbow') return rainbowColorAt(outfit.colors, ring(pt));
    if (outfit.kind === 'camo') return camoColorAt(outfit.colors, pt.x, pt.y);
    return outfitColor(outfit, index);
  };
  const pieceLength = outfit.kind === 'solid' ? OUTFIT_PIECE_LENGTH : RAINBOW_PIECE_LENGTH;
  let index = 0;
  for (const segment of segments) {
    for (const { from, to } of splitSegment(segment, pieceLength)) {
      g.lineStyle(width, colorAt({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, index), 1);
      g.lineBetween(from.x, from.y, to.x, to.y);
      index += 1;
    }
  }
  for (const j of jointsOf(segments)) {
    g.fillStyle(colorAt(j, Math.round(Math.abs(j.x) + Math.abs(j.y))), 1);
    g.fillCircle(j.x, j.y, roundEnd(width, j.end, width));
  }
}

/** The top of the head. Camo gets a soldier's helmet, rainbow gets rings. */
function drawHead(g: Phaser.GameObjects.Graphics, pose: TopPose, outfit: OutfitLook): void {
  const { x, y } = pose.head;
  const r = pose.headRadius;
  if (outfit.kind === 'solid') {
    g.fillStyle(outfit.color, 1);
    g.fillCircle(x, y, r);
    // Moonlight on the top of the head
    g.fillStyle(0xffffff, outfit.color === 0xffffff ? 0 : 0.12);
    g.fillCircle(x + r * 0.3, y - r * 0.3, r * 0.4);
    return;
  }
  if (outfit.kind === 'rainbow') {
    const n = outfit.colors.length;
    outfit.colors.forEach((color, i) => {
      g.fillStyle(color, 1);
      g.fillCircle(x, y, r * (1 - i / n));
    });
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(x + r * 0.35, y - r * 0.4, r * 0.25);
    return;
  }
  // Camo: a round helmet with a rim, blotches and a shine
  const { color: helmet, rim, shine } = CAMO_HELMET;
  g.fillStyle(rim, 1);
  g.fillCircle(x, y, r * 1.25);
  g.fillStyle(helmet, 1);
  g.fillCircle(x, y, r * 1.05);
  for (let dy = -r; dy < r; dy += 2) {
    for (let dx = -r; dx < r; dx += 2) {
      if (dx * dx + dy * dy > r * r * 0.9) continue;
      g.fillStyle(camoColorAt(outfit.colors, x + dx, y + dy), 0.55);
      g.fillRect(x + dx, y + dy, 2.2, 2.2);
    }
  }
  g.fillStyle(shine, 0.3);
  g.fillEllipse(x + r * 0.35, y - r * 0.35, r * 0.7, r * 0.35);
}

/** Big guys have bigger weapons, but not quite as much bigger as they are. */
function weaponScale(pose: TopPose): number {
  return Math.sqrt(pose.headRadius / 10);
}

/** A filled shape of a weapon from above: points forward from the hand (x) and to its right (y). */
interface GunPart {
  points: readonly (readonly [number, number])[];
  color: number;
}

/** A rectangle as a weapon part. */
function box(x: number, y: number, w: number, h: number, color: number): GunPart {
  return {
    points: [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    color,
  };
}

/** The parts of each weapon seen from above, drawn in order. Hand at (0, 0), pointing right. */
function weaponParts(weapon: Weapon): GunPart[] {
  if (weapon === 'club') {
    const { wood, dark, knot } = WEAPONS.club.colors;
    return [
      box(-6, -3, 26, 6, dark),
      {
        points: [
          [18, -5],
          [44, -10],
          [60, -9],
          [66, 0],
          [60, 9],
          [44, 10],
          [18, 5],
        ],
        color: wood,
      },
      box(32, -5, 4, 4, knot),
      box(46, 2, 4, 4, knot),
      box(56, -4, 3, 3, knot),
    ];
  }
  if (weapon === 'axe') {
    const { handle, blade, edge } = WEAPONS.axe.colors;
    return [
      box(-6, -2, 46, 4, handle),
      box(-8, -3, 4, 6, 0x4e342e),
      box(32, -3.5, 8, 7, 0x424242),
      // The blade sticks out to the side, wider at the edge
      {
        points: [
          [33, -3],
          [40, -3],
          [45, -17],
          [28, -17],
        ],
        color: blade,
      },
      box(27, -19, 19, 3, edge),
    ];
  }
  if (weapon === 'rifle') {
    const { body, dark, metal, shine } = WEAPONS.rifle.colors;
    return [
      // Stock against the shoulder, receiver, handguard with slots, barrel and muzzle brake
      box(-26, -3, 14, 6, body),
      box(-13, -2, 4, 4, dark),
      box(-9, -3.5, 22, 7, body),
      box(-8, -1, 20, 2, dark),
      box(13, -3, 22, 6, body),
      box(16, -1, 3, 2, dark),
      box(22, -1, 3, 2, dark),
      box(28, -1, 3, 2, dark),
      box(35, -1.3, 13, 2.6, metal),
      box(47, -2.2, 5, 4.4, dark),
      // The curved magazine just shows on the side
      box(4, 3.5, 6, 3, dark),
      box(-9, -3.5, 44, 1, shine),
    ];
  }
  const { body, shine } = PLAYER.gun;
  return [
    box(-3, -2.5, 25, 5, body),
    box(-3, -0.6, 25, 1.2, 0x0d0d0d),
    box(20, -1.5, 2, 3, 0x0d0d0d),
    box(-3, -2.5, 25, 1, shine),
  ];
}

/** Draws the weapon in the gun hand. `edge` draws the pale edge around it instead. */
function drawWeapon(
  g: Phaser.GameObjects.Graphics,
  pose: TopPose,
  weapon: Weapon,
  outlineColor: number,
  outlineAlpha: number,
  edge: boolean,
): void {
  const s = weaponScale(pose);
  const toScreen = ([dx, dy]: readonly [number, number]): Phaser.Math.Vector2 => {
    const p = add(pose.gunHand, rotate({ x: dx * s, y: dy * s }, pose.gunAngle));
    return new Phaser.Math.Vector2(p.x, p.y);
  };
  for (const part of weaponParts(weapon)) {
    if (edge) {
      const cx = part.points.reduce((sum, [x]) => sum + x, 0) / part.points.length;
      const cy = part.points.reduce((sum, [, y]) => sum + y, 0) / part.points.length;
      const grown = part.points.map(([x, y]): [number, number] => {
        const dx = x - cx;
        const dy = y - cy;
        const length = Math.hypot(dx, dy) || 1;
        return [x + (dx / length) * 1.5, y + (dy / length) * 1.5];
      });
      g.fillStyle(outlineColor, outlineAlpha);
      g.fillPoints(grown.map(toScreen), true);
    } else {
      g.fillStyle(part.color, 1);
      g.fillPoints(part.points.map(toScreen), true);
    }
  }
}
