import { describe, expect, it } from 'vitest';
import {
  bodyRadius,
  jointsOf,
  lerpTopPose,
  limpTopPose,
  lowerSegments,
  topPose,
  upperSegments,
} from './topPose';

describe('topPose', () => {
  it('holds the pistol out in front', () => {
    const pose = topPose(120, 'aim', 'pistol');
    expect(pose.gunHand.x).toBeGreaterThan(20);
    expect(pose.gunAngle).toBe(0);
  });

  it('a bigger figure is bigger everywhere', () => {
    const small = topPose(120, 'aim', 'rifle');
    const big = topPose(240, 'aim', 'rifle');
    expect(big.leftShoulder.y).toBeCloseTo(small.leftShoulder.y * 2);
    expect(big.headRadius).toBeCloseTo(small.headRadius * 2);
    expect(bodyRadius(240)).toBeCloseTo(bodyRadius(120) * 2);
  });

  it('walking swings one foot forward and the other back', () => {
    const pose = topPose(120, 'aim', 'pistol', Math.PI / 2);
    expect(pose.leftFoot.x).toBeGreaterThan(pose.rightFoot.x);
    const later = topPose(120, 'aim', 'pistol', (Math.PI * 3) / 2);
    expect(later.leftFoot.x).toBeLessThan(later.rightFoot.x);
  });

  it('the axe goes from up over the shoulder to down in front', () => {
    const raised = topPose(170, 'raise', 'axe');
    const chop = topPose(170, 'chop', 'axe');
    expect(raised.gunHand.x).toBeLessThan(0);
    expect(chop.gunHand.x).toBeGreaterThan(0);
  });
});

describe('moving between poses', () => {
  const a = topPose(120, 'raise', 'axe');
  const b = topPose(120, 'chop', 'axe');

  it('starts and ends at the right poses', () => {
    expect(lerpTopPose(a, b, 0)).toEqual(a);
    expect(lerpTopPose(a, b, 1).gunHand).toEqual(b.gunHand);
  });

  it('goes limp with arms out to the sides', () => {
    const limp = limpTopPose(topPose(120, 'aim', 'pistol'));
    expect(limp.leftHand.y).toBeLessThan(-20);
    expect(limp.rightHand.y).toBeGreaterThan(20);
  });
});

describe('segments', () => {
  const pose = topPose(120, 'aim', 'pistol');

  it('splits the body into a top and a bottom half', () => {
    expect(upperSegments(pose)).toHaveLength(5);
    expect(lowerSegments(pose)).toHaveLength(3);
  });

  it('finds hands and feet as line ends', () => {
    const ends = jointsOf(lowerSegments(pose)).filter((j) => j.end);
    expect(ends).toHaveLength(2);
  });
});
