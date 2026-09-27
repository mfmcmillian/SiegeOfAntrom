import { engine, GltfContainer, Material, MaterialTransparencyMode, MeshRenderer, TextureWrapMode, Transform, type Entity } from '@dcl/sdk/ecs'
import { Color3, Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { MAP_ANCHORS, RESOURCE_FIELDS, SCENE } from './config'
import {
  CAMPS,
  CROSSINGS,
  CROWN_OBSTACLES,
  FALLEN_TOWERS,
  FORESTS,
  HAMLETS,
  HAMLET_HOUSE_RADIUS,
  OUTCROPS,
  RIVERS,
  RIVER_BANK_WIDTH,
  RIVER_WIDTH,
  ROADS,
  ROAD_WIDTH,
  RUIN_FOUNTAIN,
  RUIN_STATUE,
  RUIN_TOWERS,
  RUIN_WALLS,
  STANDING_TOWERS,
  crossingHalfWidth,
  type Crossing
} from './crownLayout'
import { setEnvironmentTheme } from './environment'
import { distanceToPolyline, insideAnyObstacle, type Point } from './obstacles'
import { setClassicTerrainVisible } from './terrain'

// ---------------------------------------------------------------------------
// The Crown battlefield: built at match start over the hidden classic terrain
// (same pattern as the island maps) from the layout in crownLayout.ts, so the
// tree lines, river banks and ruin walls the player sees are exactly the
// shapes that block pathing. Synty Fantasy Kingdom + Alpine Mountain pieces.
// ---------------------------------------------------------------------------

const entities: Entity[] = []
let built = false

function spawn(): Entity {
  const entity = engine.addEntity()
  entities.push(entity)
  return entity
}

let seed = 4471
function random(): number {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
function range(min: number, max: number): number {
  return min + random() * (max - min)
}
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length) % items.length]
}

// --- Prop library (measured glTF bounds, metres; base on y=0, XZ-centred) -----

type Prop = { src: string; sx: number; h: number; sz: number }

const P = {
  env_pines: { src: 'models/kits/knights/env_pines.gltf', sx: 9.91, h: 23.193, sz: 10.056 },
  env_pines2: { src: 'models/kits/knights/env_pines2.gltf', sx: 15.171, h: 25.451, sz: 10.855 },
  env_pines3: { src: 'models/kits/knights/env_pines3.gltf', sx: 7.463, h: 23.193, sz: 4.355 },
  env_pines4: { src: 'models/kits/knights/env_pines4.gltf', sx: 5.538, h: 21.769, sz: 5.836 },
  env_tree_large: { src: 'models/kits/knights/env_tree_large.gltf', sx: 14.527, h: 16.888, sz: 9.883 },
  env_tree_large2: { src: 'models/kits/knights/env_tree_large2.gltf', sx: 18.094, h: 13.732, sz: 11.516 },
  env_tree_round: { src: 'models/kits/knights/env_tree_round.gltf', sx: 2.888, h: 5.982, sz: 2.391 },
  env_tree_round2: { src: 'models/kits/knights/env_tree_round2.gltf', sx: 3.382, h: 8.079, sz: 3.221 },
  env_tree_round3: { src: 'models/kits/knights/env_tree_round3.gltf', sx: 4.428, h: 8.268, sz: 3.858 },
  env_tree_thin: { src: 'models/kits/knights/env_tree_thin.gltf', sx: 1.198, h: 3.741, sz: 1.356 },
  env_tree_thin2: { src: 'models/kits/knights/env_tree_thin2.gltf', sx: 1.334, h: 4.832, sz: 1.622 },
  env_tree_dead: { src: 'models/kits/knights/env_tree_dead.gltf', sx: 1.41, h: 8.986, sz: 1.589 },
  env_tree_dead2: { src: 'models/kits/knights/env_tree_dead2.gltf', sx: 0.591, h: 5.047, sz: 0.579 },
  env_bush: { src: 'models/kits/knights/env_bush.gltf', sx: 3.696, h: 2.667, sz: 3.546 },
  env_bush2: { src: 'models/kits/knights/env_bush2.gltf', sx: 5.181, h: 3.771, sz: 3.387 },
  env_bush_flowers: { src: 'models/kits/knights/env_bush_flowers.gltf', sx: 0.865, h: 1.571, sz: 0.811 },
  env_fern: { src: 'models/kits/knights/env_fern.gltf', sx: 1.907, h: 0.759, sz: 1.919 },
  env_reeds: { src: 'models/kits/knights/env_reeds.gltf', sx: 0.769, h: 2.19, sz: 0.752 },
  env_reeds2: { src: 'models/kits/knights/env_reeds2.gltf', sx: 0.878, h: 2.142, sz: 0.924 },
  env_lily: { src: 'models/kits/knights/env_lily.gltf', sx: 0.95, h: 1.15, sz: 0.753 },
  env_grass: { src: 'models/kits/knights/env_grass.gltf', sx: 0.471, h: 0.869, sz: 0.478 },
  env_grass2: { src: 'models/kits/knights/env_grass2.gltf', sx: 0.329, h: 0.467, sz: 0.437 },
  env_flowers: { src: 'models/kits/knights/env_flowers.gltf', sx: 1.041, h: 0.745, sz: 1.477 },
  env_flowers2: { src: 'models/kits/knights/env_flowers2.gltf', sx: 0.902, h: 0.503, sz: 0.953 },
  env_flowers3: { src: 'models/kits/knights/env_flowers3.gltf', sx: 0.384, h: 0.386, sz: 0.495 },
  env_sunflower: { src: 'models/kits/knights/env_sunflower.gltf', sx: 0.542, h: 1.574, sz: 0.529 },
  env_cliff: { src: 'models/kits/knights/env_cliff.gltf', sx: 9.103, h: 18.473, sz: 9.765 },
  env_cliff2: { src: 'models/kits/knights/env_cliff2.gltf', sx: 11.503, h: 20.552, sz: 12.394 },
  env_cliff3: { src: 'models/kits/knights/env_cliff3.gltf', sx: 9.943, h: 13.777, sz: 8.945 },
  env_rocks: { src: 'models/kits/knights/env_rocks.gltf', sx: 1.669, h: 1.268, sz: 1.888 },
  env_rock_chunk2: { src: 'models/kits/knights/env_rock_chunk2.gltf', sx: 2.726, h: 1.97, sz: 3.293 },
  env_rock_chunk3: { src: 'models/kits/knights/env_rock_chunk3.gltf', sx: 3.709, h: 3.106, sz: 3.314 },
  bld_bridge: { src: 'models/kits/knights/bld_bridge.gltf', sx: 5.615, h: 0.399, sz: 5.491 },
  bld_bridge_railing: { src: 'models/kits/knights/bld_bridge_railing.gltf', sx: 0.34, h: 1.201, sz: 5.008 },
  prop_path_rocks: { src: 'models/kits/knights/prop_path_rocks.gltf', sx: 0.935, h: 0.156, sz: 0.81 },
  prop_path_rocks2: { src: 'models/kits/knights/prop_path_rocks2.gltf', sx: 0.48, h: 0.151, sz: 0.534 },
  prop_path_step: { src: 'models/kits/knights/prop_path_step.gltf', sx: 2.065, h: 0.221, sz: 0.382 },
  env_stonewall: { src: 'models/kits/knights/env_stonewall.gltf', sx: 5.129, h: 1.089, sz: 0.608 },
  env_stonewall2: { src: 'models/kits/knights/env_stonewall2.gltf', sx: 4.257, h: 1.076, sz: 0.608 },
  env_stonewall_pillar: { src: 'models/kits/knights/env_stonewall_pillar.gltf', sx: 1.007, h: 1.167, sz: 1.004 },
  env_structure: { src: 'models/kits/knights/env_structure.gltf', sx: 3.803, h: 4.756, sz: 0.404 },
  env_structure3: { src: 'models/kits/knights/env_structure3.gltf', sx: 5.514, h: 3.627, sz: 1.662 },
  env_ruin2: { src: 'models/kits/knights/env_ruin2.gltf', sx: 5.514, h: 4.756, sz: 1.946 },
  castle_ruin_bottom: { src: 'models/kits/knights/castle_ruin_bottom.gltf', sx: 2.623, h: 5.39, sz: 0.509 },
  castle_ruin_middle: { src: 'models/kits/knights/castle_ruin_middle.gltf', sx: 2.623, h: 5.39, sz: 0.509 },
  castle_ruin_top: { src: 'models/kits/knights/castle_ruin_top.gltf', sx: 2.5, h: 5.0, sz: 0.5 },
  castle_ruin_rubble: { src: 'models/kits/knights/castle_ruin_rubble.gltf', sx: 5.034, h: 1.771, sz: 3.517 },
  castle_ruin_block: { src: 'models/kits/knights/castle_ruin_block.gltf', sx: 0.834, h: 0.621, sz: 0.5 },
  castle_pillar: { src: 'models/kits/knights/castle_pillar.gltf', sx: 0.687, h: 5.051, sz: 0.687 },
  prop_statue_hero: { src: 'models/kits/knights/prop_statue_hero.gltf', sx: 1.746, h: 4.392, sz: 1.625 },
  prop_statue_plinth: { src: 'models/kits/knights/prop_statue_plinth.gltf', sx: 1.442, h: 1.872, sz: 1.442 },
  env_fountain: { src: 'models/kits/knights/env_fountain.gltf', sx: 1.926, h: 2.558, sz: 1.926 },
  prop_banner: { src: 'models/kits/knights/prop_banner.gltf', sx: 0.711, h: 2.198, sz: 0.093 },
  prop_flag_pole: { src: 'models/kits/knights/prop_flag_pole.gltf', sx: 0.3, h: 2.654, sz: 0.346 },
  bld_house_ruin: { src: 'models/kits/knights/bld_house_ruin.gltf', sx: 8.379, h: 4.254, sz: 8.358 },
  bld_house_ruin2: { src: 'models/kits/knights/bld_house_ruin2.gltf', sx: 8.358, h: 5.162, sz: 5.864 },
  prop_fence: { src: 'models/kits/knights/prop_fence.gltf', sx: 2.471, h: 1.639, sz: 0.157 },
  prop_fence2: { src: 'models/kits/knights/prop_fence2.gltf', sx: 2.473, h: 1.639, sz: 0.157 },
  prop_fence_gate: { src: 'models/kits/knights/prop_fence_gate.gltf', sx: 2.642, h: 1.043, sz: 0.129 },
  prop_hay_bale: { src: 'models/kits/knights/prop_hay_bale.gltf', sx: 1.381, h: 1.084, sz: 1.084 },
  prop_hay_cart: { src: 'models/kits/knights/prop_hay_cart.gltf', sx: 1.651, h: 1.228, sz: 2.644 },
  prop_hay_pile: { src: 'models/kits/knights/prop_hay_pile.gltf', sx: 2.91, h: 2.511, sz: 3.109 },
  env_farm_row: { src: 'models/kits/knights/env_farm_row.gltf', sx: 1.244, h: 0.359, sz: 8.559 },
  prop_wood_pile: { src: 'models/kits/knights/prop_wood_pile.gltf', sx: 2.092, h: 0.69, sz: 0.693 },
  prop_barrel_stack: { src: 'models/kits/knights/prop_barrel_stack.gltf', sx: 1.061, h: 1.985, sz: 3.705 },
  prop_log: { src: 'models/kits/knights/prop_log.gltf', sx: 0.625, h: 0.767, sz: 5.118 },
  prop_cage_cart: { src: 'models/kits/knights/prop_cage_cart.gltf', sx: 1.143, h: 2.095, sz: 2.0 },
  bld_tent_large_burnt: { src: 'models/kits/knights/bld_tent_large_burnt.gltf', sx: 9.676, h: 4.867, sz: 7.751 },
  bld_tent_round_burnt: { src: 'models/kits/knights/bld_tent_round_burnt.gltf', sx: 5.355, h: 4.727, sz: 7.751 },
  bld_tent_small: { src: 'models/kits/knights/bld_tent_small.gltf', sx: 4.423, h: 4.291, sz: 3.831 },
  bld_tent_open: { src: 'models/kits/knights/bld_tent_open.gltf', sx: 3.201, h: 4.145, sz: 3.201 },
  prop_camp_firepit: { src: 'models/kits/knights/prop_camp_firepit.gltf', sx: 1.066, h: 0.428, sz: 1.06 },
  prop_camp_brazier: { src: 'models/kits/knights/prop_camp_brazier.gltf', sx: 0.554, h: 0.593, sz: 0.554 },
  prop_camp_rack: { src: 'models/kits/knights/prop_camp_rack.gltf', sx: 1.349, h: 2.381, sz: 1.117 },
  prop_barrel_arrows: { src: 'models/kits/knights/prop_barrel_arrows.gltf', sx: 0.718, h: 1.224, sz: 0.718 },
  prop_battle_banner: { src: 'models/kits/knights/prop_battle_banner.gltf', sx: 0.751, h: 2.013, sz: 0.107 },
  prop_battle_banner2: { src: 'models/kits/knights/prop_battle_banner2.gltf', sx: 0.905, h: 1.911, sz: 0.262 },
  prop_battle_bramble: { src: 'models/kits/knights/prop_battle_bramble.gltf', sx: 0.247, h: 0.591, sz: 0.25 },
  prop_battle_cross: { src: 'models/kits/knights/prop_battle_cross.gltf', sx: 0.637, h: 1.037, sz: 0.151 },
  prop_dead_knight: { src: 'models/kits/knights/prop_dead_knight.gltf', sx: 0.901, h: 0.701, sz: 1.908 },
  prop_dead_knight2: { src: 'models/kits/knights/prop_dead_knight2.gltf', sx: 1.048, h: 1.14, sz: 1.271 },
  prop_dead_horse: { src: 'models/kits/knights/prop_dead_horse.gltf', sx: 0.234, h: 0.817, sz: 0.403 },
  prop_dead_horse2: { src: 'models/kits/knights/prop_dead_horse2.gltf', sx: 0.373, h: 1.492, sz: 0.881 },
  prop_dead_soldier: { src: 'models/kits/knights/prop_dead_soldier.gltf', sx: 0.895, h: 0.429, sz: 1.865 },
  prop_dead_pile: { src: 'models/kits/knights/prop_dead_pile.gltf', sx: 2.528, h: 1.228, sz: 3.187 },
  env_siege_tower: { src: 'models/kits/knights/env_siege_tower.gltf', sx: 6.087, h: 14.578, sz: 5.397 },
  env_siege_fallen: { src: 'models/kits/knights/env_siege_fallen.gltf', sx: 6.553, h: 6.499, sz: 20.076 },
  env_cart: { src: 'models/kits/knights/env_cart.gltf', sx: 2.284, h: 1.178, sz: 3.578 },
  env_crates: { src: 'models/kits/knights/env_crates.gltf', sx: 3.25, h: 2.142, sz: 1.219 },
  pass_pine: { src: 'models/kits/pass/pass_pine.gltf', sx: 4.621, h: 12.514, sz: 3.665 },
  pass_pine_dead: { src: 'models/kits/pass/pass_pine_dead.gltf', sx: 3.258, h: 9.795, sz: 2.656 },
  pass_wall_a: { src: 'models/kits/pass/pass_wall_a.gltf', sx: 10.697, h: 7.214, sz: 2.568 },
  pass_wall_b: { src: 'models/kits/pass/pass_wall_b.gltf', sx: 10.708, h: 7.219, sz: 2.585 },
  pass_wall_c: { src: 'models/kits/pass/pass_wall_c.gltf', sx: 10.914, h: 7.159, sz: 2.56 },
  pass_wall_d: { src: 'models/kits/pass/pass_wall_d.gltf', sx: 10.776, h: 7.251, sz: 2.532 },
  pass_wall_e: { src: 'models/kits/pass/pass_wall_e.gltf', sx: 10.935, h: 7.152, sz: 2.494 },
  pass_arch: { src: 'models/kits/pass/pass_arch.gltf', sx: 10.744, h: 8.211, sz: 4.699 },
  pass_boulder: { src: 'models/kits/pass/pass_boulder.gltf', sx: 3.103, h: 1.165, sz: 1.415 },
  pass_rock: { src: 'models/kits/pass/pass_rock.gltf', sx: 2.864, h: 1.18, sz: 1.915 },
  pass_rock_b: { src: 'models/kits/pass/pass_rock_b.gltf', sx: 3.431, h: 1.256, sz: 3.291 },
  pass_ledge: { src: 'models/kits/pass/pass_ledge.gltf', sx: 9.9, h: 1.37, sz: 1.614 }
} satisfies Record<string, Prop>

/** Place a prop with its base on the ground. `height` scales uniformly to that height; `scale` overrides. */
function place(prop: Prop, x: number, z: number, opts: { height?: number; scale?: number; yaw?: number; y?: number } = {}): Entity {
  const scale = opts.scale ?? (opts.height !== undefined ? opts.height / prop.h : 1)
  const entity = spawn()
  Transform.create(entity, {
    position: Vector3.create(x, opts.y ?? 0, z),
    rotation: Quaternion.fromEulerDegrees(0, opts.yaw ?? 0, 0),
    scale: Vector3.create(scale, scale, scale)
  })
  GltfContainer.create(entity, { src: prop.src })
  return entity
}

// --- Placement guards --------------------------------------------------------------

const TEMPLE_CLEARANCE = 26
const FIELD_CLEARANCE = 6

/** Inside a base's build area or a resource field's working ring. */
function nearGameplay(x: number, z: number, extra = 0): boolean {
  for (const anchor of MAP_ANCHORS) {
    if (Math.hypot(anchor.temple.x - x, anchor.temple.z - z) < TEMPLE_CLEARANCE + extra) return true
  }
  for (const field of RESOURCE_FIELDS) {
    if (Math.hypot(field.center.x - x, field.center.z - z) < field.radius + FIELD_CLEARANCE + extra) return true
  }
  return false
}

function onRoad(x: number, z: number, extra = 0): boolean {
  return ROADS.some((road) => distanceToPolyline(road, x, z) < ROAD_WIDTH / 2 + extra)
}

function onRiver(x: number, z: number, extra = 0): boolean {
  return RIVERS.some((river) => distanceToPolyline(river, x, z) < RIVER_BANK_WIDTH / 2 + extra)
}

function blockedAt(x: number, z: number): boolean {
  return insideAnyObstacle(CROWN_OBSTACLES, x, z)
}

function inBounds(x: number, z: number, margin = 1): boolean {
  return x > margin && z > margin && x < SCENE.size - margin && z < SCENE.size - margin
}

/** Open meadow: not built on, not a road, river, forest or ruin. */
function openGround(x: number, z: number, extra = 0): boolean {
  return inBounds(x, z, 2) && !nearGameplay(x, z, extra) && !onRoad(x, z, extra) && !onRiver(x, z, extra) && !blockedAt(x, z)
}

// --- Build / clear ---------------------------------------------------------------------

export function buildCrownTerrain(): void {
  clearCrownTerrain()
  built = true
  seed = 4471
  setClassicTerrainVisible(false)
  setEnvironmentTheme('bloom')

  createGround()
  createRivers()
  createCrossings()
  createRoads()
  createForests()
  createOutcrops()
  createRuin()
  createHamlets()
  createCamps()
  createSiegeWreckage()
  createMountainRim()
  scatterMeadow()
}

export function clearCrownTerrain(): void {
  for (const entity of entities) engine.removeEntity(entity)
  entities.length = 0
  if (built) setClassicTerrainVisible(true)
  built = false
}

// --- Ground ----------------------------------------------------------------------------

const GROUND_Y = 0.02
const TILE_METERS = 16
const Y = { bank: 0.035, water: 0.05, road: 0.07, ford: 0.09 }

function repeatedPlaneUvs(repeatsX: number, repeatsY: number): number[] {
  return [0, 0, repeatsX, 0, repeatsX, repeatsY, 0, repeatsY, repeatsX, 0, 0, 0, 0, repeatsY, repeatsX, repeatsY]
}

function createGround(): void {
  const ground = spawn()
  Transform.create(ground, {
    position: Vector3.create(SCENE.center, GROUND_Y, SCENE.center),
    rotation: Quaternion.fromEulerDegrees(90, 0, 0),
    scale: Vector3.create(SCENE.size, SCENE.size, 1)
  })
  MeshRenderer.setPlane(ground, repeatedPlaneUvs(SCENE.size / TILE_METERS, SCENE.size / TILE_METERS))
  Material.setPbrMaterial(ground, {
    texture: Material.Texture.Common({ src: 'assets/textures/crown_ground.png', wrapMode: TextureWrapMode.TWM_REPEAT }),
    albedoColor: Color4.create(0.95, 0.97, 0.9, 1),
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    castShadows: false
  })
}

/** A flat strip laid from a to b: width across, textured along its length. */
function strip(a: Point, b: Point, width: number, y: number, overshoot: number, paint: (entity: Entity, length: number) => void): void {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const length = Math.hypot(dx, dz) + overshoot * 2
  const yaw = (Math.atan2(dx, dz) * 180) / Math.PI
  const entity = spawn()
  Transform.create(entity, {
    position: Vector3.create((a.x + b.x) / 2, y, (a.z + b.z) / 2),
    rotation: Quaternion.fromEulerDegrees(90, yaw, 0),
    scale: Vector3.create(width, length, 1)
  })
  paint(entity, length)
}

function paintRoad(entity: Entity, length: number, width: number, tint: Color4): void {
  MeshRenderer.setPlane(entity, repeatedPlaneUvs(1, length / (width * 1.6)))
  Material.setPbrMaterial(entity, {
    texture: Material.Texture.Common({ src: 'assets/textures/crown_road.png', wrapMode: TextureWrapMode.TWM_REPEAT }),
    albedoColor: tint,
    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
    metallic: 0,
    roughness: 1,
    specularIntensity: 0,
    castShadows: false
  })
}

// --- Rivers ------------------------------------------------------------------------------

function createRivers(): void {
  for (const river of RIVERS) {
    for (let i = 0; i + 1 < river.length; i++) {
      // Wet bank under everything, then the water. Each segment overshoots so
      // bends don't show gaps; the y-steps keep the overlaps from flickering.
      strip(river[i], river[i + 1], RIVER_BANK_WIDTH, Y.bank + i * 0.0015, 2.5, (entity, length) =>
        paintRoad(entity, length, RIVER_BANK_WIDTH, Color4.create(0.62, 0.6, 0.5, 1))
      )
      strip(river[i], river[i + 1], RIVER_WIDTH, Y.water + i * 0.0015, 1.8, (entity, length) => {
        MeshRenderer.setPlane(entity, repeatedPlaneUvs(1, length / RIVER_WIDTH))
        Material.setPbrMaterial(entity, {
          texture: Material.Texture.Common({ src: 'assets/textures/water_surface.png', wrapMode: TextureWrapMode.TWM_REPEAT }),
          emissiveTexture: Material.Texture.Common({ src: 'assets/textures/water_surface.png', wrapMode: TextureWrapMode.TWM_REPEAT }),
          albedoColor: Color4.create(0.55, 0.75, 0.9, 0.92),
          emissiveColor: Color3.create(0.25, 0.4, 0.55),
          emissiveIntensity: 0.4,
          transparencyMode: MaterialTransparencyMode.MTM_ALPHA_BLEND,
          metallic: 0,
          roughness: 0.5,
          specularIntensity: 0.4,
          castShadows: false
        })
      })
    }

    // Reeds, lilies and river stones along both banks, skipping the crossings.
    const totalLength = river.reduce((sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - river[i - 1].x, p.z - river[i - 1].z)), 0)
    const samples = Math.floor(totalLength / 1.6)
    for (let s = 0; s < samples; s++) {
      const { x, z, nx, nz } = alongPolyline(river, (s + random()) / samples)
      if (!inBounds(x, z, 3)) continue
      const side = random() < 0.5 ? 1 : -1
      const offset = RIVER_WIDTH / 2 + range(-0.6, 1.6)
      const px = x + nx * side * offset
      const pz = z + nz * side * offset
      if (CROSSINGS.some((c) => Math.abs(px - c.x) < crossingHalfWidth(c) + 1.5 && Math.abs(pz - c.z) < 7)) continue
      const roll = random()
      if (roll < 0.45) place(pick([P.env_reeds, P.env_reeds2]), px, pz, { height: range(1.2, 2.0), yaw: random() * 360 })
      else if (roll < 0.62) place(P.env_lily, x + nx * side * range(0.5, 2.4), z + nz * side * range(0.5, 2.4), { height: 0.35, yaw: random() * 360, y: Y.water + 0.01 })
      else if (roll < 0.82) place(pick([P.pass_rock, P.pass_boulder]), px, pz, { height: range(0.4, 0.9), yaw: random() * 360 })
      else if (roll < 0.92) place(P.env_grass, px, pz, { height: range(0.6, 1.0), yaw: random() * 360 })
      else place(P.env_fern, px, pz, { height: range(0.6, 0.9), yaw: random() * 360 })
    }
  }
}

/** Point at parameter t (0..1 by length) along a polyline plus its unit normal. */
function alongPolyline(points: Point[], t: number): { x: number; z: number; nx: number; nz: number } {
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i + 1 < points.length; i++) {
    const l = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z)
    lengths.push(l)
    total += l
  }
  let remaining = t * total
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] > 0 ? Math.min(1, remaining / lengths[i]) : 0
      const dx = (points[i + 1].x - points[i].x) / (lengths[i] || 1)
      const dz = (points[i + 1].z - points[i].z) / (lengths[i] || 1)
      return { x: points[i].x + dx * lengths[i] * f, z: points[i].z + dz * lengths[i] * f, nx: -dz, nz: dx }
    }
    remaining -= lengths[i]
  }
  const last = points[points.length - 1]
  return { x: last.x, z: last.z, nx: 0, nz: 1 }
}

// --- Crossings ---------------------------------------------------------------------------

function createCrossings(): void {
  for (const c of CROSSINGS) {
    if (c.kind === 'bridge') createPlankBridge(c)
    else createFord(c)
  }
}

function createPlankBridge(c: Crossing): void {
  // Two plank sections span the water, planks running north-south; a wooden
  // railing per side, and a worn approach on each bank.
  const width = crossingHalfWidth(c) * 2
  const scale = width / P.bld_bridge.sx
  for (const dz of [-P.bld_bridge.sz * scale * 0.5, P.bld_bridge.sz * scale * 0.5]) {
    place(P.bld_bridge, c.x, c.z + dz, { scale, y: 0.06 })
  }
  const railScale = (P.bld_bridge.sz * scale) / P.bld_bridge_railing.sz
  for (const side of [-1, 1]) {
    for (const dz of [-P.bld_bridge.sz * scale * 0.5, P.bld_bridge.sz * scale * 0.5]) {
      place(P.bld_bridge_railing, c.x + side * (width / 2 - 0.2), c.z + dz, { scale: railScale, y: P.bld_bridge.h * scale + 0.06 })
    }
  }
  for (const side of [-1, 1]) {
    strip({ x: c.x, z: c.z + side * (RIVER_WIDTH / 2 + 0.5) }, { x: c.x, z: c.z + side * (RIVER_WIDTH / 2 + 7) }, width + 1.5, Y.road + 0.01, 0, (entity, length) =>
      paintRoad(entity, length, width, Color4.create(0.9, 0.86, 0.78, 1))
    )
    // Lantern posts and a marker stone at each end.
    place(P.prop_flag_pole, c.x - width / 2 - 0.6, c.z + side * (RIVER_WIDTH / 2 + 1.2), { height: 2.6 })
    place(P.prop_flag_pole, c.x + width / 2 + 0.6, c.z + side * (RIVER_WIDTH / 2 + 1.2), { height: 2.6 })
  }
}

function createFord(c: Crossing): void {
  // Shallow water crossing: a wide gravel bed with stepping stones and rocks.
  const half = crossingHalfWidth(c)
  strip({ x: c.x - half - 1, z: c.z }, { x: c.x + half + 1, z: c.z }, RIVER_WIDTH + 5, Y.ford, 0, (entity, length) =>
    paintRoad(entity, length, RIVER_WIDTH + 5, Color4.create(0.78, 0.74, 0.62, 0.85))
  )
  for (let i = 0; i < 26; i++) {
    const x = c.x + range(-half, half)
    const z = c.z + range(-RIVER_WIDTH / 2 - 0.5, RIVER_WIDTH / 2 + 0.5)
    const roll = random()
    if (roll < 0.5) place(pick([P.prop_path_rocks, P.prop_path_rocks2]), x, z, { height: range(0.12, 0.2), yaw: random() * 360, y: Y.ford + 0.01 })
    else if (roll < 0.75) place(P.prop_path_step, x, z, { height: 0.2, yaw: random() * 360, y: Y.ford + 0.01 })
    else place(P.pass_rock, x, z, { height: range(0.3, 0.55), yaw: random() * 360 })
  }
  // Approaches on both banks and a pair of watch braziers.
  for (const side of [-1, 1]) {
    strip({ x: c.x, z: c.z + side * (RIVER_WIDTH / 2 + 1) }, { x: c.x, z: c.z + side * (RIVER_WIDTH / 2 + 9) }, half * 1.2, Y.road + 0.01, 0, (entity, length) =>
      paintRoad(entity, length, half * 1.2, Color4.create(0.9, 0.86, 0.78, 1))
    )
    place(P.prop_camp_brazier, c.x - half - 0.8, c.z + side * (RIVER_WIDTH / 2 + 1.5), { height: 1.1 })
    place(P.prop_camp_brazier, c.x + half + 0.8, c.z + side * (RIVER_WIDTH / 2 + 1.5), { height: 1.1 })
  }
}

// --- Roads -------------------------------------------------------------------------------

function createRoads(): void {
  let layer = 0
  for (const road of ROADS) {
    for (let i = 0; i + 1 < road.length; i++) {
      strip(road[i], road[i + 1], ROAD_WIDTH, Y.road + (layer++ % 12) * 0.0015, ROAD_WIDTH * 0.45, (entity, length) =>
        paintRoad(entity, length, ROAD_WIDTH, Color4.create(0.92, 0.88, 0.8, 1))
      )
    }
    // Waymarkers: the odd cart, log or milestone beside the road.
    for (let i = 1; i + 1 < road.length; i++) {
      if (random() < 0.5) continue
      const p = road[i]
      const side = random() < 0.5 ? 1 : -1
      const x = p.x + side * range(3, 4.5)
      const z = p.z + range(-2, 2)
      if (!openGround(x, z) || onRoad(x, z, 0.5)) continue
      const roll = random()
      if (roll < 0.35) place(P.env_cart, x, z, { height: 1.2, yaw: random() * 360 })
      else if (roll < 0.6) place(P.prop_log, x, z, { height: 0.7, yaw: random() * 360 })
      else place(P.env_stonewall_pillar, x, z, { height: 1.1, yaw: random() * 360 })
    }
  }
}

// --- Forests -----------------------------------------------------------------------------

function createForests(): void {
  for (const forest of FORESTS) {
    // Jittered grid of tall pines filling the disc; smaller trees and bushes
    // feather the tree line so it reads as woodland, not a hedge of poles.
    const spacing = 3.4
    for (let gx = -forest.r; gx <= forest.r; gx += spacing) {
      for (let gz = -forest.r; gz <= forest.r; gz += spacing) {
        const x = forest.x + gx + range(-1.1, 1.1)
        const z = forest.z + gz + range(-1.1, 1.1)
        const d = Math.hypot(x - forest.x, z - forest.z)
        if (d > forest.r + 0.4 || !inBounds(x, z, 1.5)) continue
        const inner = d < forest.r - 2
        if (inner || random() < 0.7) {
          place(P.pass_pine, x, z, { height: range(inner ? 10.5 : 8, inner ? 14 : 11), yaw: random() * 360 })
        } else {
          place(pick([P.env_tree_round2, P.env_tree_round3]), x, z, { height: range(5.5, 7.5), yaw: random() * 360 })
        }
      }
    }
    // Undergrowth ring just outside the blocking radius.
    const ring = Math.floor(forest.r * 2.2)
    for (let i = 0; i < ring; i++) {
      const angle = (i / ring) * Math.PI * 2 + random() * 0.4
      const dist = forest.r + range(0.6, 2.2)
      const x = forest.x + Math.cos(angle) * dist
      const z = forest.z + Math.sin(angle) * dist
      if (!inBounds(x, z, 1.5) || onRoad(x, z, 1) || onRiver(x, z, 0) || blockedAt(x, z)) continue
      const roll = random()
      if (roll < 0.35) place(pick([P.env_bush, P.env_bush2]), x, z, { height: range(1.2, 2.0), yaw: random() * 360 })
      else if (roll < 0.6) place(P.env_fern, x, z, { height: range(0.6, 0.9), yaw: random() * 360 })
      else if (roll < 0.8) place(pick([P.env_tree_thin, P.env_tree_thin2]), x, z, { height: range(2.5, 4), yaw: random() * 360 })
      else place(pick([P.pass_rock, P.env_rocks]), x, z, { height: range(0.4, 0.8), yaw: random() * 360 })
    }
  }
}

// --- Outcrops ------------------------------------------------------------------------------

function createOutcrops(): void {
  for (const o of OUTCROPS) {
    place(P.env_cliff3, o.x, o.z, { height: range(6, 7.5), yaw: random() * 360 })
    place(P.env_rock_chunk3, o.x + range(-2, 2), o.z + range(-2, 2), { height: range(2.5, 3.5), yaw: random() * 360 })
    for (let i = 0; i < 7; i++) {
      const angle = random() * Math.PI * 2
      const dist = o.r + range(0.3, 1.8)
      const x = o.x + Math.cos(angle) * dist
      const z = o.z + Math.sin(angle) * dist
      if (onRoad(x, z, 0.5)) continue
      place(pick([P.pass_boulder, P.pass_rock_b, P.env_rock_chunk2]), x, z, { height: range(0.6, 1.4), yaw: random() * 360 })
    }
    for (let i = 0; i < 3; i++) {
      const angle = random() * Math.PI * 2
      const dist = o.r + range(1.5, 3)
      place(P.pass_pine_dead, o.x + Math.cos(angle) * dist, o.z + Math.sin(angle) * dist, { height: range(5, 7), yaw: random() * 360 })
    }
  }
}

// --- The old keep -------------------------------------------------------------------------

function createRuin(): void {
  // Curtain walls: ruined battlement sections shoulder to shoulder along each
  // wall box, height staggering so the skyline is jagged.
  for (const wall of RUIN_WALLS) {
    const pieceWidth = P.castle_ruin_middle.sx
    const count = Math.round((wall.hz * 2) / pieceWidth)
    for (let i = 0; i < count; i++) {
      const z = wall.z - wall.hz + pieceWidth * (i + 0.5)
      const prop = pick([P.castle_ruin_middle, P.castle_ruin_bottom, P.castle_ruin_top, P.castle_ruin_middle])
      place(prop, wall.x, z, { height: range(3.2, 5.2), yaw: 90 })
    }
    // Rubble spilling off the wall's ends toward the gate.
    for (const end of [-1, 1]) {
      place(P.castle_ruin_rubble, wall.x + range(-1, 1), wall.z + end * (wall.hz + 1.2), { height: range(0.9, 1.4), yaw: random() * 360 })
      place(P.castle_ruin_block, wall.x + range(-1.5, 1.5), wall.z + end * (wall.hz + range(2, 3.5)), { height: 0.6, yaw: random() * 360 })
    }
  }
  // Corner towers reduced to stumps and arches.
  for (const tower of RUIN_TOWERS) {
    place(P.env_ruin2, tower.x, tower.z, { height: range(4.5, 5.5), yaw: tower.x < 80 ? 90 : 270 })
    place(P.castle_pillar, tower.x + range(-1, 1), tower.z + range(-1, 1), { height: range(2.5, 4.5) })
    place(P.castle_ruin_rubble, tower.x, tower.z, { height: 1.6, yaw: random() * 360 })
  }
  // Gate banners: torn standards of the old kingdom flank each gate gap.
  for (const x of [64, 96]) {
    for (const z of [74.5, 85.5]) {
      place(P.prop_battle_banner, x, z, { height: 2.6, yaw: x < 80 ? 90 : 270 })
    }
    place(P.prop_camp_brazier, x + (x < 80 ? -1.5 : 1.5), 80, { height: 1.1 })
  }
  // The statue of the old king, and the dry fountain across the court.
  place(P.prop_statue_plinth, RUIN_STATUE.x, RUIN_STATUE.z, { height: 1.4 })
  place(P.prop_statue_hero, RUIN_STATUE.x, RUIN_STATUE.z, { height: 4.2, yaw: 225, y: 1.4 })
  place(P.env_fountain, RUIN_FOUNTAIN.x, RUIN_FOUNTAIN.z, { height: 2.6, yaw: 45 })
  // Paved court fragments and low ruined footings inside the walls.
  for (let i = 0; i < 10; i++) {
    const x = range(66, 94)
    const z = range(66, 94)
    if (Math.hypot(x - 80, z - 80) < 9 || Math.hypot(x - 70, z - 90) < 4 || Math.hypot(x - 90, z - 70) < 4) continue
    if (blockedAt(x, z) || onRoad(x, z, 0.5)) continue
    const roll = random()
    if (roll < 0.4) place(pick([P.env_stonewall, P.env_stonewall2]), x, z, { height: 0.9, yaw: pick([0, 90]) })
    else if (roll < 0.7) place(P.castle_ruin_block, x, z, { height: 0.6, yaw: random() * 360 })
    else place(P.env_structure3, x, z, { height: range(2, 3), yaw: pick([0, 90, 180, 270]) })
  }
  // Brambles have reclaimed the outside of the walls.
  for (let i = 0; i < 24; i++) {
    const wall = pick(RUIN_WALLS)
    const x = wall.x + (wall.x < 80 ? -1 : 1) * range(1.2, 3.5)
    const z = wall.z + range(-wall.hz, wall.hz)
    if (onRoad(x, z, 0.5)) continue
    place(pick([P.prop_battle_bramble, P.env_bush_flowers, P.env_fern]), x, z, { height: range(0.5, 1.0), yaw: random() * 360 })
  }
}

// --- Hamlets ---------------------------------------------------------------------------------

function createHamlets(): void {
  for (const h of HAMLETS) {
    // Local frame in the house's yaw: +u to its right, +v forward (DCL yaw: forward = (sin, cos)).
    const at = localFrame(h)

    place(pick([P.bld_house_ruin, P.bld_house_ruin2]), h.x, h.z, { height: 4.6, yaw: h.yaw })

    // A ploughed field beside the house with a fence around it.
    // Rows run left-right in front of the house (their long axis is the frame's u).
    const field = at(0, -9.5)
    const fieldYaw = h.yaw + 90
    for (let row = -2; row <= 2; row++) {
      const p = at(0, -9.5 + row * 1.6)
      place(P.env_farm_row, p.x, p.z, { scale: 1.1, yaw: fieldYaw })
      if (random() < 0.5) {
        const flower = at(range(-4, 4), -9.5 + row * 1.6 + range(-0.4, 0.4))
        place(P.env_sunflower, flower.x, flower.z, { height: range(1.2, 1.6), yaw: random() * 360 })
      }
    }
    fenceRectangle(field, 5.4, 4.6, fieldYaw)

    // Farmyard dressing.
    const yard = [
      { p: at(5.5, 1.5), prop: P.prop_hay_cart, height: 1.3 },
      { p: at(-5.5, 2), prop: P.prop_hay_pile, height: 1.8 },
      { p: at(-4.5, -3), prop: P.prop_hay_bale, height: 1.0 },
      { p: at(5.5, -3.5), prop: P.prop_wood_pile, height: 0.7 },
      { p: at(0, 6.5), prop: P.prop_barrel_stack, height: 1.5 },
      { p: at(6.5, 5.5), prop: P.env_tree_round3, height: 7.5 },
      { p: at(-7, -6.5), prop: P.env_tree_round2, height: 6.5 }
    ]
    for (const item of yard) {
      if (!inBounds(item.p.x, item.p.z, 1.5) || onRoad(item.p.x, item.p.z, 0.5) || onRiver(item.p.x, item.p.z)) continue
      place(item.prop, item.p.x, item.p.z, { height: item.height, yaw: h.yaw + random() * 40 - 20 })
    }
    for (let i = 0; i < 10; i++) {
      const p = at(range(-8, 8), range(-3, 8))
      if (Math.hypot(p.x - h.x, p.z - h.z) < HAMLET_HOUSE_RADIUS + 0.3 || !openGround(p.x, p.z)) continue
      place(pick([P.env_grass, P.env_flowers, P.env_flowers2]), p.x, p.z, { height: range(0.5, 0.9), yaw: random() * 360 })
    }
  }
}

/** Local frame at a yawed anchor: u = right (local +x), v = forward (local +z). */
function localFrame(anchor: Point & { yaw: number }): (u: number, v: number) => Point {
  const rad = (anchor.yaw * Math.PI) / 180
  const fx = Math.sin(rad)
  const fz = Math.cos(rad)
  return (u, v) => ({ x: anchor.x + fz * u + fx * v, z: anchor.z - fx * u + fz * v })
}

/** Fence panels around a rectangle whose "along" axis is the forward of `yawDegrees`. */
function fenceRectangle(center: Point, halfAlong: number, halfAcross: number, yawDegrees: number): void {
  const at = localFrame({ ...center, yaw: yawDegrees })
  const corners = [at(-halfAcross, -halfAlong), at(-halfAcross, halfAlong), at(halfAcross, halfAlong), at(halfAcross, -halfAlong)]
  const panel = P.prop_fence.sx
  for (let side = 0; side < 4; side++) {
    const from = corners[side]
    const to = corners[(side + 1) % 4]
    const dx = to.x - from.x
    const dz = to.z - from.z
    const length = Math.hypot(dx, dz)
    // A panel's long axis is its local +x, which yaw maps to (cos, -sin).
    const yaw = (Math.atan2(-dz, dx) * 180) / Math.PI
    const count = Math.max(1, Math.round(length / panel))
    for (let i = 0; i < count; i++) {
      if (random() < 0.15) continue // broken panels
      const t = (i + 0.5) / count
      const x = from.x + dx * t
      const z = from.z + dz * t
      if (!inBounds(x, z, 1) || onRoad(x, z, 0.3)) continue
      place(random() < 0.12 ? P.prop_fence_gate : pick([P.prop_fence, P.prop_fence2]), x, z, { scale: length / count / panel, yaw })
    }
  }
}

// --- Camps -----------------------------------------------------------------------------------

function createCamps(): void {
  for (const camp of CAMPS) {
    const at = localFrame(camp)

    place(P.prop_camp_firepit, camp.x, camp.z, { height: 0.45 })
    place(P.bld_tent_large_burnt, at(-4.5, 0).x, at(-4.5, 0).z, { height: 3.4, yaw: camp.yaw + 90 })
    place(P.bld_tent_round_burnt, at(2, 4.5).x, at(2, 4.5).z, { height: 3.2, yaw: camp.yaw - 30 })
    place(P.bld_tent_small, at(3, -4).x, at(3, -4).z, { height: 2.6, yaw: camp.yaw + 160 })
    place(P.prop_camp_rack, at(0.5, 2.2).x, at(0.5, 2.2).z, { height: 1.8, yaw: camp.yaw })
    place(P.prop_barrel_arrows, at(-1.5, -2.2).x, at(-1.5, -2.2).z, { height: 1.0 })
    place(P.prop_battle_banner2, at(5.5, 1).x, at(5.5, 1).z, { height: 2.4, yaw: camp.yaw + random() * 30 })
    place(P.prop_battle_banner, at(-1, 6).x, at(-1, 6).z, { height: 2.2, yaw: camp.yaw + random() * 30 })
    place(P.env_crates, at(4.5, -1).x, at(4.5, -1).z, { height: 1.2, yaw: camp.yaw + 20 })
    place(P.prop_cage_cart, at(-5, -5).x, at(-5, -5).z, { height: 1.9, yaw: camp.yaw + 70 })

    // The fight that ended it: fallen soldiers, horses and brambles around the tents.
    for (let i = 0; i < 9; i++) {
      const p = at(range(-8, 8), range(-8, 8))
      if (Math.hypot(p.x - camp.x, p.z - camp.z) < 2 || !inBounds(p.x, p.z, 1.5) || onRoad(p.x, p.z, 0.3) || onRiver(p.x, p.z) || blockedAt(p.x, p.z)) continue
      const roll = random()
      if (roll < 0.3) place(pick([P.prop_dead_knight, P.prop_dead_soldier]), p.x, p.z, { height: range(0.5, 0.7), yaw: random() * 360 })
      else if (roll < 0.45) place(pick([P.prop_dead_horse, P.prop_dead_horse2]), p.x, p.z, { height: range(1.1, 1.4), yaw: random() * 360 })
      else if (roll < 0.7) place(P.prop_battle_bramble, p.x, p.z, { height: range(0.5, 0.8), yaw: random() * 360 })
      else if (roll < 0.85) place(P.prop_battle_cross, p.x, p.z, { height: range(0.9, 1.2), yaw: random() * 360 })
      else place(P.env_tree_dead2, p.x, p.z, { height: range(3, 4.5), yaw: random() * 360 })
    }
  }
}

// --- Siege wreckage --------------------------------------------------------------------------

function createSiegeWreckage(): void {
  for (const t of FALLEN_TOWERS) {
    place(P.env_siege_fallen, t.x, t.z, { height: (t.hx * 2 * P.env_siege_fallen.h) / P.env_siege_fallen.sz, yaw: t.yaw ?? 0 })
    for (let i = 0; i < 6; i++) {
      const x = t.x + range(-t.hx - 2, t.hx + 2)
      const z = t.z + range(-t.hz - 3, t.hz + 3)
      if (Math.abs(x - t.x) < t.hx && Math.abs(z - t.z) < t.hz) continue
      if (onRiver(x, z) || blockedAt(x, z)) continue
      place(pick([P.prop_dead_soldier, P.prop_dead_knight2, P.prop_battle_bramble, P.env_crates]), x, z, { height: range(0.6, 1.1), yaw: random() * 360 })
    }
  }
  for (const t of STANDING_TOWERS) {
    place(P.env_siege_tower, t.x, t.z, { height: 11.5, yaw: t.z > 80 ? 180 : 0 })
    place(P.prop_dead_pile, t.x + range(-4, 4), t.z + (t.z > 80 ? -4 : 4), { height: 1.0, yaw: random() * 360 })
    place(P.prop_battle_banner2, t.x + 3.6, t.z, { height: 2.4, yaw: random() * 360 })
    place(P.prop_battle_banner, t.x - 3.6, t.z, { height: 2.2, yaw: random() * 360 })
  }
}

// --- Mountain rim --------------------------------------------------------------------------------

function createMountainRim(): void {
  // Snow-capped alpine cliffs shoulder to shoulder just inside the horizon
  // walls; where a base sits at the edge the rim thins to boulders so nothing
  // squats on a temple.
  const size = SCENE.size
  const slabs = [P.pass_wall_a, P.pass_wall_b, P.pass_wall_c, P.pass_wall_d, P.pass_wall_e]
  const edges: { yaw: number; point: (along: number, inset: number) => Point }[] = [
    { yaw: 0, point: (along, inset) => ({ x: along, z: inset }) },
    { yaw: 180, point: (along, inset) => ({ x: along, z: size - inset }) },
    { yaw: 90, point: (along, inset) => ({ x: inset, z: along }) },
    { yaw: 270, point: (along, inset) => ({ x: size - inset, z: along }) }
  ]
  for (const edge of edges) {
    let along = 3
    while (along < size - 3) {
      const slab = pick(slabs)
      const scale = range(1.25, 1.75)
      const width = slab.sx * scale
      const p = edge.point(along + width / 2, 1.4 + (slab.sz * scale) / 2)
      const templeClose = MAP_ANCHORS.some((a) => Math.hypot(a.temple.x - p.x, a.temple.z - p.z) < 13)
      if (templeClose) {
        for (let i = 0; i < 3; i++) {
          const b = edge.point(along + range(0, width), range(0.8, 2.2))
          place(pick([P.pass_boulder, P.pass_rock]), b.x, b.z, { height: range(0.5, 0.9), yaw: random() * 360 })
        }
      } else {
        place(slab, p.x, p.z, { scale, yaw: edge.yaw + range(-3, 3), y: -0.15 })
        // A second, taller slab behind at the corners and every so often, for a stepped skyline.
        if (random() < 0.35) {
          const back = pick(slabs)
          const backScale = scale * range(1.15, 1.4)
          const q = edge.point(along + width / 2 + range(-2, 2), 0.6 + (back.sz * backScale) / 2)
          place(back, q.x, q.z, { scale: backScale, yaw: edge.yaw + range(-4, 4), y: -0.4 })
        }
        // Pines and boulders at the foot where the field isn't in use.
        for (let i = 0; i < 3; i++) {
          const f = edge.point(along + range(0, width), range(3.5, 6.5))
          if (!openGround(f.x, f.z) ) continue
          if (random() < 0.55) place(P.pass_pine, f.x, f.z, { height: range(8, 12), yaw: random() * 360 })
          else place(pick([P.pass_boulder, P.pass_rock_b, P.env_rock_chunk2]), f.x, f.z, { height: range(0.6, 1.3), yaw: random() * 360 })
        }
      }
      along += width - 0.6
    }
  }
  // Corner peaks.
  for (const [x, z] of [[3.5, 3.5], [size - 3.5, 3.5], [3.5, size - 3.5], [size - 3.5, size - 3.5]] as [number, number][]) {
    if (MAP_ANCHORS.some((a) => Math.hypot(a.temple.x - x, a.temple.z - z) < 13)) continue
    place(P.pass_arch, x, z, { scale: 1.6, yaw: random() * 360, y: -0.3 })
  }
}

// --- Meadow scatter ------------------------------------------------------------------------------

function scatterMeadow(): void {
  const size = SCENE.size
  // Grass and flowers everywhere they don't get in the way of play.
  for (let i = 0; i < 520; i++) {
    const x = range(2, size - 2)
    const z = range(2, size - 2)
    if (!inBounds(x, z, 2) || onRoad(x, z, 0.3) || onRiver(x, z, 0) || blockedAt(x, z)) continue
    const roll = random()
    if (roll < 0.55) place(pick([P.env_grass, P.env_grass2]), x, z, { height: range(0.5, 0.95), yaw: random() * 360 })
    else if (roll < 0.85) place(pick([P.env_flowers, P.env_flowers2, P.env_flowers3]), x, z, { height: range(0.4, 0.7), yaw: random() * 360 })
    else place(P.env_fern, x, z, { height: range(0.5, 0.8), yaw: random() * 360 })
  }
  // Bushes, boulders and lone saplings across the open meadow, clear of bases and fields.
  for (let i = 0; i < 140; i++) {
    const x = range(4, size - 4)
    const z = range(4, size - 4)
    if (!openGround(x, z, 1)) continue
    const roll = random()
    if (roll < 0.4) place(pick([P.env_bush, P.env_bush2, P.env_bush_flowers]), x, z, { height: range(1.0, 1.9), yaw: random() * 360 })
    else if (roll < 0.7) place(pick([P.pass_boulder, P.pass_rock, P.pass_rock_b, P.env_rocks]), x, z, { height: range(0.5, 1.1), yaw: random() * 360 })
    else if (roll < 0.9) place(pick([P.env_tree_thin, P.env_tree_thin2]), x, z, { height: range(2.2, 3.4), yaw: random() * 360 })
    else place(P.env_tree_dead, x, z, { height: range(4, 6), yaw: random() * 360 })
  }
}
