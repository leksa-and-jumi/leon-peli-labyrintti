import { lerp, lerpAngle, lerpPoint, type Point, type Segment } from './geometry';

/**
 * A stick figure seen from above. Measured from the middle of the body:
 * +x is forward (where it looks), +y is its right side.
 */
export interface TopPose {
  head: Point;
  headRadius: number;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftHand: Point;
  rightHand: Point;
  leftHip: Point;
  rightHip: Point;
  leftFoot: Point;
  rightFoot: Point;
  /** Where the weapon is held, and which way it points (0 = straight forward). */
  gunHand: Point;
  gunAngle: number;
}

/** What the figure is doing with its arms. */
export type Stance = 'aim' | 'raise' | 'chop';

/** How the weapon is held: a pistol in both hands, a rifle on the shoulder, an axe or club. */
export type Grip = 'pistol' | 'rifle' | 'axe' | 'club';

/** The player's height, the size every pose is measured from. */
export const BASE_HEIGHT = 120;

const p = (x: number, y: number, s: number): Point => ({ x: x * s, y: y * s });

/** How big a figure of this height is compared to the player. */
export function figureScale(height: number): number {
  return height / BASE_HEIGHT;
}

/** How wide the body is from above, for bullets and bumping into things. */
export function bodyRadius(height: number): number {
  return 16 * figureScale(height);
}

/**
 * The pose from above. `walkPhase` swings the feet forward and back
 * (a full turn of 2π is two steps). Without it the figure stands still.
 */
export function topPose(height: number, stance: Stance, grip: Grip, walkPhase?: number): TopPose {
  const s = figureScale(height);
  const swing = walkPhase === undefined ? 0 : Math.sin(walkPhase) * 13;
  // Shoulders twist a little with the steps
  const twist = walkPhase === undefined ? 0 : Math.sin(walkPhase) * 1.5;
  const base = {
    head: p(1, 0, s),
    headRadius: 10 * s,
    leftShoulder: p(twist, -13, s),
    rightShoulder: p(0 - twist, 13, s),
    leftHip: p(-2, -6, s),
    rightHip: p(-2, 6, s),
    leftFoot: p(1 + swing, -8, s),
    rightFoot: p(1 - swing, 8, s),
  };
  return { ...base, ...arms(stance, grip, s) };
}

type Arms = Pick<
  TopPose,
  'leftElbow' | 'rightElbow' | 'leftHand' | 'rightHand' | 'gunHand' | 'gunAngle'
>;

function arms(stance: Stance, grip: Grip, s: number): Arms {
  if (grip === 'axe' || grip === 'club') {
    if (stance === 'chop') {
      // Swung down in front, hard
      return {
        rightElbow: p(16, 15, s),
        rightHand: p(30, 7, s),
        leftElbow: p(10, -12, s),
        leftHand: p(22, -2, s),
        gunHand: p(30, 7, s),
        gunAngle: 0.1,
      };
    }
    // Raised up over the shoulder, ready to swing
    return {
      rightElbow: p(4, 23, s),
      rightHand: p(-6, 19, s),
      leftElbow: p(6, -19, s),
      leftHand: p(15, -14, s),
      gunHand: p(-6, 19, s),
      gunAngle: 2.5,
    };
  }
  if (grip === 'rifle') {
    // Stock on the right shoulder, left hand forward on the handguard
    return {
      rightElbow: p(2, 19, s),
      rightHand: p(10, 8, s),
      leftElbow: p(16, -6, s),
      leftHand: p(30, 6, s),
      gunHand: p(10, 6, s),
      gunAngle: 0,
    };
  }
  // Pistol: both arms straight out, hands together
  return {
    rightElbow: p(12, 11, s),
    rightHand: p(25, 2, s),
    leftElbow: p(11, -10, s),
    leftHand: p(23, -1, s),
    gunHand: p(25, 1, s),
    gunAngle: 0,
  };
}

/** A pose `t` of the way from `a` to `b`, for soft movement. */
export function lerpTopPose(a: TopPose, b: TopPose, t: number): TopPose {
  const k = Math.min(Math.max(t, 0), 1);
  return {
    head: lerpPoint(a.head, b.head, k),
    headRadius: lerp(a.headRadius, b.headRadius, k),
    leftShoulder: lerpPoint(a.leftShoulder, b.leftShoulder, k),
    rightShoulder: lerpPoint(a.rightShoulder, b.rightShoulder, k),
    leftElbow: lerpPoint(a.leftElbow, b.leftElbow, k),
    rightElbow: lerpPoint(a.rightElbow, b.rightElbow, k),
    leftHand: lerpPoint(a.leftHand, b.leftHand, k),
    rightHand: lerpPoint(a.rightHand, b.rightHand, k),
    leftHip: lerpPoint(a.leftHip, b.leftHip, k),
    rightHip: lerpPoint(a.rightHip, b.rightHip, k),
    leftFoot: lerpPoint(a.leftFoot, b.leftFoot, k),
    rightFoot: lerpPoint(a.rightFoot, b.rightFoot, k),
    gunHand: lerpPoint(a.gunHand, b.gunHand, k),
    gunAngle: lerpAngle(a.gunAngle, b.gunAngle, k),
  };
}

/** Lying limp after breaking: arms flop out to the sides and the legs spread. */
export function limpTopPose(pose: TopPose): TopPose {
  const out = (point: Point, side: number, back: number): Point => ({
    x: point.x - back,
    y: point.y + side,
  });
  const width = Math.abs(pose.rightShoulder.y - pose.leftShoulder.y);
  const k = width / 26;
  return {
    ...pose,
    leftElbow: out(pose.leftShoulder, -12 * k, 2 * k),
    rightElbow: out(pose.rightShoulder, 12 * k, 2 * k),
    leftHand: out(pose.leftShoulder, -22 * k, -6 * k),
    rightHand: out(pose.rightShoulder, 22 * k, 8 * k),
    leftFoot: out(pose.leftHip, -12 * k, 14 * k),
    rightFoot: out(pose.rightHip, 10 * k, 16 * k),
  };
}

/** The top half: shoulders, a little neck and the arms. Breaks off as one piece. */
export function upperSegments(pose: TopPose): Segment[] {
  return [
    { from: pose.leftShoulder, to: pose.rightShoulder },
    { from: pose.leftShoulder, to: pose.leftElbow },
    { from: pose.leftElbow, to: pose.leftHand },
    { from: pose.rightShoulder, to: pose.rightElbow },
    { from: pose.rightElbow, to: pose.rightHand },
  ];
}

/** The bottom half: hips and legs. */
export function lowerSegments(pose: TopPose): Segment[] {
  return [
    { from: pose.leftHip, to: pose.rightHip },
    { from: pose.leftHip, to: pose.leftFoot },
    { from: pose.rightHip, to: pose.rightFoot },
  ];
}

/** Round joints: every line end, and whether it's a hand or foot (drawn a bit bigger). */
export function jointsOf(segments: readonly Segment[]): (Point & { end: boolean })[] {
  const count = new Map<string, number>();
  const points: Point[] = [];
  for (const { from, to } of segments) {
    for (const pt of [from, to]) {
      const key = `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
      if (!count.has(key)) points.push(pt);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  return points.map((pt) => ({
    ...pt,
    end: count.get(`${pt.x.toFixed(2)},${pt.y.toFixed(2)}`) === 1,
  }));
}
