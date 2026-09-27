import { startBench } from './bench'
import { startCamera } from './camera'
import { buildControls } from './controls'
import { setupUi } from './ui'

export function main(): void {
  startBench()
  buildControls()
  startCamera()
  setupUi()
  console.log('[bench] ready')
}
