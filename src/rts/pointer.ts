import { PrimaryPointerInfo, Transform, UiCanvasInformation, engine } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'

// The Explorer has reported PrimaryPointerInfo.screenCoordinates.y from the bottom of the
// screen in some builds and from the top in others (the docs say both). Every screen-space
// consumer (drag box, HUD hit test, minimap clicks, edge scroll) goes through here, and the
// convention is inferred at runtime from the cursor's world ray: a ray tilted towards the
// camera's up vector means the cursor sits in the upper half of the screen.

let topOrigin: boolean | null = null
let votesTop = 0
let votesBottom = 0
const VOTES_TO_LOCK = 6

/** Cursor Y in physical pixels measured from the top edge, or null before the pointer exists. */
export function getPointerYFromTop(): number | null {
  const info = PrimaryPointerInfo.getOrNull(engine.RootEntity)
  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  const coordinates = info?.screenCoordinates
  if (!coordinates || !canvas || canvas.height === 0) return null
  if (topOrigin === null) sampleOrigin(coordinates.y, canvas.height, info?.worldRayDirection)
  // Until the vote settles, assume the convention the game was written against.
  const fromTop = topOrigin ?? false
  return fromTop ? coordinates.y : canvas.height - coordinates.y
}

function sampleOrigin(screenY: number, height: number, ray: { x: number; y: number; z: number } | undefined): void {
  const camera = Transform.getOrNull(engine.CameraEntity)
  if (!ray || !camera) return
  // Only trust unambiguous frames: cursor well away from the middle band, ray clearly tilted.
  const offset = screenY - height / 2
  if (Math.abs(offset) < height * 0.15) return
  const up = Vector3.rotate(Vector3.Up(), camera.rotation)
  const tilt = ray.x * up.x + ray.y * up.y + ray.z * up.z
  if (Math.abs(tilt) < 0.08) return
  const cursorInUpperHalf = tilt > 0
  // Upper half + small y  => y counts from the top.
  if (cursorInUpperHalf === offset < 0) votesTop += 1
  else votesBottom += 1
  if (votesTop >= VOTES_TO_LOCK && votesBottom === 0) topOrigin = true
  else if (votesBottom >= VOTES_TO_LOCK && votesTop === 0) topOrigin = false
  else if (votesTop + votesBottom >= VOTES_TO_LOCK * 3) {
    topOrigin = votesTop > votesBottom
  }
}
