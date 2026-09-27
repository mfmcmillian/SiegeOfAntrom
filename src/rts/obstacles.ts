import { SCENE } from './config'

// ---------------------------------------------------------------------------
// Static ground obstacles for solid-ground maps (forests, rivers, rock walls,
// ruins). The map declares shapes; at match start they are rasterised onto a
// coarse grid that `isGroundWalkable` consults, and `findPath` runs A* over the
// same grid so ground units walk around them instead of grinding into a tree
// line. Everything here is deterministic, so every client agrees on paths.
// ---------------------------------------------------------------------------

export type Point = { x: number; z: number }

export type Obstacle =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'rect'; x: number; z: number; hx: number; hz: number }
  /** A thick polyline: rivers, hedgerows, wall runs. `width` is the full width. */
  | { kind: 'path'; points: Point[]; width: number }

/** Walkable rectangles cut back out of the blocked shapes (bridges, fords, gaps). */
export type Carve = { x: number; z: number; hx: number; hz: number }

export type ObstacleSet = { blocked: Obstacle[]; carve: Carve[] }

export const OBSTACLE_CELL = 2
const GRID = Math.ceil(SCENE.size / OBSTACLE_CELL)
const CELL_COUNT = GRID * GRID

let active: ObstacleSet | undefined
let blocked = new Uint8Array(CELL_COUNT)

export function hasObstacles(): boolean {
  return active !== undefined
}

export function getActiveObstacles(): ObstacleSet | undefined {
  return active
}

export function setActiveObstacles(set: ObstacleSet | undefined): void {
  active = set
  blocked = new Uint8Array(CELL_COUNT)
  if (!set) return
  for (let cz = 0; cz < GRID; cz++) {
    for (let cx = 0; cx < GRID; cx++) {
      const x = (cx + 0.5) * OBSTACLE_CELL
      const z = (cz + 0.5) * OBSTACLE_CELL
      // A cell is blocked if any shape touches it (conservative, so thin walls
      // and tree lines never leave a diagonal seam); carves test the centre.
      if (set.blocked.some((shape) => shapeTouchesCell(shape, x, z)) && !set.carve.some((c) => insideRect(c, x, z))) {
        blocked[cz * GRID + cx] = 1
      }
    }
  }
}

const HALF_CELL = OBSTACLE_CELL / 2

function shapeTouchesCell(shape: Obstacle, x: number, z: number): boolean {
  if (shape.kind === 'circle') {
    const nx = Math.max(x - HALF_CELL, Math.min(shape.x, x + HALF_CELL))
    const nz = Math.max(z - HALF_CELL, Math.min(shape.z, z + HALF_CELL))
    const dx = nx - shape.x
    const dz = nz - shape.z
    return dx * dx + dz * dz <= shape.r * shape.r
  }
  if (shape.kind === 'rect') return Math.abs(x - shape.x) <= shape.hx + HALF_CELL && Math.abs(z - shape.z) <= shape.hz + HALF_CELL
  return distanceToPolyline(shape.points, x, z) <= shape.width / 2 + HALF_CELL * 0.7
}

/** Point-in-shape test against the raw (unrasterised) shapes; used by decorators. */
export function insideAnyObstacle(set: ObstacleSet, x: number, z: number): boolean {
  return set.blocked.some((shape) => insideShape(shape, x, z)) && !set.carve.some((c) => insideRect(c, x, z))
}

function insideRect(rect: { x: number; z: number; hx: number; hz: number }, x: number, z: number): boolean {
  return Math.abs(x - rect.x) <= rect.hx && Math.abs(z - rect.z) <= rect.hz
}

function insideShape(shape: Obstacle, x: number, z: number): boolean {
  if (shape.kind === 'circle') {
    const dx = x - shape.x
    const dz = z - shape.z
    return dx * dx + dz * dz <= shape.r * shape.r
  }
  if (shape.kind === 'rect') return insideRect(shape, x, z)
  return distanceToPolyline(shape.points, x, z) <= shape.width / 2
}

/** Distance from a point to the nearest segment of a polyline. */
export function distanceToPolyline(points: Point[], x: number, z: number): number {
  let best = Infinity
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]
    const b = points[i + 1]
    const abx = b.x - a.x
    const abz = b.z - a.z
    const lengthSq = abx * abx + abz * abz
    let t = lengthSq > 0 ? ((x - a.x) * abx + (z - a.z) * abz) / lengthSq : 0
    t = Math.max(0, Math.min(1, t))
    const px = a.x + abx * t - x
    const pz = a.z + abz * t - z
    const d = Math.sqrt(px * px + pz * pz)
    if (d < best) best = d
  }
  return best
}

function cellOf(v: number): number {
  return Math.max(0, Math.min(GRID - 1, Math.floor(v / OBSTACLE_CELL)))
}

function cellBlocked(cx: number, cz: number): boolean {
  if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return true
  return blocked[cz * GRID + cx] === 1
}

/** Is this world point on blocked ground? (No obstacles active: never.) */
export function isPointBlocked(x: number, z: number): boolean {
  if (!active) return false
  return cellBlocked(Math.floor(x / OBSTACLE_CELL), Math.floor(z / OBSTACLE_CELL))
}

/** The point itself if walkable, else the centre of the closest free cell. */
export function nearestWalkable(x: number, z: number): Point {
  if (!isPointBlocked(x, z)) return { x, z }
  const cx = cellOf(x)
  const cz = cellOf(z)
  for (let ring = 1; ring < GRID; ring++) {
    let best: Point | undefined
    let bestDistance = Infinity
    for (let dz = -ring; dz <= ring; dz++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue
        const nx = cx + dx
        const nz = cz + dz
        if (cellBlocked(nx, nz)) continue
        const px = (nx + 0.5) * OBSTACLE_CELL
        const pz = (nz + 0.5) * OBSTACLE_CELL
        const d = (px - x) * (px - x) + (pz - z) * (pz - z)
        if (d < bestDistance) {
          bestDistance = d
          best = { x: px, z: pz }
        }
      }
    }
    if (best) return best
  }
  return { x, z }
}

/** Straight segment free of blocked cells (sampled at half a cell). */
export function hasLineOfSight(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax
  const dz = bz - az
  const length = Math.sqrt(dx * dx + dz * dz)
  const steps = Math.max(1, Math.ceil(length / (OBSTACLE_CELL * 0.5)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (isPointBlocked(ax + dx * t, az + dz * t)) return false
  }
  return true
}

// --- A* ---------------------------------------------------------------------

const gScore = new Float64Array(CELL_COUNT)
const fScore = new Float64Array(CELL_COUNT)
const cameFrom = new Int32Array(CELL_COUNT)
const closed = new Uint8Array(CELL_COUNT)
const inOpen = new Uint8Array(CELL_COUNT)
const heap: number[] = []

function heapPush(index: number): void {
  heap.push(index)
  let i = heap.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (fScore[heap[parent]] <= fScore[heap[i]]) break
    const tmp = heap[parent]
    heap[parent] = heap[i]
    heap[i] = tmp
    i = parent
  }
}

function heapPop(): number {
  const top = heap[0]
  const last = heap.pop()!
  if (heap.length > 0) {
    heap[0] = last
    let i = 0
    for (;;) {
      const left = i * 2 + 1
      const right = left + 1
      let smallest = i
      if (left < heap.length && fScore[heap[left]] < fScore[heap[smallest]]) smallest = left
      if (right < heap.length && fScore[heap[right]] < fScore[heap[smallest]]) smallest = right
      if (smallest === i) break
      const tmp = heap[smallest]
      heap[smallest] = heap[i]
      heap[i] = tmp
      i = smallest
    }
  }
  return top
}

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2]
]

/**
 * Waypoints from `from` to `to` around blocked cells, smoothed so units cut
 * straight across open ground. The last waypoint is the exact target when it
 * is walkable, else the nearest free spot. Returns a direct hop when nothing
 * is in the way, and `undefined` only if the start is sealed in.
 */
export function findPath(from: Point, to: Point): Point[] | undefined {
  const goal = nearestWalkable(to.x, to.z)
  if (hasLineOfSight(from.x, from.z, goal.x, goal.z)) return [goal]

  const startFree = nearestWalkable(from.x, from.z)
  const sx = cellOf(startFree.x)
  const sz = cellOf(startFree.z)
  const gx = cellOf(goal.x)
  const gz = cellOf(goal.z)
  const start = sz * GRID + sx
  const target = gz * GRID + gx

  gScore.fill(Infinity)
  closed.fill(0)
  inOpen.fill(0)
  heap.length = 0
  gScore[start] = 0
  fScore[start] = octile(sx, sz, gx, gz)
  cameFrom[start] = -1
  heapPush(start)
  inOpen[start] = 1

  let found = false
  let expanded = 0
  while (heap.length > 0) {
    const current = heapPop()
    inOpen[current] = 0
    if (current === target) {
      found = true
      break
    }
    closed[current] = 1
    if (++expanded > CELL_COUNT) break
    const cx = current % GRID
    const cz = (current - cx) / GRID
    for (const [dx, dz, cost] of NEIGHBORS) {
      const nx = cx + dx
      const nz = cz + dz
      if (cellBlocked(nx, nz)) continue
      // No squeezing diagonally between two blocked cells.
      if (dx !== 0 && dz !== 0 && (cellBlocked(cx + dx, cz) || cellBlocked(cx, cz + dz))) continue
      const next = nz * GRID + nx
      if (closed[next]) continue
      const tentative = gScore[current] + cost
      if (tentative >= gScore[next]) continue
      cameFrom[next] = current
      gScore[next] = tentative
      fScore[next] = tentative + octile(nx, nz, gx, gz)
      if (!inOpen[next]) {
        heapPush(next)
        inOpen[next] = 1
      }
    }
  }
  if (!found) return undefined

  // Walk back, then string-pull: keep only the corners a straight line can't skip.
  const cells: Point[] = []
  for (let node = target; node !== -1; node = cameFrom[node]) {
    const cx = node % GRID
    const cz = (node - cx) / GRID
    cells.push({ x: (cx + 0.5) * OBSTACLE_CELL, z: (cz + 0.5) * OBSTACLE_CELL })
  }
  cells.reverse()
  cells[cells.length - 1] = goal

  const waypoints: Point[] = []
  let anchor: Point = from
  let anchorIndex = -1
  while (anchorIndex < cells.length - 1) {
    // Always advance at least one cell (neighbours see each other), then as far as the eye can.
    let far = anchorIndex + 1
    while (far + 1 < cells.length && hasLineOfSight(anchor.x, anchor.z, cells[far + 1].x, cells[far + 1].z)) far++
    anchor = cells[far]
    anchorIndex = far
    waypoints.push(anchor)
  }
  return waypoints
}

function octile(ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx)
  const dz = Math.abs(az - bz)
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
}
