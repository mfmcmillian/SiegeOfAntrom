import { ColliderLayer, Entity, GltfContainer, Material, MeshRenderer, ParticleSystem, Transform, VisibilityComponent, engine } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ResourceKind } from './types'

// Resource nodes: Synty crystal clusters / gold ore for `minerals`, a stone well with a
// glowing mana pool and mist for `gas`. Idle nodes are static; gather pulses and
// depletion animate.

interface ResourceRig {
  bodyRoot: Entity
  parts: Entity[]
  pulseTimer: number
  dyingTimer: number
  depleted: boolean
  /** Rich node (gold vein / moonwell): drives the mist colour on re-show. */
  rich: boolean
  // Gas geysers: glowing pool that collapses on depletion, and the smoke emitter.
  pool?: Entity
  poolBaseScale?: Vector3
  smoke?: Entity
  smokeActive: boolean
}

const rigs = new Map<Entity, ResourceRig>()

const PULSE_DURATION = 0.45
const DIE_DURATION = 1.4
const PARTICLE_BLEND_ALPHA = 0

const MINERAL_BLUE = Color4.create(0.4, 0.62, 0.95, 1)
const MINERAL_ICE = Color4.create(0.62, 0.8, 1, 1)
const MINERAL_GLOW = Color4.create(0.45, 0.7, 1, 1)
const GAS_GREEN = Color4.create(0.3, 0.85, 0.4, 1)
const GAS_GLOW = Color4.create(0.35, 0.95, 0.45, 1)

// Rich variants: gold crystal veins and icy cryo plasma at the map center.
const GOLD_DEEP = Color4.create(0.95, 0.62, 0.12, 1)
const GOLD_BRIGHT = Color4.create(1, 0.85, 0.4, 1)
const GOLD_GLOW = Color4.create(1, 0.78, 0.25, 1)
const CRYO_BLUE = Color4.create(0.35, 0.75, 1, 1)
const CRYO_GLOW = Color4.create(0.5, 0.88, 1, 1)

/** Shard/pool palette per node tier, so rich nodes read instantly at a glance. */
type CrystalPalette = { deep: Color4; bright: Color4; glow: Color4 }
type PlasmaPalette = { pool: Color4; glow: Color4 }

const CRYSTAL_PALETTES: Record<'normal' | 'rich', CrystalPalette> = {
  normal: { deep: MINERAL_BLUE, bright: MINERAL_ICE, glow: MINERAL_GLOW },
  rich: { deep: GOLD_DEEP, bright: GOLD_BRIGHT, glow: GOLD_GLOW }
}
const PLASMA_PALETTES: Record<'normal' | 'rich', PlasmaPalette> = {
  normal: { pool: GAS_GREEN, glow: GAS_GLOW },
  rich: { pool: CRYO_BLUE, glow: CRYO_GLOW }
}

export function buildResourceModel(root: Entity, kind: ResourceKind, rich = false): void {
  const bodyRoot = engine.addEntity()
  Transform.create(bodyRoot, { parent: root })

  const rig: ResourceRig = { bodyRoot, parts: [bodyRoot], pulseTimer: 0, dyingTimer: -1, depleted: false, rich, smokeActive: false }

  if (kind === 'minerals') buildMineralField(rig, CRYSTAL_PALETTES[rich ? 'rich' : 'normal'])
  else buildGasGeyser(rig, PLASMA_PALETTES[rich ? 'rich' : 'normal'])

  rigs.set(root, rig)
}

function addPart(
  rig: ResourceRig,
  position: Vector3,
  scale: Vector3,
  color: Color4,
  options: {
    emissive?: Color4
    emissiveIntensity?: number
    cylinder?: boolean
    cone?: boolean
    sphere?: boolean
    rotation?: Quaternion
    metallic?: number
    roughness?: number
  } = {}
): Entity {
  const part = engine.addEntity()
  Transform.create(part, {
    parent: rig.bodyRoot,
    position,
    scale,
    rotation: options.rotation ?? Quaternion.Identity()
  })
  if (options.cone) MeshRenderer.setCylinder(part, 0.5, 0.03)
  else if (options.cylinder) MeshRenderer.setCylinder(part)
  else if (options.sphere) MeshRenderer.setSphere(part)
  else MeshRenderer.setBox(part)
  Material.setPbrMaterial(part, {
    albedoColor: color,
    emissiveColor: options.emissive ?? Color4.Black(),
    emissiveIntensity: options.emissiveIntensity ?? 0,
    metallic: options.metallic ?? 0.2,
    roughness: options.roughness ?? 0.8,
    castShadows: false
  })
  rig.parts.push(part)
  return part
}

/** Synty props exported through tools/realms (see tools/realms/forge.json and knights.json). */
const RESOURCE_MODELS = {
  // Dungeon Realms crystal cluster (7.5 m native) brought down to a 2.3 m spire.
  crystal: { src: 'models/kits/forge/res_crystals_a.gltf', scale: 0.3, yaw: 20 },
  // Fantasy Kingdom gold ore chunk (hand-held, 0.19 m native) blown up into a boulder.
  goldVein: { src: 'models/kits/knights/res_ore_gold.gltf', scale: 10.5, yaw: 0 },
  // Fantasy Kingdom stone well: the mana pool glows inside the shaft.
  well: { src: 'models/kits/knights/res_well.gltf', scale: 0.85, yaw: 0 }
}

function addGltf(rig: ResourceRig, model: { src: string; scale: number; yaw: number }): Entity {
  const part = engine.addEntity()
  Transform.create(part, {
    parent: rig.bodyRoot,
    scale: Vector3.create(model.scale, model.scale, model.scale),
    rotation: Quaternion.fromEulerDegrees(0, model.yaw, 0)
  })
  GltfContainer.create(part, {
    src: model.src,
    visibleMeshesCollisionMask: ColliderLayer.CL_NONE,
    invisibleMeshesCollisionMask: ColliderLayer.CL_NONE
  })
  rig.parts.push(part)
  return part
}

function buildMineralField(rig: ResourceRig, palette: CrystalPalette): void {
  addGltf(rig, rig.rich ? RESOURCE_MODELS.goldVein : RESOURCE_MODELS.crystal)
  // Glowing ground ring in the tier colour so blue crystal and gold veins read at a glance.
  addPart(rig, Vector3.create(0, 0.06, 0), Vector3.create(2.3, 0.04, 2.3), palette.deep, {
    cylinder: true,
    emissive: palette.glow,
    emissiveIntensity: 1.1
  })
}

function buildGasGeyser(rig: ResourceRig, palette: PlasmaPalette): void {
  addGltf(rig, RESOURCE_MODELS.well)
  // Mana pool sitting in the well mouth; it drains away on depletion.
  const pool = addPart(rig, Vector3.create(0, 0.95, 0), Vector3.create(1.1, 0.05, 1.1), palette.pool, {
    cylinder: true,
    emissive: palette.glow,
    emissiveIntensity: 2.2
  })
  rig.pool = pool
  rig.poolBaseScale = Vector3.create(1.1, 0.05, 1.1)
  // Spill glow around the plinth.
  addPart(rig, Vector3.create(0, 0.05, 0), Vector3.create(2.6, 0.04, 2.6), palette.pool, {
    cylinder: true,
    emissive: palette.glow,
    emissiveIntensity: 0.9
  })

  // Mana mist rising out of the shaft.
  const smoke = engine.addEntity()
  Transform.create(smoke, { parent: rig.bodyRoot, position: Vector3.create(0, 1.1, 0) })
  ParticleSystem.create(smoke, createGeyserSmokeOptions(rig.rich))
  rig.parts.push(smoke)
  rig.smoke = smoke
  rig.smokeActive = true
}

function createGeyserSmokeOptions(rich: boolean) {
  // Moonwells breathe a pale blue mist; ordinary wells a green one.
  const [start, mid, end] = rich
    ? [Color4.create(0.55, 0.85, 1, 0.45), Color4.create(0.45, 0.75, 1, 0.36), Color4.create(0.3, 0.42, 0.6, 0)]
    : [Color4.create(0.5, 0.85, 0.55, 0.42), Color4.create(0.45, 0.75, 0.5, 0.36), Color4.create(0.3, 0.4, 0.32, 0)]
  return {
    rate: 7,
    maxParticles: 32,
    lifetime: 2.4,
    // Negative gravity makes the plume rise.
    gravity: -0.55,
    initialSize: { start: 0.24, end: 0.5 },
    sizeOverTime: { start: 0.6, end: 1.9 },
    initialVelocitySpeed: { start: 0.3, end: 0.7 },
    initialColor: { start, end: mid },
    colorOverTime: { start: mid, end },
    blendMode: PARTICLE_BLEND_ALPHA,
    shape: ParticleSystem.Shape.Cone({ angle: 10, radius: 0.28 }),
    loop: true,
    prewarm: true
  }
}

export function isProceduralResource(root: Entity): boolean {
  return rigs.has(root)
}

/** Quick scale punch when a miner works the node. */
export function playResourceGatherPulse(root: Entity): void {
  const rig = rigs.get(root)
  if (!rig || rig.depleted) return

  rig.pulseTimer = PULSE_DURATION
}

/** Gas geysers "die out": the pool collapses and the plume stops until the node is hidden. */
export function playResourceDepletion(root: Entity): void {
  const rig = rigs.get(root)
  if (!rig) return

  rig.pulseTimer = 0
  rig.dyingTimer = DIE_DURATION
  rig.depleted = true
  setSmokeActive(rig, false)
}

/** Visibility doesn't cascade to children, so fog of war toggles every part. */
export function setResourceModelVisible(root: Entity, visible: boolean): void {
  const rig = rigs.get(root)
  if (!rig) return

  for (const part of rig.parts) {
    VisibilityComponent.createOrReplace(part, { visible })
  }
  // Particles ignore VisibilityComponent, so the plume is toggled by removing the emitter.
  setSmokeActive(rig, visible && !rig.depleted)
}

function setSmokeActive(rig: ResourceRig, active: boolean): void {
  if (!rig.smoke || rig.smokeActive === active) return

  rig.smokeActive = active
  if (active) ParticleSystem.createOrReplace(rig.smoke, createGeyserSmokeOptions(rig.rich))
  else ParticleSystem.deleteFrom(rig.smoke)
}

/** Unregisters the rig; optionally removes the part entities (children aren't removed with their root). */
export function disposeResourceModel(root: Entity, removeParts: boolean): void {
  const rig = rigs.get(root)
  if (!rig) return

  setSmokeActive(rig, false)
  if (removeParts) {
    for (const part of rig.parts) engine.removeEntity(part)
  }
  rigs.delete(root)
}

function resourceAnimationSystem(dt: number): void {
  for (const rig of rigs.values()) {
    if (rig.pulseTimer > 0) {
      rig.pulseTimer = Math.max(0, rig.pulseTimer - dt)
      const progress = 1 - rig.pulseTimer / PULSE_DURATION
      const factor = 1 + 0.12 * Math.sin(Math.PI * progress)
      Transform.getMutable(rig.bodyRoot).scale = Vector3.create(factor, factor, factor)
    }

    if (rig.dyingTimer >= 0 && rig.pool && rig.poolBaseScale) {
      rig.dyingTimer -= dt
      const progress = Math.min(1, Math.max(0, 1 - rig.dyingTimer / DIE_DURATION))
      const remaining = Math.max(0.05, 1 - progress)
      Transform.getMutable(rig.pool).scale = Vector3.create(
        rig.poolBaseScale.x * remaining,
        rig.poolBaseScale.y,
        rig.poolBaseScale.z * remaining
      )
      if (rig.dyingTimer < 0) rig.dyingTimer = -1
    }
  }
}

engine.addSystem(resourceAnimationSystem)
