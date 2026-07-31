import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import { BOMBERMAN_GRID_SIZE } from '../../constants/game-constants'
import { SCENE_CONFIG } from './constants/scene-constants'
import { computeFitDistance } from './utils/fit-camera'

const CENTER = (BOMBERMAN_GRID_SIZE - 1) / SCENE_CONFIG.grid.centerDivisor
const GROUND_HALF_SIZE =
  (BOMBERMAN_GRID_SIZE + SCENE_CONFIG.ground.sizePadding) / 2

// フィット対象: 地面プレーン全体（X/Z）と、床からキャラクター頭頂まで（Y）
const FIT_BOUNDS = new Box3(
  new Vector3(
    CENTER - GROUND_HALF_SIZE,
    SCENE_CONFIG.ground.y,
    CENTER - GROUND_HALF_SIZE
  ),
  new Vector3(
    CENTER + GROUND_HALF_SIZE,
    SCENE_CONFIG.camera.contentTopY,
    CENTER + GROUND_HALF_SIZE
  )
)

const TARGET = new Vector3(CENTER, SCENE_CONFIG.camera.targetY, CENTER)

const DIRECTION = new Vector3(
  0,
  SCENE_CONFIG.camera.height,
  SCENE_CONFIG.camera.distanceFromCenter
).normalize()

/**
 * 描画領域のアスペクト比に応じてカメラ距離を再計算し、
 * 見下ろし角度を保ったままマップ全体が常に画面に収まるようにする。
 * ズーム・パン・回転など、ユーザー操作によるカメラ変更は行わない。
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    if (width <= 0 || height <= 0) return

    const aspect = width / height
    const distance = computeFitDistance({
      bounds: FIT_BOUNDS,
      target: TARGET,
      direction: DIRECTION,
      fov: SCENE_CONFIG.camera.fov,
      aspect,
      margin: SCENE_CONFIG.camera.fitMargin,
    })

    // three.js のカメラは R3F の描画ループが直接書き換えることを前提にした
    // ミュータブルなオブジェクトであり、Reactの状態ではない（公式のuseFrame例と同じ手続き的更新）
    // eslint-disable-next-line react-hooks/immutability -- 意図的な three.js オブジェクトの直接更新
    camera.aspect = aspect
    camera.position.copy(TARGET).addScaledVector(DIRECTION, distance)
    camera.lookAt(TARGET)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}
