import type { Difficulty, DifficultyRules } from './logic/difficulty';
import type { OutfitLook } from './logic/outfit';
import type { ShopItem } from './logic/shop';

/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x0c0a14,
  text: '#ffffff',
} as const;

/** What is drawn on top of what. Bigger numbers are on top. */
export const DEPTH = {
  floor: 0,
  /** Blood on the floor, bullet holes and shells lying around. */
  floorMarks: 5,
  shadows: 10,
  bodies: 20,
  /** Broken pieces flying through the air. */
  flying: 25,
  effects: 30,
  mist: 40,
  /** The darkness outside the lantern's light. */
  darkness: 50,
  /** Torch glows shine through the darkness. */
  glow: 55,
  vignette: 60,
  hud: 100,
} as const;

/** How softly figures move between poses. Bigger = snappier. */
export const MOTION = {
  smoothSpeed: 14,
  /** How fast enemies turn around, in radians per second. */
  turnSpeed: 7,
} as const;

/** Sounds, all made with code. */
export const SOUND = {
  volume: 0.6,
  /** The white ones' guns are a bit quieter than yours. */
  enemyGunVolume: 0.55,
  /** How long the hiss of a gun blast lasts. */
  gunBlastSeconds: 0.28,
  screamVolume: 0.6,
  screamLength: 1.1,
  /** Echo in the stone labyrinth: how long it rings and how loud it is. */
  echoSeconds: 1.8,
  echoLevel: 0.42,
  /** How rough the scream is (0 = smooth). */
  screamRasp: 3,
  /** The short "uh!" when hit. */
  gruntVolume: 0.55,
  gruntLength: 0.22,
  /** A man's "uh" mouth shape: [Hz, loudness]. */
  gruntFormants: [
    [600, 1],
    [1000, 0.6],
    [2400, 0.2],
  ],
  /** How sharp the mouth shapes are: higher sounds more like a voice. */
  screamFormantQ: 9,
  /** How much breathy hiss is in the scream. */
  screamBreath: 0.25,
  /** Screams slide from `start` down to `end` Hz: men's voices, deepest for the giant. */
  screamPitch: {
    player: { start: 210, end: 105 },
    white: { start: 240, end: 120 },
    boss: { start: 140, end: 65 },
    giant: { start: 95, end: 45 },
  },
  /** Mouth shapes of a man's "aaa" sliding to "ooo": [from Hz, to Hz, loudness]. */
  screamFormants: [
    [730, 570, 1],
    [1090, 840, 0.7],
    [2440, 2410, 0.3],
  ],
  /** Enemies further away than this can't be heard walking. */
  hearingDistance: 520,
} as const;

/** The labyrinth: rooms and corridors of old stone, a new one every game. */
export const LABYRINTH = {
  /** One tile in pixels. Walls are one tile thick. */
  tileSize: 40,
  /** Rooms across and down. */
  cellsX: 12,
  cellsY: 9,
  /** Corridors are this many tiles wide. */
  cellTiles: 3,
  /** 0–1: how many extra walls have crumbled down, making loops. */
  extraOpenings: 0.18,
  /** Enemies keep away from walls this much (extra steps), so they walk in the middle. */
  wallPenalty: 2,
  /** Walls look taller: the front face of a wall seen from above, in pixels. */
  frontFace: 14,
  /** Torches on the walls: about one in this many wall faces has one. */
  torchEvery: 26,
} as const;

/** The stones, earth and moss of the labyrinth. Lit by the moon from the top right. */
export const RUINS = {
  floor: { base: 0x1f1b17, dark: 0x14110e, dirt: 0x342c22 },
  flagstone: { light: 0x48423a, dark: 0x2c2722, gap: 0x110e0b },
  stone: { light: 0xbcae96, dark: 0x766b5a, edge: 0x2a251f, highlight: 0xe2d6bd, face: 0x50473b },
  shadow: { color: 0x000000, alpha: 0.7, x: -12, y: 14, blur: 14 },
  moss: { dark: 0x3d5e2c, light: 0x6b8f45 },
  rubbleCount: 260,
  grassCount: 160,
  torch: { wood: 0x5d4037, metal: 0x37332e, flame: 0xffb347, core: 0xfff1b8, glow: 0xff9a3c },
} as const;

/** The night in the labyrinth: the lantern's light, drifting mist and fireflies. */
export const ATMOSPHERE = {
  /** Around the player it's light, further away dark. */
  lantern: { inner: 110, outer: 400, darkness: 0.88, color: 0x05040c },
  mist: { count: 9, color: 0xcfc2d8, alpha: 0.06 },
  cloudShadows: { count: 5, color: 0x000000, alpha: 0.18 },
  fireflies: { count: 40, color: 0xd9ff8a },
  torchGlow: { radius: 130, alpha: 0.55 },
  vignette: { size: 140, alpha: 0.55 },
} as const;

/** Shadows under the stick figures (moonlight from the top right throws them down-left). */
export const SHADOW = { alpha: 0.35, x: -5, y: 6 } as const;

/** Little puffs of dust when walking. */
export const DUST = { color: 0x9e8f78, puffs: 3, alpha: 0.3, ms: 450 } as const;

/** Round ends on the stick figures' lines. */
export const ROUND_ENDS = {
  /** Hands and feet are round balls this much bigger than the line (part of the line width). */
  handGrow: 0.3,
} as const;

/** Leo's player: a black stick figure with a gun. */
export const PLAYER = {
  height: 120,
  lineWidth: 5,
  color: 0x000000,
  /** A thin pale edge (moonlight) so the black figure shows on the dark floor. */
  outlineColor: 0xd8cfe0,
  outlineAlpha: 0.5,
  gun: { body: 0x2a2a2a, shine: 0x9e9e9e },
  /** Blink red for a moment when hit. */
  hitColor: 0xe53935,
  hitFlashMs: 250,
  lives: 4,
  /** Walking with WASD or the arrows, in pixels per second. */
  walkSpeed: 220,
  stepMs: 160,
} as const;

/** Points for breaking one white stick figure. */
export const POINTS_PER_KILL = 1;

/** The white stick figures that hunt you in the labyrinth and shoot. */
export const ENEMY = {
  color: 0xffffff,
  outlineColor: 0x000000,
  outlineAlpha: 0.5,
  walkSpeed: 90, // pixels per second
  stepMs: 180,
  /** They see this far, if no wall is in the way. */
  sightRange: 460,
  /** When they see you, they stop at about this distance and shoot. */
  keepAway: 280,
  /** Time after first seeing you before the first shot. */
  firstShotMs: 1200,
  shootIntervalMs: 2000,
  bulletSpeed: 450, // slower than the player's, so there's time to dodge
  /** Hits it takes to break one. */
  lives: 3,
  /** Time before a new one comes after one is broken. */
  respawnMs: 1500,
  /** New enemies appear at least this many steps away, out of sight. */
  spawnDistance: 18,
  /** At the start, the next enemies come this long after each other. */
  staggerMs: 3500,
} as const;

/** The big axe guy who walks up to you and chops. */
export const BOSS = {
  every: 15,
  weapon: 'axe',
  voice: 'boss',
  /** Hearts one chop takes. */
  damage: 1,
  height: 170,
  color: 0x7f1d1d,
  outlineColor: 0xf3e6c4,
  outlineAlpha: 0.5,
  /** A bit slower than the white ones, so there's time to break him. */
  walkSpeed: 75,
  stepMs: 240,
  lives: 10,
  /** Points for breaking him. */
  points: 3,
  /** How close (between the bodies) he must get to chop. */
  reach: 22,
  /** Time between axe chops once he's close. */
  chopIntervalMs: 1200,
  /** How long the axe stays down after a chop. */
  chopDownMs: 250,
  healthBar: { width: 70, height: 8, gap: 12, back: 0x3a332b, fill: 0xe53935 },
} as const;

/** The giant with a club: slow, huge and very tough. */
export const GIANT = {
  every: 30,
  weapon: 'club',
  voice: 'giant',
  /** Hearts one smash takes. */
  damage: 2,
  height: 250,
  color: 0x33402c,
  outlineColor: 0xf3e6c4,
  outlineAlpha: 0.55,
  /** Even slower than the red axe guy. */
  walkSpeed: 50,
  stepMs: 340,
  lives: 30,
  points: 10,
  reach: 34,
  chopIntervalMs: 1700,
  chopDownMs: 320,
  healthBar: { width: 100, height: 10, gap: 12, back: 0x3a332b, fill: 0x7cb342 },
} as const;

/** Everything that's different between the axe guy and the giant. */
export type BigFoeKind = typeof BOSS | typeof GIANT;

/** How a broken stick figure falls apart. */
export const BREAK = {
  /** The top half is thrown this far, the way the bullet flew. */
  topFly: 70,
  /** How high it flies (it looks bigger up in the air). */
  topArcScale: 0.18,
  topSpin: 110, // degrees
  topFallMs: 520,
  /** The legs twist a little as they fall. */
  bottomTwist: 25,
  bottomFallMs: 550,
  /** How long it takes for arms and legs to go limp. */
  limpMs: 600,
  /** After landing, rocks back this much (degrees) and settles. */
  settleRock: 6,
  settleMs: 180,
  /** How long the pieces lie on the floor before fading away. */
  fadeDelayMs: 6000,
  fadeMs: 900,
} as const;

/** Red drops that spray out of a hit. */
export const BLOOD = {
  color: 0xc62828,
  dark: 0x7f1414,
  drops: 70,
  /** More drops squirt out a few times after the hit. */
  squirts: 6,
  squirtDrops: 12,
  squirtEveryMs: 120,
  /** The broken ends drip blood while the pieces fly. */
  dripEveryMs: 60,
  dripForMs: 1400,
  dripDrops: 2,
  minRadius: 1.2,
  maxRadius: 3.5,
  /** How fast drops shoot out (pixels per second), and how high they're thrown. */
  speed: 330,
  upSpeed: 260,
  /** Pulls the drops down (pixels per second²). */
  gravity: 1100,
  /** Air slowing the drops down. */
  drag: 1.2,
  /** Fast drops look stretched, at most this many times longer. */
  maxStretch: 3,
  /** A fine red mist at the hit. */
  mist: 30,
  mistSpread: 45,
  mistMs: 450,
  pool: { width: 64, height: 48, alpha: 0.85, growMs: 1600 },
} as const;

/** Every text in the game is shown in English and Finnish. */
export const HINT =
  'WASD ←↑↓→ = move 🏃 / liiku\n🖱️ = aim 🎯 / tähtää\n🖱️ Space = shoot / ammu\nK = shop 🛒 / kauppa\nM = sound 🔊 / ääni';

/** Bullets. */
export const BULLET = {
  speed: 900, // pixels per second
  /** Bullets fly this far at most. */
  range: 1100,
  /** The player's gun reloads this long between shots. */
  cooldownMs: 3000,
} as const;

/** How shooting looks: flash, smoke, glowing trails, brass shells and chips off the walls. */
export const GUN_FX = {
  flash: {
    inner: 0xffffff,
    outer: 0xffc94d,
    glow: 0xffe9a8,
    glowRadius: 26,
    length: 26,
    durationMs: 80,
  },
  smoke: { puffs: 4, color: 0xb0aaa0, alpha: 0.35, ms: 700 },
  trail: { length: 70, width: 3, color: 0xffcc66, tip: 0xfff3c4 },
  shell: {
    width: 6,
    height: 2.5,
    color: 0xc9a227,
    gravity: 900,
    bounciness: 0.35,
    minBounce: 40,
    drag: 2.5,
    /** How long a shell lies on the floor before fading. */
    lieMs: 8000,
    fadeMs: 1000,
    /** At most this many shells at once. */
    max: 50,
  },
  /** A bullet hitting a stone wall: sparks, dust and a mark. */
  impact: { sparks: 7, spark: 0xffd27a, dust: 0x9a8e7c, mark: 0x1a1612, markMs: 9000 },
} as const;

/** The guns. `muzzleX` is how far in front of the gun hand the bullet comes out. */
export const WEAPONS = {
  pistol: { muzzleX: 22, cooldownMs: BULLET.cooldownMs },
  /** From the shop: reloads in just one second. */
  rifle: {
    muzzleX: 52,
    cooldownMs: 1000,
    /** With the upgrade from the shop. */
    upgradedCooldownMs: 300,
    colors: { body: 0x2f2f2f, dark: 0x1a1a1a, metal: 0x4a4a4a, shine: 0x9e9e9e },
  },
  /** The giant's big wooden club. */
  club: {
    muzzleX: 60,
    cooldownMs: 0,
    colors: { wood: 0x6d4c41, dark: 0x4e342e, knot: 0x3e2723 },
  },
  /** The boss's axe. It doesn't shoot. */
  axe: {
    muzzleX: 40,
    cooldownMs: 0,
    colors: { handle: 0x795548, blade: 0x616161, edge: 0xe0e0e0 },
  },
} as const;

export type Weapon = keyof typeof WEAPONS;

/** Bar under the hints that fills up while the gun reloads. */
export const RELOAD_BAR = {
  x: 52,
  y: 142,
  width: 120,
  height: 10,
  empty: 0x3a332b,
  filling: 0xffb74d,
  ready: 0x66bb6a,
} as const;

/** The little map of the labyrinth in the corner. */
export const MINIMAP = {
  width: 168,
  height: 126,
  margin: 14,
  back: 0x000000,
  backAlpha: 0.55,
  wall: 0x9a8e7c,
  wallAlpha: 0.75,
  border: 0xffd54f,
  player: 0x66bb6a,
  enemy: 0xffffff,
  boss: 0xe53935,
  /** Enemies show on the map only when they're this close. */
  showDistance: 650,
} as const;

/** The "you died" sign that comes after the player breaks. */
export const GAME_OVER = {
  /** Time to watch yourself fall apart before the sign shows. */
  delayMs: 1300,
  /** Drawn above the game and its texts. */
  depth: 200,
  text: 'You died!\nSinä kuolit!',
  textColor: '#ffffff',
  recordColor: '#ffd54f',
  dimAlpha: 0.35,
  panel: { width: 380, height: 290, color: 0x1b1533, alpha: 0.92, border: 0xc62828 },
  button: { width: 120, height: 48, color: 0xc62828, hoverColor: 0xe53935 },
} as const;

/** Clothes for the stick figure. Black is what you start with. */
export const OUTFITS = {
  black: { kind: 'solid', color: 0x000000 },
  white: { kind: 'solid', color: 0xffffff },
  blue: { kind: 'solid', color: 0x1e88e5 },
  pink: { kind: 'solid', color: 0xf06292 },
  red: { kind: 'solid', color: 0xe53935 },
  green: { kind: 'solid', color: 0x43a047 },
  yellow: { kind: 'solid', color: 0xfdd835 },
  orange: { kind: 'solid', color: 0xfb8c00 },
  purple: { kind: 'solid', color: 0x8e24aa },
  /** Woodland camouflage: blotches of dark, green, olive, brown and sand. */
  camo: { kind: 'camo', colors: [0x1f2418, 0x3b4a2a, 0x5c6b3a, 0x5a4632, 0x8f8460] },
  rainbow: {
    kind: 'rainbow',
    colors: [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x3949ab, 0x8e24aa],
  },
} as const satisfies Record<string, OutfitLook>;

export type OutfitId = keyof typeof OUTFITS;

/** The helmet that comes with the camo suit. */
export const CAMO_HELMET = { color: 0x4b5320, rim: 0x3a4119, shine: 0xffffff } as const;

/** How long each colored piece of a camo or rainbow outfit is. */
export const OUTFIT_PIECE_LENGTH = 7;
/** Rainbow pieces are tiny, so the stripes have sharp edges. */
export const RAINBOW_PIECE_LENGTH = 2;

/** Points you start every game with. */
export const START_POINTS = 3;

/** Things in the shop, one per row. Prices are in ⭐ points. */
export const SHOP_ITEMS = [
  { id: 'life', emoji: '❤️', name: 'Extra life\nLisäelämä', price: 3 },
  { id: 'rifle', emoji: '🔫', name: 'Assault rifle\nRynnäkkökivääri', price: 15, onlyOnce: true },
  {
    id: 'rifleUpgrade',
    emoji: '⚡',
    name: 'Rifle upgrade\nKiväärin päivitys',
    price: 30,
    onlyOnce: true,
    needs: 'rifle',
  },
  {
    id: 'camo',
    emoji: '🪖',
    name: 'Camo suit\nMaastopuku',
    price: 20,
    onlyOnce: true,
    outfit: 'camo',
  },
  {
    id: 'rainbow',
    emoji: '🌈',
    name: 'Rainbow suit\nSateenkaaripuku',
    price: 30,
    onlyOnce: true,
    outfit: 'rainbow',
  },
] as const satisfies readonly ShopItem[];

/** One-color clothes, shown as color squares in the shop. Black is yours from the start. */
export const COLOR_ITEMS: readonly ShopItem[] = (
  ['black', 'white', 'blue', 'pink', 'red', 'green', 'yellow', 'orange', 'purple'] as const
).map((id) => ({ id, emoji: '👕', name: id, price: 5, onlyOnce: true, outfit: id }));

export const SHOP = {
  panel: { width: 560, height: 570, color: 0x1b1533, alpha: 0.96, border: 0xffd54f },
  rowHeight: 68,
  swatch: { size: 40, gap: 12, worn: 0xffd54f },
  buyButton: { width: 120, height: 44, color: 0x2e7d32, hoverColor: 0x43a047, disabled: 0x555555 },
  wearButton: { width: 120, height: 44, color: 0x1565c0, hoverColor: 0x1e88e5 },
  textColor: '#ffffff',
  dimTextColor: '#9e9e9e',
  dimAlpha: 0.5,
} as const;

/** The difficulty levels in the start menu. `together` = how many enemies hunt you at once. */
type Level = DifficultyRules & { label: string; emoji: string; together: number };

export const DIFFICULTIES: Record<Difficulty, Level> = {
  /** Only white ones, two hits each, one at a time. */
  easy: {
    label: 'Easy\nHelppo',
    emoji: '😊',
    together: 1,
    specials: [],
    regular: { kind: 'white', lives: 2 },
  },
  /** Axe guy every 15th, giant every 30th. */
  normal: {
    label: 'Normal\nNormaali',
    emoji: '🙂',
    together: 2,
    specials: [
      { every: 30, kind: 'giant' },
      { every: 15, kind: 'boss' },
    ],
    regular: { kind: 'white', lives: 3 },
  },
  /** Red guys often: 5 hits every 5th, 10 hits every 10th, giant every 30th. */
  hard: {
    label: 'Hard\nVaikea',
    emoji: '😈',
    together: 2,
    specials: [
      { every: 30, kind: 'giant' },
      { every: 10, kind: 'boss', lives: 10 },
      { every: 5, kind: 'boss', lives: 5 },
    ],
    regular: { kind: 'white', lives: 3 },
  },
  /** Red 5-hit guys all the time, a white one every 10th, the giant every 15th. */
  superHard: {
    label: 'Super hard\nSupervaikea',
    emoji: '🔥',
    together: 3,
    specials: [
      { every: 15, kind: 'giant' },
      { every: 10, kind: 'white', lives: 3 },
    ],
    regular: { kind: 'boss', lives: 5 },
  },
};

/** The battle that plays by itself behind the start menu. */
export const DEMO = {
  cellsX: 8,
  cellsY: 6,
  /** How far right of the soldier the middle of the screen is. */
  heroScreenX: 290,
  shootEveryMs: 650,
  respawnMs: 900,
  together: 3,
  /** Every this many enemies is a red axe guy. */
  bossEvery: 4,
  bossLives: 6,
  explosionEveryMs: 1400,
} as const;

/** How the start menu looks. */
export const MENU = {
  title: 'LEON PELI',
  subtitle: '🧱 LABYRINTTI 🧱',
  levelText: 'Choose a level / Valitse taso',
  dimAlpha: 0.25,
  /** Buttons and texts are drawn above the battle. */
  depth: 150,
  button: {
    width: 320,
    height: 60,
    gap: 14,
    color: 0x2e7d32,
    hoverColor: 0x43a047,
    locked: 0x555555,
  },
  textColor: '#ffffff',
} as const;
