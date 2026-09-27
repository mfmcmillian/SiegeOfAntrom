// Slice 0 benchmark: N skinned Synty knights, each its own GltfContainer + Animator,
// marching in lanes under the RTS top-down camera. Everything here is throwaway;
// the numbers it produces decide whether Siege of Antrom can use one Animator per
// unit or needs an LOD fallback.

import { Animator, Entity, GltfContainer, Material, MeshRenderer, Transform, engine } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'

export type BenchMode = 'walk' | 'attack' | 'idle' | 'static'

const MODES: BenchMode[] = ['walk', 'attack', 'idle', 'static']

/** Clip per mode, as exported by DG's export-enemy-bodies.py. `static` removes the Animator entirely. */
const CLIPS: Record<Exclude<BenchMode, 'static'>, string> = {
  walk: 'A_MOD_BL_Walk_F_Masc',
  attack: 'attack_light',
  idle: 'A_MOD_BL_Idle_Standing_Masc'
}

const BODIES = [
  { src: 'models/kn/kn-knight.gltf', tris: 3480 },
  { src: 'models/kn/kn-soldier.gltf', tris: 2487 },
  { src: 'models/kn/kn-soldier-b.gltf', tris: 3128 },
  { src: 'models/kn/kn-knight-b.gltf', tris: 2840 },
  { src: 'models/kn/kn-knight-c.gltf', tris: 2848 }
]

/** Same scale DecentraCraft applies to melee GLBs so units read at RTS camera height. */
const UNIT_SCALE = 1.6
const MOVE_SPEED = 3
const GRID_SPACING = 3
const GRID_COLUMNS = 15
/** March band: units ping-pong this far either side of the centre line. */
const HALF_LANE = 14
export const CENTER = { x: 80, z: 80 }
/** LOD mode: bodies farther than this from the camera focus freeze their Animator. */
export const LOD_RADIUS = 18

interface Unit {
  root: Entity
  model: Entity
  body: number
  x: number
  z: number
  dir: 1 | -1
  animating: boolean
}

export const bench = {
  count: 150,
  mode: 'walk' as BenchMode,
  lod: false,
  /** Exponential moving average of scene-side frames per second. */
  fps: 0,
  frameMs: 0,
  focus: { x: CENTER.x, z: CENTER.z - 5 }
}

const units: Unit[] = []

export function unitCount(): number {
  return units.length
}

export function animatedTris(): number {
  let total = 0
  for (const u of units) if (u.animating) total += BODIES[u.body].tris
  return total
}

export function totalTris(): number {
  let total = 0
  for (const u of units) total += BODIES[u.body].tris
  return total
}

export function setCount(next: number): void {
  bench.count = Math.max(0, Math.min(600, Math.round(next)))
  while (units.length < bench.count) spawnUnit(units.length)
  while (units.length > bench.count) despawnUnit()
  console.log(`[bench] count=${units.length} mode=${bench.mode} lod=${bench.lod}`)
}

export function cycleMode(): void {
  const next = MODES[(MODES.indexOf(bench.mode) + 1) % MODES.length]
  setMode(next)
}

export function setMode(mode: BenchMode): void {
  bench.mode = mode
  for (const u of units) applyAnimation(u, true)
  console.log(`[bench] count=${units.length} mode=${bench.mode} lod=${bench.lod}`)
}

export function toggleLod(): void {
  bench.lod = !bench.lod
  for (const u of units) applyAnimation(u, true)
  console.log(`[bench] count=${units.length} mode=${bench.mode} lod=${bench.lod}`)
}

function spawnUnit(index: number): void {
  const col = index % GRID_COLUMNS
  const row = Math.floor(index / GRID_COLUMNS)
  const x = CENTER.x + (col - (GRID_COLUMNS - 1) / 2) * GRID_SPACING
  // Stagger rows along the lane so the column doesn't move as one block.
  const z = CENTER.z + ((row * 7) % (HALF_LANE * 2)) - HALF_LANE
  const dir: 1 | -1 = row % 2 === 0 ? 1 : -1

  const root = engine.addEntity()
  Transform.create(root, {
    position: Vector3.create(x, 0, z),
    rotation: Quaternion.fromEulerDegrees(0, dir === 1 ? 0 : 180, 0)
  })

  const model = engine.addEntity()
  Transform.create(model, { parent: root, scale: Vector3.create(UNIT_SCALE, UNIT_SCALE, UNIT_SCALE) })
  const body = index % BODIES.length
  GltfContainer.create(model, { src: BODIES[body].src })

  const unit: Unit = { root, model, body, x, z, dir, animating: false }
  applyAnimation(unit, false)
  units.push(unit)
}

function despawnUnit(): void {
  const unit = units.pop()
  if (!unit) return
  engine.removeEntity(unit.model)
  engine.removeEntity(unit.root)
}

function wantsAnimation(unit: Unit): boolean {
  if (bench.mode === 'static') return false
  if (!bench.lod) return true
  const dx = unit.x - bench.focus.x
  const dz = unit.z - bench.focus.z
  return dx * dx + dz * dz <= LOD_RADIUS * LOD_RADIUS
}

/** Ensure the body's Animator matches the current mode/LOD. `force` re-applies the clip even if already animating. */
function applyAnimation(unit: Unit, force: boolean): void {
  const wants = wantsAnimation(unit)
  if (!wants) {
    if (unit.animating || force) {
      if (Animator.has(unit.model)) Animator.deleteFrom(unit.model)
      unit.animating = false
    }
    return
  }
  if (unit.animating && !force) return
  const clip = CLIPS[bench.mode as Exclude<BenchMode, 'static'>]
  if (!Animator.has(unit.model)) {
    Animator.create(unit.model, {
      states: [{ clip, playing: true, loop: true, speed: 1, weight: 1 }]
    })
  } else {
    const animator = Animator.getMutable(unit.model)
    animator.states = [{ clip, playing: true, loop: true, speed: 1, weight: 1 }]
  }
  unit.animating = true
}

let lodTimer = 0

function marchSystem(dt: number): void {
  const moving = bench.mode === 'walk'
  for (const u of units) {
    if (moving) {
      u.z += u.dir * MOVE_SPEED * dt
      if (u.z > CENTER.z + HALF_LANE) {
        u.z = CENTER.z + HALF_LANE
        u.dir = -1
        Transform.getMutable(u.root).rotation = Quaternion.fromEulerDegrees(0, 180, 0)
      } else if (u.z < CENTER.z - HALF_LANE) {
        u.z = CENTER.z - HALF_LANE
        u.dir = 1
        Transform.getMutable(u.root).rotation = Quaternion.fromEulerDegrees(0, 0, 0)
      }
      Transform.getMutable(u.root).position = Vector3.create(u.x, 0, u.z)
    }
  }

  if (bench.lod) {
    lodTimer += dt
    if (lodTimer > 0.25) {
      lodTimer = 0
      for (const u of units) applyAnimation(u, false)
    }
  }
}

let logTimer = 0

function fpsSystem(dt: number): void {
  if (dt <= 0) return
  const ms = dt * 1000
  bench.frameMs = bench.frameMs === 0 ? ms : bench.frameMs * 0.95 + ms * 0.05
  bench.fps = 1000 / bench.frameMs
  logTimer += dt
  if (logTimer >= 5) {
    logTimer = 0
    console.log(
      `[bench] stats ${JSON.stringify({
        count: units.length,
        mode: bench.mode,
        lod: bench.lod,
        animatedTris: animatedTris(),
        totalTris: totalTris(),
        sceneFps: Math.round(bench.fps),
        frameMs: Math.round(bench.frameMs * 10) / 10
      })}`
    )
  }
}

export function buildGround(): void {
  const ground = engine.addEntity()
  Transform.create(ground, {
    position: Vector3.create(80, 0, 80),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(160, 160, 1)
  })
  MeshRenderer.setPlane(ground)
  Material.setPbrMaterial(ground, {
    albedoColor: Color4.create(0.32, 0.4, 0.28, 1),
    roughness: 1,
    metallic: 0
  })
}

export function startBench(): void {
  buildGround()
  setCount(bench.count)
  engine.addSystem(marchSystem)
  engine.addSystem(fpsSystem)
}
