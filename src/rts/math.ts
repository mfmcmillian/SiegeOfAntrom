import { Entity, Transform } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { isGroundWalkable } from './maps'
import { findPath, hasLineOfSight, hasObstacles, type Point } from './obstacles'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function cloneVector(vector: Vector3): Vector3 {
  return Vector3.create(vector.x, vector.y, vector.z)
}

export function distanceToPoint(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z

  return Math.sqrt(dx * dx + dz * dz)
}

export function distanceToPosition(entity: Entity, position: Vector3): number {
  const current = Transform.get(entity).position
  return distanceToPoint(current, position)
}

// ---------------------------------------------------------------------------
// Path following. On maps with obstacles every ground mover keeps a cached
// route to its current target; the route is rebuilt when the target moves,
// when a step gets blocked (shoved by separation), or every few seconds.
// Open ground never pays for A*: a clear line of sight is a one-hop route.
// ---------------------------------------------------------------------------

type PathState = { targetX: number; targetZ: number; waypoints: Point[]; index: number; age: number; dirty: boolean }
const paths = new Map<Entity, PathState>()
const WAYPOINT_REACHED = 0.6
const RETARGET_DISTANCE = 1.0
const REPLAN_SECONDS = 2.5

/** Drop every cached route (match reset). */
export function resetPathCache(): void {
  paths.clear()
}

/** Forget one mover's route (unit died / removed). */
export function forgetPath(entity: Entity): void {
  paths.delete(entity)
}

function routeFor(entity: Entity, current: Vector3, target: Vector3, dt: number): PathState | undefined {
  let state = paths.get(entity)
  const moved = !state || Math.abs(state.targetX - target.x) > RETARGET_DISTANCE || Math.abs(state.targetZ - target.z) > RETARGET_DISTANCE
  if (state) state.age += dt
  if (!state || moved || state.dirty || state.age > REPLAN_SECONDS) {
    const waypoints = findPath({ x: current.x, z: current.z }, { x: target.x, z: target.z })
    if (!waypoints) {
      paths.delete(entity)
      return undefined
    }
    state = { targetX: target.x, targetZ: target.z, waypoints, index: 0, age: 0, dirty: false }
    paths.set(entity, state)
  }
  return state
}

export function moveTowardPosition(entity: Entity, target: Vector3, speed: number, dt: number, airborne = false): void {
  const transform = Transform.getMutable(entity)
  const current = transform.position
  const finalDistance = Math.sqrt((target.x - current.x) ** 2 + (target.z - current.z) ** 2)
  if (finalDistance <= 0.01) return

  // Where to head this frame: the target itself, or the next corner of the route.
  let aimX = target.x
  let aimZ = target.z
  let state: PathState | undefined
  if (!airborne && hasObstacles()) {
    state = routeFor(entity, current, target, dt)
    if (state) {
      while (state.index < state.waypoints.length - 1) {
        const waypoint = state.waypoints[state.index]
        const d = Math.sqrt((waypoint.x - current.x) ** 2 + (waypoint.z - current.z) ** 2)
        // Skip corners we already reached or can already see past.
        if (d <= WAYPOINT_REACHED || hasLineOfSight(current.x, current.z, state.waypoints[state.index + 1].x, state.waypoints[state.index + 1].z)) {
          state.index++
          continue
        }
        break
      }
      const waypoint = state.waypoints[state.index]
      aimX = waypoint.x
      aimZ = waypoint.z
    }
  }

  const dirX = aimX - current.x
  const dirZ = aimZ - current.z
  const distance = Math.sqrt(dirX * dirX + dirZ * dirZ)
  if (distance <= 0.01) return

  const step = Math.min(distance, speed * dt)
  const nextX = current.x + (dirX / distance) * step
  const nextZ = current.z + (dirZ / distance) * step
  transform.rotation = Quaternion.fromEulerDegrees(0, (Math.atan2(dirX, dirZ) * 180) / Math.PI, 0)

  // Island rims and forest edges: ground units stop dead instead of marching
  // into the sky or through a tree line. Flyers and transports pass the check.
  if (!airborne && !isGroundWalkable(nextX, nextZ)) {
    if (state) state.dirty = true
    return
  }

  transform.position = Vector3.create(nextX, current.y, nextZ)
}

export function getFormationPosition(center: Vector3, slot: number, radius: number): Vector3 {
  const angle = slot * 2.399963229728653
  const ring = Math.floor(slot / 6)
  const slotRadius = radius + ring * 0.45

  return Vector3.create(center.x + Math.cos(angle) * slotRadius, center.y, center.z + Math.sin(angle) * slotRadius)
}

export function offsetSpawn(position: Vector3, index: number): Vector3 {
  const offset = (index % 5) * 0.35

  return Vector3.create(position.x + offset, position.y, position.z + Math.floor(index / 5) * 0.35)
}
