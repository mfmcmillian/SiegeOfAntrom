// In-world buttons so the benchmark can be driven both by a person (click) and by the
// Explorer MCP (`click_entity`), which cannot press screen-space UI.

import { InputAction, Material, MeshCollider, MeshRenderer, TextShape, Transform, engine, pointerEventsSystem } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { CENTER, bench, cycleMode, setCount, toggleLod } from './bench'
import { toggleTopDown } from './camera'

interface ButtonSpec {
  label: string
  action: () => void
}

export const BUTTONS: ButtonSpec[] = [
  { label: '-50', action: () => setCount(bench.count - 50) },
  { label: '-10', action: () => setCount(bench.count - 10) },
  { label: '+10', action: () => setCount(bench.count + 10) },
  { label: '+50', action: () => setCount(bench.count + 50) },
  { label: 'MODE', action: cycleMode },
  { label: 'LOD', action: toggleLod },
  { label: 'CAMERA', action: toggleTopDown }
]

const ROW_Z = CENTER.z - 22
const SPACING = 5

export function buildControls(): void {
  BUTTONS.forEach((spec, i) => {
    const x = CENTER.x + (i - (BUTTONS.length - 1) / 2) * SPACING
    const button = engine.addEntity()
    Transform.create(button, {
      position: Vector3.create(x, 0.6, ROW_Z),
      scale: Vector3.create(3.6, 1.2, 1.2)
    })
    MeshRenderer.setBox(button)
    MeshCollider.setBox(button)
    Material.setPbrMaterial(button, { albedoColor: Color4.create(0.15, 0.18, 0.3, 1), roughness: 0.8 })

    const label = engine.addEntity()
    Transform.create(label, {
      position: Vector3.create(x, 2.2, ROW_Z),
      rotation: Quaternion.fromEulerDegrees(60, 0, 0)
    })
    TextShape.create(label, { text: spec.label, fontSize: 4, textColor: Color4.White() })

    pointerEventsSystem.onPointerDown(
      { entity: button, opts: { button: InputAction.IA_POINTER, hoverText: spec.label, maxDistance: 300 } },
      spec.action
    )
  })
}
