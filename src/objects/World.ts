import type Phaser from 'phaser';
import { ATMOSPHERE, LABYRINTH } from '../config';
import type { Point } from '../logic/geometry';
import { Labyrinth } from '../logic/labyrinth';
import { cellCenterTile, cellCenters, generateMaze, type Tile } from '../logic/maze';
import { Atmosphere } from './Atmosphere';
import { MazeBackground } from './MazeBackground';

export interface World {
  labyrinth: Labyrinth;
  atmosphere: Atmosphere;
  /** The middle of the middle room: where the hero starts. */
  start: Point;
  /** The middle of every room: where enemies can appear. */
  rooms: Tile[];
}

/**
 * Builds a new labyrinth with everything in it: the stones, torches, fireflies,
 * mist and cloud shadows. The camera stays inside it.
 * `key` names the pictures, so the menu and the game don't mix them up.
 */
export function buildWorld(
  scene: Phaser.Scene,
  size: { cellsX: number; cellsY: number },
  random: () => number,
  key: string,
): World {
  const { cellTiles, tileSize, extraOpenings, wallPenalty } = LABYRINTH;
  const grid = generateMaze({ ...size, cellTiles, extraOpenings }, random);
  const labyrinth = new Labyrinth(grid, tileSize, wallPenalty);
  const background = new MazeBackground(scene, labyrinth, random, `${key}-maze`);

  const atmosphere = new Atmosphere(scene, labyrinth);
  atmosphere.addMistAndClouds();
  atmosphere.addTorches(background.torches);
  const rooms = cellCenters(size.cellsX, size.cellsY, cellTiles);
  const fireflies: Point[] = [];
  for (let i = 0; i < ATMOSPHERE.fireflies.count; i++) {
    const room = rooms[Math.floor(random() * rooms.length)];
    if (!room) continue;
    const c = labyrinth.centerOf(room);
    fireflies.push({
      x: c.x + (random() - 0.5) * tileSize * 2,
      y: c.y + (random() - 0.5) * tileSize * 2,
    });
  }
  atmosphere.addFireflies(fireflies);

  scene.cameras.main.setBounds(0, 0, labyrinth.width, labyrinth.height);
  const start = labyrinth.centerOf(
    cellCenterTile(Math.floor(size.cellsX / 2), Math.floor(size.cellsY / 2), cellTiles),
  );
  return { labyrinth, atmosphere, start, rooms };
}
