import { GltfContainer, Material, MeshRenderer, TextureWrapMode, Transform, VisibilityComponent, engine, type Entity } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { MAP_ANCHORS, POSITIONS, RESOURCE_FIELDS, SCENE } from './config'

// Every terrain entity is tracked so island maps (which paint their own sky
// and floating islands at match start) can hide the whole classic battlefield
// and bring it back when a solid-ground map is played again.
const terrainEntities: Entity[] = []

function trackTerrainEntity(entity: Entity): Entity {
  terrainEntities.push(entity)
  return entity
}

export function setClassicTerrainVisible(visible: boolean): void {
  for (const entity of terrainEntities) {
    VisibilityComponent.createOrReplace(entity, { visible })
  }
}

// Terrain pass: one textured ground sheet, large tinted decals that break the
// tiling and mark zones (center basin, worn tracks between the bases), border
// highlands hiding the floor-to-skybox seam, landmark clearings and ruin props.
// The playable field stays flat: pathing, placement and fog of war all assume
// y = 0, so height only lives at the map borders and in decoration.

const DEFAULT_GROUND_TEXTURE = 'assets/textures/moon_ground.png'
let classicGroundTexture = DEFAULT_GROUND_TEXTURE
const groundVisuals: { entity: Entity; tint: Color4 }[] = []
/** World meters covered by one texture repeat. */
const TILE_METERS = 16

// The sheet must sit above y=0: the explorer draws its default parcel grass
// there, and a coplanar plane z-fights with it and vanishes.
const GROUND_Y = 0.02
// Ground decals must stay under the fog tiles (top ~0.18m) so unexplored cells
// stay clean; each layer gets its own height to avoid z-fighting from overhead.
// Within a layer, anything that can overlap a sibling (the random tone patches,
// the side tracks joining the main lane) also gets its own step - two coplanar
// decals flicker no matter how the layers are ordered.
const DECAL_Y = { patch: 0.04, patchStep: 0.004, basin: 0.08, sideTrack: 0.095, track: 0.105, craterFloor: 0.13 }

// ---------------------------------------------------------------------------
// Prop library: Synty Fantasy Kingdom pieces exported through tools/realms/knights.json
// (base on y=0, XZ-centred; footprint/height are the measured glTF bounds in metres).
// placeProp() scales them to world size. The slot names still describe the layout job
// each prop does, not its look: `mesa` is the border cliff, `spire` the pine stand.
// ---------------------------------------------------------------------------

type PropDef = { src: string; footprint: number; height: number; minY: number }

const PROPS = {
  mesa: { src: 'models/kits/knights/env_cliff.gltf', footprint: 9.765, height: 18.473, minY: 0 },
  spire: { src: 'models/kits/knights/env_pines.gltf', footprint: 10.056, height: 23.193, minY: 0 },
  spireB: { src: 'models/kits/knights/env_pines2.gltf', footprint: 15.171, height: 25.451, minY: 0 },
  boulders: { src: 'models/kits/knights/env_rocks.gltf', footprint: 1.888, height: 1.268, minY: 0 },
  craterRim: { src: 'models/kits/knights/env_hedge.gltf', footprint: 5.031, height: 1.414, minY: 0 },
  crystals: { src: 'models/kits/knights/env_tree_thin.gltf', footprint: 1.356, height: 3.741, minY: 0 },
  meteorite: { src: 'models/kits/knights/env_rock_big.gltf', footprint: 0.405, height: 0.288, minY: 0 },
  monolith: { src: 'models/kits/knights/env_statue.gltf', footprint: 1.237, height: 2.738, minY: 0 },
  rover: { src: 'models/kits/knights/env_cart.gltf', footprint: 3.578, height: 1.178, minY: 0 },
  satellite: { src: 'models/kits/knights/env_siege_fallen.gltf', footprint: 20.076, height: 6.499, minY: 0 },
  ship: { src: 'models/kits/knights/env_ruin2.gltf', footprint: 5.514, height: 4.756, minY: 0 },
  crate: { src: 'models/kits/knights/env_crates.gltf', footprint: 3.25, height: 2.142, minY: 0 },
  vent: { src: 'models/kits/knights/env_tree_dead.gltf', footprint: 1.589, height: 8.986, minY: 0 },
  grass: { src: 'models/kits/knights/env_grass.gltf', footprint: 0.478, height: 0.869, minY: 0 },
  flowers: { src: 'models/kits/knights/env_flowers.gltf', footprint: 1.477, height: 0.745, minY: 0 }
} satisfies Record<string, PropDef>

/** Spawns a prop scaled uniformly, base resting on the ground (sink > 0 buries it). */
function placeProp(prop: PropDef, x: number, z: number, scale: number, yawDegrees: number, sink = 0): void {
  const entity = trackTerrainEntity(engine.addEntity())
  Transform.create(entity, {
    position: Vector3.create(x, -prop.minY * scale - sink, z),
    rotation: Quaternion.fromEulerDegrees(0, yawDegrees, 0),
    scale: Vector3.create(scale, scale, scale)
  })
  GltfContainer.create(entity, { src: prop.src })
}

function scaleForHeight(prop: PropDef, targetHeight: number): number {
  return targetHeight / prop.height
}

let seed = 20260804
function random(): number {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

export function buildTerrain(): void {
  seed = 20260804
  createGroundSheet()
  createZoneDecals()
  createBorderHighlands()
  createLandmarkCraters()
  createLandmarks()
  createBorderAccents()
  scatterSurfaceDetail()
}

// ---------------------------------------------------------------------------
// Ground sheet.
// ---------------------------------------------------------------------------

/** UVs for a plane whose texture repeats `repeats` times on both axes. */
function repeatedPlaneUvs(repeats: number): number[] {
  return [
    // North face.
    0, 0, repeats, 0, repeats, repeats, 0, repeats,
    // South face.
    repeats, 0, 0, 0, 0, repeats, repeats, repeats
  ]
}

// Cools and slightly darkens the sunlit floor toward the tone of the
// self-lit horizon walls; applied under every decal tint so they shift together.
const BASE_GROUND_TINT = Color4.create(0.9, 0.9, 0.96, 1)

function groundMaterial(entity: Entity, tint: Color4): void {
  groundVisuals.push({ entity, tint })
  applyGroundMaterial(entity, tint)
}

function applyGroundMaterial(entity: Entity, tint: Color4): void {
  Material.setPbrMaterial(entity, {
    texture: Material.Texture.Common({ src: classicGroundTexture, wrapMode: TextureWrapMode.TWM_REPEAT }),
    albedoColor: Color4.create(tint.r * BASE_GROUND_TINT.r, tint.g * BASE_GROUND_TINT.g, tint.b * BASE_GROUND_TINT.b, 1),
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    castShadows: false
  })
}

/** Swap the classic solid-ground sheet (Crown / Reliquaries) without rebuilding props. */
export function setClassicGroundTexture(src: string): void {
  if (classicGroundTexture === src) return
  classicGroundTexture = src
  for (const visual of groundVisuals) applyGroundMaterial(visual.entity, visual.tint)
}

function createGroundSheet(): void {
  const ground = trackTerrainEntity(engine.addEntity())
  Transform.create(ground, {
    position: Vector3.create(SCENE.center, GROUND_Y, SCENE.center),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(SCENE.size, SCENE.size, 1)
  })
  MeshRenderer.setPlane(ground, repeatedPlaneUvs(SCENE.size / TILE_METERS))
  groundMaterial(ground, Color4.create(1, 1, 1, 1))
}

/** A flat square of the same ground texture with a tint, used for patches, tracks and basins. */
function createGroundDecal(center: Vector3, size: number, y: number, yawDegrees: number, tint: Color4, length?: number): void {
  const decal = trackTerrainEntity(engine.addEntity())
  Transform.create(decal, {
    position: Vector3.create(center.x, y, center.z),
    rotation: Quaternion.fromEulerDegrees(90, yawDegrees, 0),
    scale: Vector3.create(size, length ?? size, 1)
  })
  MeshRenderer.setPlane(decal, repeatedPlaneUvs(Math.max(1, Math.round((length ?? size) / TILE_METERS))))
  groundMaterial(decal, tint)
}

// ---------------------------------------------------------------------------
// Zone decals: tiling breakup, contested-center basin, worn tracks.
// ---------------------------------------------------------------------------

function createZoneDecals(): void {
  // Large soft tone shifts so the 16m texture tiling never reads as a grid.
  const patchTints = [Color4.create(0.88, 0.88, 0.92, 1), Color4.create(1.1, 1.08, 1.05, 1), Color4.create(0.92, 0.94, 1.02, 1)]
  for (let i = 0; i < 9; i++) {
    const size = 26 + random() * 34
    createGroundDecal(
      Vector3.create(12 + random() * (SCENE.size - 24), 0, 12 + random() * (SCENE.size - 24)),
      size,
      // Random placement means patches overlap each other; each takes its own height.
      DECAL_Y.patch + i * DECAL_Y.patchStep,
      random() * 360,
      patchTints[i % patchTints.length]
    )
  }

  // Slightly darker "impact sea" basin under the contested center resources.
  createGroundDecal(Vector3.create(BASIN_PATCHES[0].x, 0, BASIN_PATCHES[0].z), BASIN_PATCHES[0].size, DECAL_Y.basin, 15, Color4.create(0.88, 0.88, 0.93, 1))
  createGroundDecal(Vector3.create(BASIN_PATCHES[1].x, 0, BASIN_PATCHES[1].z), BASIN_PATCHES[1].size, DECAL_Y.basin + 0.01, 40, Color4.create(0.84, 0.84, 0.89, 1))

  // Worn track: a subtle hint of beaten dust along the attack lane between the
  // bases - kept faint so it reads as wear, not as a paved road.
  const base = POSITIONS.base
  const enemy = POSITIONS.enemyTemple
  const laneYaw = (Math.atan2(enemy.x - base.x, enemy.z - base.z) * 180) / Math.PI
  const laneLength = Vector3.distance(Vector3.create(base.x, 0, base.z), Vector3.create(enemy.x, 0, enemy.z))
  createGroundDecal(
    Vector3.create((base.x + enemy.x) / 2, 0, (base.z + enemy.z) / 2),
    6,
    DECAL_Y.track,
    laneYaw,
    Color4.create(0.9, 0.89, 0.92, 1),
    laneLength * 0.92
  )
  // Side tracks from the lane out to the mirrored expansions. They sit a step
  // below the main track so the junctions where they meet don't z-fight.
  createGroundDecal(Vector3.create(38, 0, 52), 4, DECAL_Y.sideTrack, 125, Color4.create(0.94, 0.93, 0.95, 1), 52)
  createGroundDecal(Vector3.create(122, 0, 108), 4, DECAL_Y.sideTrack, 125, Color4.create(0.94, 0.93, 0.95, 1), 52)
}

// ---------------------------------------------------------------------------
// Border highlands.
// ---------------------------------------------------------------------------

/** Zones the highlands must not spill into: every base anchor and edge-adjacent resources. */
const PROTECTED_POINTS: { x: number; z: number; radius: number }[] = [
  ...MAP_ANCHORS.map((anchor) => ({ x: anchor.temple.x, z: anchor.temple.z, radius: 22 })),
  ...RESOURCE_FIELDS.map((field) => ({ x: field.center.x, z: field.center.z, radius: field.radius + 7 }))
]

function isProtected(x: number, z: number, clearance: number): boolean {
  return PROTECTED_POINTS.some((point) => {
    const dx = point.x - x
    const dz = point.z - z
    return Math.sqrt(dx * dx + dz * dz) < point.radius + clearance
  })
}

/** Distance from a point to the base-to-base attack lane. */
function distanceToMainLane(x: number, z: number): number {
  const ax = POSITIONS.base.x
  const az = POSITIONS.base.z
  const bx = POSITIONS.enemyTemple.x
  const bz = POSITIONS.enemyTemple.z
  const abx = bx - ax
  const abz = bz - az
  const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz)))
  const dx = x - (ax + abx * t)
  const dz = z - (az + abz * t)
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Readability rule for decor: the battlefield itself stays quiet. Anything with
 * volume keeps out of the bases, the resource fields and the main attack lane.
 */
function isClearOfGameplay(x: number, z: number, clearance: number): boolean {
  return !isProtected(x, z, clearance) && distanceToMainLane(x, z) > 9 + clearance
}

function createBorderHighlands(): void {
  const size = SCENE.size
  const step = 11

  for (let along = step / 2; along < size; along += step) {
    for (const edge of ['south', 'north', 'west', 'east'] as const) {
      const inset = 2 + random() * 4
      const x = edge === 'south' || edge === 'north' ? along : edge === 'west' ? inset : size - inset
      const z = edge === 'west' || edge === 'east' ? along : edge === 'south' ? inset : size - inset
      if (isProtected(x, z, 4)) {
        // Near bases and edge resources big mesas would crowd gameplay, but bare
        // floor meeting the wall reads as a hard seam - lay low rubble instead.
        createLowBerm(edge, along, size)
        continue
      }
      // Skip some slots so the rim has gaps and reads as natural rockfall.
      if (random() < 0.2) continue
      createMesaCluster(x, z, 4 + random() * 6)
    }
  }

  // Bigger anchor peaks in the two unowned corners.
  createMesaCluster(7, size - 7, 11)
  createMesaCluster(size - 7, 7, 11)
}

/** Knee-high rubble row hugging the wall where tall mesas are not allowed. */
function createLowBerm(edge: 'south' | 'north' | 'west' | 'east', along: number, size: number): void {
  const chunks = 2 + Math.floor(random() * 2)
  for (let i = 0; i < chunks; i++) {
    const offset = along - 5 + random() * 10
    const inset = 1 + random() * 1.8
    const x = edge === 'south' || edge === 'north' ? offset : edge === 'west' ? inset : size - inset
    const z = edge === 'west' || edge === 'east' ? offset : edge === 'south' ? inset : size - inset
    placeProp(PROPS.boulders, x, z, scaleForHeight(PROPS.boulders, 0.5 + random() * 0.8), random() * 360)
  }
}

/** A border formation: a mesa slab, often a spire behind it, boulders at the foot. */
function createMesaCluster(x: number, z: number, height: number): void {
  placeProp(PROPS.mesa, x, z, scaleForHeight(PROPS.mesa, height), random() * 360, height * 0.04)

  if (random() < 0.65) {
    const spireHeight = height * (1 + random() * 0.7)
    placeProp(
      random() < 0.5 ? PROPS.spire : PROPS.spireB,
      x + (random() - 0.5) * height * 1.4,
      z + (random() - 0.5) * height * 1.4,
      spireHeight / PROPS.spire.height,
      random() * 360,
      spireHeight * 0.03
    )
  }

  if (random() < 0.7) {
    placeProp(
      PROPS.boulders,
      x + (random() - 0.5) * height * 2.2,
      z + (random() - 0.5) * height * 2.2,
      scaleForHeight(PROPS.boulders, 0.7 + random() * 1),
      random() * 360
    )
  }
}

// ---------------------------------------------------------------------------
// Landmark craters.
// ---------------------------------------------------------------------------

/** Landmark crater positions, also drawn on the minimap's terrain layer. */
export const CRATERS: { x: number; z: number; radius: number }[] = [
  // Off the main diagonal lane and clear of every resource field.
  { x: 38, z: 104, radius: 10 },
  { x: 122, z: 56, radius: 10 },
  { x: 58, z: 34, radius: 5.5 },
  { x: 102, z: 126, radius: 5.5 }
]

/** Center basin decal footprints, also drawn on the minimap's terrain layer. */
export const BASIN_PATCHES: { x: number; z: number; size: number }[] = [
  { x: 80, z: 80, size: 52 },
  { x: 72, z: 88, size: 34 }
]

function createLandmarkCraters(): void {
  for (const crater of CRATERS) {
    // Slightly darkened floor.
    createGroundDecal(Vector3.create(crater.x, 0, crater.z), crater.radius * 2, DECAL_Y.craterFloor, random() * 360, Color4.create(0.82, 0.82, 0.88, 1))

    // Raised rim of curved ridge segments laid tangentially around the circle.
    const segments = Math.max(6, Math.round(crater.radius * 0.9))
    const segmentLength = ((Math.PI * 2 * crater.radius) / segments) * 1.12
    for (let i = 0; i < segments; i++) {
      if (random() < 0.12) continue
      const angle = (i / segments) * Math.PI * 2 + random() * 0.15
      placeProp(
        PROPS.craterRim,
        crater.x + Math.cos(angle) * crater.radius,
        crater.z + Math.sin(angle) * crater.radius,
        segmentLength / PROPS.craterRim.footprint,
        (angle * 180) / Math.PI + 90 + (random() - 0.5) * 14,
        0.06
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Landmarks: wrecks and curiosities that make regions recognizable.
// ---------------------------------------------------------------------------

function createLandmarks(): void {
  // Burnt-out timber hall frame in the north-west clearing.
  placeProp(PROPS.ship, 38, 104, 8 / PROPS.ship.footprint, 205, 0.05)
  // Fallen siege tower in the south-east clearing, left from the last war.
  placeProp(PROPS.satellite, 122, 56, 9 / PROPS.satellite.footprint, 40, 0.05)
  // Standing boulders in the two small hollows.
  placeProp(PROPS.meteorite, 58, 34, scaleForHeight(PROPS.meteorite, 2.4), random() * 360, 0.3)
  placeProp(PROPS.meteorite, 102, 126, scaleForHeight(PROPS.meteorite, 2.2), random() * 360, 0.25)
  // Statue of the old king watching over the contested center from the basin's edge.
  placeProp(PROPS.monolith, 93, 93, scaleForHeight(PROPS.monolith, 7), 25)
  // Wrecked cart just off the main lane, as if it never finished the trip.
  placeProp(PROPS.rover, 54, 44, scaleForHeight(PROPS.rover, 2), 130)
  // Supply crates tucked behind each keep against the map edge, out of the
  // mining routes and build space.
  placeProp(PROPS.crate, 2.2, 12.5, scaleForHeight(PROPS.crate, 1.1), 15)
  placeProp(PROPS.crate, 3.6, 10.8, scaleForHeight(PROPS.crate, 0.85), 70)
  placeProp(PROPS.crate, 157.8, 147.5, scaleForHeight(PROPS.crate, 1.1), 200)
  placeProp(PROPS.crate, 156.4, 149.2, scaleForHeight(PROPS.crate, 0.85), 255)
}

// ---------------------------------------------------------------------------
// Border accents: lone trees and dead trunks along the highland ring, far from
// anything harvestable or walkable so nothing decorative reads as a resource
// node from the RTS camera.
// ---------------------------------------------------------------------------

function createBorderAccents(): void {
  let placed = 0
  let attempts = 0
  while (placed < 14 && attempts < 110) {
    attempts++
    const alongEdge = random() * SCENE.size
    const inset = 4 + random() * 6
    const edge = Math.floor(random() * 4)
    const x = edge === 0 ? alongEdge : edge === 1 ? alongEdge : edge === 2 ? inset : SCENE.size - inset
    const z = edge === 0 ? inset : edge === 1 ? SCENE.size - inset : alongEdge
    if (!isClearOfGameplay(x, z, 4)) continue
    if (placed % 3 === 2) {
      placeProp(PROPS.vent, x, z, scaleForHeight(PROPS.vent, 3.5 + random() * 2), random() * 360, 0.05)
    } else {
      placeProp(PROPS.crystals, x, z, scaleForHeight(PROPS.crystals, 4.5 + random() * 3), random() * 360, 0.05)
    }
    placed++
  }
}

// ---------------------------------------------------------------------------
// Small surface detail (rocks, worn earth patches, grass and flowers).
// ---------------------------------------------------------------------------

function scatterSurfaceDetail(): void {
  // Volumetric props keep their distance from each other so the field never
  // reads as junk piles; flat detail (dust rings, tiny shards) can go anywhere.
  const placedProps: { x: number; z: number }[] = []
  const MIN_PROP_SPACING = 14

  for (let i = 0; i < 90; i++) {
    const x = 5 + random() * (SCENE.size - 10)
    const z = 5 + random() * (SCENE.size - 10)
    const roll = random()

    if (roll < 0.28) {
      // Loose rocks - only in dead space, spread out.
      if (!isClearOfGameplay(x, z, 2)) continue
      if (placedProps.some((prop) => (prop.x - x) ** 2 + (prop.z - z) ** 2 < MIN_PROP_SPACING ** 2)) continue
      placedProps.push({ x, z })
      placeProp(PROPS.boulders, x, z, scaleForHeight(PROPS.boulders, 0.3 + random() * 0.4), random() * 360)
    } else if (roll < 0.72) {
      // Worn earth patch.
      const entity = trackTerrainEntity(engine.addEntity())
      const size = 1.2 + random() * 2.4
      Transform.create(entity, {
        position: Vector3.create(x, 0.14, z),
        scale: Vector3.create(size, 0.012, size)
      })
      MeshRenderer.setCylinder(entity)
      Material.setPbrMaterial(entity, {
        albedoColor: Color4.create(0.36, 0.33, 0.22, 1),
        metallic: 0,
        roughness: 1,
        specularIntensity: 0,
        castShadows: false
      })
    } else {
      // Grass tufts and the odd flower patch; never on top of a resource line.
      if (isProtected(x, z, 3)) continue
      const prop = random() < 0.25 ? PROPS.flowers : PROPS.grass
      placeProp(prop, x, z, 0.8 + random() * 0.8, random() * 360)
    }
  }
}
