import ReactEcs, { Label, ReactEcsRenderer, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { animatedTris, bench, totalTris, unitCount } from './bench'
import { BUTTONS } from './controls'
import { isTopDown } from './camera'

function Hud() {
  return (
    <UiEntity
      uiTransform={{
        position: { left: 16, top: 16 },
        positionType: 'absolute',
        flexDirection: 'column',
        padding: 10
      }}
      uiBackground={{ color: Color4.create(0, 0, 0, 0.6) }}
    >
      <Label
        value={`Siege of Antrom - Slice 0 stress`}
        fontSize={18}
        color={Color4.create(1, 0.85, 0.4, 1)}
        uiTransform={{ height: 26 }}
      />
      <Label
        value={`units ${unitCount()}   mode ${bench.mode}   lod ${bench.lod ? 'on' : 'off'}   camera ${
          isTopDown() ? 'top-down' : 'avatar'
        }`}
        fontSize={15}
        uiTransform={{ height: 22 }}
      />
      <Label
        value={`animated tris ${Math.round(animatedTris() / 1000)}k / total ${Math.round(totalTris() / 1000)}k`}
        fontSize={15}
        uiTransform={{ height: 22 }}
      />
      <Label
        value={`scene tick ${Math.round(bench.fps)} fps  (${bench.frameMs.toFixed(1)} ms)`}
        fontSize={15}
        uiTransform={{ height: 22 }}
      />
      <UiEntity uiTransform={{ flexDirection: 'row', margin: { top: 8 } }}>
        {BUTTONS.map((b) => (
          <UiEntity
            key={b.label}
            uiTransform={{ width: 72, height: 30, margin: { right: 6 }, justifyContent: 'center', alignItems: 'center' }}
            uiBackground={{ color: Color4.create(0.15, 0.18, 0.3, 1) }}
            onMouseDown={b.action}
          >
            <Label value={b.label} fontSize={14} />
          </UiEntity>
        ))}
      </UiEntity>
    </UiEntity>
  )
}

export function setupUi(): void {
  ReactEcsRenderer.setUiRenderer(Hud)
}
