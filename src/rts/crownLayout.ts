import type { Carve, Obstacle, ObstacleSet, Point } from './obstacles'

// ---------------------------------------------------------------------------
// The Crown: layout data for the flagship six-start map.
//
// Two rivers cross the highland east-west, bowing around the contested centre:
// the north river cuts the NW / N / NE starts off from the middle land, the
// south river does the same for SW / S / SE. Each river has three crossings -
// a plank bridge on either flank and a wide ford in the middle - and the middle
// land holds the old king's ruined keep around the rich centre, with forests and
// outcrops shaping the approaches. The whole thing is point-symmetric about the
// centre so no seat gets a shorter route, and every shape here is BOTH the
// pathing obstacle (obstacles.ts) and the anchor for the props crownTerrain.ts
// scatters over it, so what blocks is always what you see.
// ---------------------------------------------------------------------------

const CENTER = 80

/** 180-degree rotation about the map centre: the map's symmetry. */
export function mirrorPoint(p: Point): Point {
  return { x: 2 * CENTER - p.x, z: 2 * CENTER - p.z }
}

function mirrorAll<T extends Point>(items: T[]): T[] {
  return items.map((item) => ({ ...item, ...mirrorPoint(item) }))
}

function pts(...coords: [number, number][]): Point[] {
  return coords.map(([x, z]) => ({ x, z }))
}

// --- Rivers ------------------------------------------------------------------

export const RIVER_WIDTH = 7
/** Muddy bank strip drawn under and beside the water. */
export const RIVER_BANK_WIDTH = 11

export const NORTH_RIVER: Point[] = pts([-6, 102], [18, 102], [36, 100], [54, 102], [72, 99], [90, 99], [108, 103], [124, 110], [140, 117], [166, 119])
export const SOUTH_RIVER: Point[] = NORTH_RIVER.map(mirrorPoint).reverse()
export const RIVERS: Point[][] = [NORTH_RIVER, SOUTH_RIVER]

/** River centre-line height at a given x (rivers run west-east, one z per x). */
export function riverZAt(river: Point[], x: number): number {
  for (let i = 0; i + 1 < river.length; i++) {
    const a = river[i]
    const b = river[i + 1]
    const lo = Math.min(a.x, b.x)
    const hi = Math.max(a.x, b.x)
    if (x >= lo && x <= hi) {
      const t = (x - a.x) / (b.x - a.x)
      return a.z + (b.z - a.z) * t
    }
  }
  return river[0].z
}

// --- Crossings ---------------------------------------------------------------

export type Crossing = { x: number; z: number; kind: 'bridge' | 'ford'; river: Point[] }

function crossing(river: Point[], x: number, kind: Crossing['kind']): Crossing {
  return { x, z: riverZAt(river, x), kind, river }
}

export const CROSSINGS: Crossing[] = [
  crossing(NORTH_RIVER, 26, 'bridge'),
  crossing(NORTH_RIVER, 80, 'ford'),
  crossing(NORTH_RIVER, 132, 'bridge'),
  crossing(SOUTH_RIVER, 28, 'bridge'),
  crossing(SOUTH_RIVER, 80, 'ford'),
  crossing(SOUTH_RIVER, 134, 'bridge')
]

/** Walkable half-extents of a crossing: plank bridges are narrow, the fords wide. */
export function crossingHalfWidth(c: Crossing): number {
  return c.kind === 'ford' ? 7 : 3.2
}

// --- Blocking features ---------------------------------------------------------

export type Disc = Point & { r: number }
export type Box = Point & { hx: number; hz: number; yaw?: number }

/** Dense pine stands. Units path around; the tree line is the wall. */
export const FORESTS: Disc[] = (() => {
  const half: Disc[] = [
    { x: 46, z: 84, r: 7 },
    { x: 58, z: 67, r: 5 },
    { x: 62, z: 113, r: 5 },
    { x: 3, z: 72, r: 5 },
    { x: 46, z: 157, r: 6 },
    { x: 112, z: 156, r: 6 }
  ]
  return [...half, ...mirrorAll(half)]
})()

/** Rock outcrops on the middle land flanks. */
export const OUTCROPS: Disc[] = (() => {
  const half: Disc[] = [{ x: 30, z: 72, r: 4 }]
  return [...half, ...mirrorAll(half)]
})()

/**
 * The old keep: two broken curtain walls east and west of the centre with a
 * 12 m gate gap in each. The wall ends run into the river banks, so the keep
 * has exactly four ways in - the two gates and the two fords.
 */
export const RUIN_WALLS: Box[] = [
  { x: 64, z: 70, hx: 0.8, hz: 3 },
  { x: 64, z: 90, hx: 0.8, hz: 3 },
  { x: 96, z: 70, hx: 0.8, hz: 3 },
  { x: 96, z: 90, hx: 0.8, hz: 3 }
]
export const RUIN_TOWERS: Disc[] = [
  { x: 64, z: 66, r: 1.6 },
  { x: 64, z: 94, r: 1.6 },
  { x: 96, z: 66, r: 1.6 },
  { x: 96, z: 94, r: 1.6 }
]
export const RUIN_STATUE: Disc = { x: 88, z: 88, r: 1.2 }
export const RUIN_FOUNTAIN: Disc = { x: 72, z: 72, r: 1.2 }

/** Abandoned farmsteads: the ruined house blocks, the fields and fences do not. */
export type Hamlet = Point & { yaw: number }
export const HAMLETS: Hamlet[] = (() => {
  const half: Hamlet[] = [
    { x: 18, z: 72, yaw: 20 },
    { x: 104, z: 128, yaw: -35 }
  ]
  return [...half, ...mirrorAll(half).map((h) => ({ ...h, yaw: h.yaw + 180 }))]
})()
export const HAMLET_HOUSE_RADIUS = 4.5

/** Burnt-out army camps left in the lanes. */
export const CAMPS: Hamlet[] = (() => {
  const half: Hamlet[] = [
    { x: 34, z: 92, yaw: 0 },
    { x: 48, z: 136, yaw: 60 }
  ]
  return [...half, ...mirrorAll(half).map((h) => ({ ...h, yaw: h.yaw + 180 }))]
})()

/** Siege wreckage by the fords: fallen towers on the banks, standing ones that never crossed. */
export const FALLEN_TOWERS: Box[] = [
  { x: 60, z: 52, hx: 6, hz: 2, yaw: 90 },
  { x: 100, z: 108, hx: 6, hz: 2, yaw: 270 }
]
export const STANDING_TOWERS: Disc[] = [
  { x: 70, z: 108, r: 3 },
  { x: 90, z: 52, r: 3 }
]

// --- Roads (visual only) ---------------------------------------------------------

export const ROAD_WIDTH = 4
export const ROADS: Point[][] = (() => {
  const half: Point[][] = [
    // SW main -> south-west bridge -> west gate -> centre.
    pts([12, 12], [22, 30], [28, 46], [28, 56], [40, 66], [64, 80], [80, 80]),
    // S main -> south ford -> centre.
    pts([80, 18], [88, 40], [86, 56], [80, 61], [80, 80]),
    // SE main -> south-east bridge -> east gate -> centre.
    pts([146, 20], [140, 34], [134, 50], [134, 58], [134, 64], [110, 74], [96, 80], [80, 80])
  ]
  return [...half, ...half.map((road) => road.map(mirrorPoint))]
})()

// --- Obstacle set -----------------------------------------------------------------

export const CROWN_OBSTACLES: ObstacleSet = (() => {
  const blocked: Obstacle[] = []
  for (const river of RIVERS) blocked.push({ kind: 'path', points: river, width: RIVER_WIDTH })
  for (const f of FORESTS) blocked.push({ kind: 'circle', x: f.x, z: f.z, r: f.r })
  for (const o of OUTCROPS) blocked.push({ kind: 'circle', x: o.x, z: o.z, r: o.r })
  for (const w of RUIN_WALLS) blocked.push({ kind: 'rect', x: w.x, z: w.z, hx: w.hx, hz: w.hz })
  for (const t of RUIN_TOWERS) blocked.push({ kind: 'circle', ...t })
  blocked.push({ kind: 'circle', ...RUIN_STATUE }, { kind: 'circle', ...RUIN_FOUNTAIN })
  for (const h of HAMLETS) blocked.push({ kind: 'circle', x: h.x, z: h.z, r: HAMLET_HOUSE_RADIUS })
  for (const t of FALLEN_TOWERS) blocked.push({ kind: 'rect', x: t.x, z: t.z, hx: t.hx, hz: t.hz })
  for (const t of STANDING_TOWERS) blocked.push({ kind: 'circle', ...t })

  const carve: Carve[] = CROSSINGS.map((c) => ({ x: c.x, z: c.z, hx: crossingHalfWidth(c), hz: RIVER_WIDTH / 2 + 2.5 }))
  return { blocked, carve }
})()
