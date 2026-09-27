// Cut-down copy of DecentraCraft's topDownCamera so the benchmark sees units at the
// same height, pitch and pan speed the RTS uses.

import { Entity, InputAction, InputModifier, MainCamera, Transform, VirtualCamera, engine, inputSystem } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { bench } from './bench'

const HEIGHT = 26
const PITCH_DEGREES = 80
const BACK_OFFSET = HEIGHT / Math.tan((PITCH_DEGREES * Math.PI) / 180)
const PAN_SPEED = 26
const MARGIN = 6
const SCENE_SIZE = 160

let cameraEntity: Entity | null = null
let active = false

export function isTopDown(): boolean {
  return active
}

export function toggleTopDown(): void {
  if (active) disableTopDown()
  else enableTopDown()
}

export function enableTopDown(): void {
  if (active) return
  if (!cameraEntity) {
    cameraEntity = engine.addEntity()
    Transform.create(cameraEntity, {
      position: cameraPosition(),
      rotation: Quaternion.fromEulerDegrees(PITCH_DEGREES, 0, 0)
    })
    VirtualCamera.create(cameraEntity, {
      defaultTransition: { transitionMode: VirtualCamera.Transition.Time(0.4) }
    })
  }
  Transform.getMutable(cameraEntity).position = cameraPosition()
  MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: cameraEntity })
  InputModifier.createOrReplace(engine.PlayerEntity, { mode: InputModifier.Mode.Standard({ disableAll: true }) })
  active = true
  console.log('[bench] camera=topdown')
}

export function disableTopDown(): void {
  if (!active) return
  active = false
  const main = MainCamera.getMutableOrNull(engine.CameraEntity)
  if (main) main.virtualCameraEntity = undefined
  InputModifier.deleteFrom(engine.PlayerEntity)
  console.log('[bench] camera=avatar')
}

function cameraPosition(): Vector3 {
  return Vector3.create(bench.focus.x, HEIGHT, bench.focus.z - BACK_OFFSET)
}

function clamp(v: number): number {
  return Math.max(MARGIN, Math.min(SCENE_SIZE - MARGIN, v))
}

function panSystem(dt: number): void {
  if (!active || !cameraEntity) return
  let dx = 0
  let dz = 0
  if (inputSystem.isPressed(InputAction.IA_FORWARD)) dz += 1
  if (inputSystem.isPressed(InputAction.IA_BACKWARD)) dz -= 1
  if (inputSystem.isPressed(InputAction.IA_LEFT)) dx -= 1
  if (inputSystem.isPressed(InputAction.IA_RIGHT)) dx += 1
  if (dx === 0 && dz === 0) return
  const scale = dx !== 0 && dz !== 0 ? Math.SQRT1_2 : 1
  bench.focus.x = clamp(bench.focus.x + dx * PAN_SPEED * scale * dt)
  bench.focus.z = clamp(bench.focus.z + dz * PAN_SPEED * scale * dt)
  Transform.getMutable(cameraEntity).position = cameraPosition()
}

export function startCamera(): void {
  engine.addSystem(panSystem)
  enableTopDown()
}
