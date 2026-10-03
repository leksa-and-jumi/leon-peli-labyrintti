import type { Tile } from './maze';

/** The kinds of enemies: white stick figures, the red axe guy and the giant. */
export type EnemyKind = 'white' | 'boss' | 'giant';

/**
 * Where a new enemy appears: a random spot at least `minDistance` steps away
 * from the player and out of sight, so nobody pops up right in front of you.
 * If there's no such spot, the farthest one.
 */
export function pickSpawnTile(
  candidates: readonly Tile[],
  distanceOf: (tile: Tile) => number,
  isVisible: (tile: Tile) => boolean,
  minDistance: number,
  random: () => number,
): Tile | null {
  const reachable = candidates.filter((t) => Number.isFinite(distanceOf(t)));
  const good = reachable.filter((t) => distanceOf(t) >= minDistance && !isVisible(t));
  if (good.length > 0) return good[Math.floor(random() * good.length)] ?? null;
  let best: Tile | null = null;
  for (const t of reachable) {
    if (!best || distanceOf(t) > distanceOf(best)) best = t;
  }
  return best;
}
