// frontend/src/components/game/BombermanCharacter.tsx
import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, Material } from 'three'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import { ProceduralUFO } from './models/ProceduralUFO'

type BombermanCharacterProps = {
  player: PlayerSnapshot
}

const MOVEMENT_EPSILON = 0.001
// UFOなので、少しゆっくりフワフワするように調整しています
const WALK_BOB_FREQUENCY = 10 
const WALK_BOB_AMPLITUDE = 0.05
const IDLE_BOB_FREQUENCY = 2
const IDLE_BOB_AMPLITUDE = 0.08
const CHARACTER_BASE_HEIGHT = 0.5 // UFOを地面から少し浮かす
const ROTATION_SMOOTHING = 0.2
const FULL_TURN_RADIANS = Math.PI * 2

// Blinking effect constants
const DISCONNECTED_BLINK_SPEED = 5
const MIN_OPACITY = 0.2
const MAX_OPACITY = 0.7

export const BombermanCharacter = forwardRef<Group, BombermanCharacterProps>(
  ({ player }, ref) => {
    const groupRef = useRef<Group>(null)
    const lastPositionRef = useRef({ ...player.position })
    const materialsRef = useRef<Material[]>([])

    useImperativeHandle(ref, () => groupRef.current as Group)

    useEffect(() => {
      if (groupRef.current) {
        const materials: Material[] = []
        groupRef.current.traverse((child) => {
          const mesh = child as Mesh
          // DreiのEdgesなどの一部Lineオブジェクトを除外し、MeshかつMaterialがあるものだけを取得
          if (mesh.isMesh && mesh.material) {
            materials.push(mesh.material as Material)
          }
        })
        materialsRef.current = materials
      }
    }, [])

    useFrame((state) => {
      const group = groupRef.current
      if (!group) return

      const dx = player.position.x - lastPositionRef.current.x
      const dz = player.position.z - lastPositionRef.current.z
      const isMoving =
        Math.abs(dx) > MOVEMENT_EPSILON || Math.abs(dz) > MOVEMENT_EPSILON
      const time = state.clock.elapsedTime

      // フワフワ浮くボビング処理
      const bobbing = isMoving
        ? Math.abs(Math.sin(time * WALK_BOB_FREQUENCY)) * WALK_BOB_AMPLITUDE
        : Math.sin(time * IDLE_BOB_FREQUENCY) * IDLE_BOB_AMPLITUDE

      group.position.set(
        player.position.x,
        CHARACTER_BASE_HEIGHT + bobbing,
        player.position.z
      )

      // 進行方向に向く回転処理
      if (isMoving) {
        const targetAngle = Math.atan2(dx, dz)
        let diff = targetAngle - group.rotation.y
        while (diff < -Math.PI) diff += FULL_TURN_RADIANS
        while (diff > Math.PI) diff -= FULL_TURN_RADIANS
        group.rotation.y += diff * ROTATION_SMOOTHING
      }

      // --- BLINKING LOGIC ---
      if (player.isDisconnected) {
        const blinkOpacity =
          MIN_OPACITY +
          Math.abs(Math.sin(time * DISCONNECTED_BLINK_SPEED)) *
            (MAX_OPACITY - MIN_OPACITY)

        for (let i = 0; i < materialsRef.current.length; i++) {
          materialsRef.current[i].opacity = blinkOpacity
        }
      } else {
        for (let i = 0; i < materialsRef.current.length; i++) {
          if (materialsRef.current[i].opacity !== 1) {
            materialsRef.current[i].opacity = 1
          }
        }
      }

      lastPositionRef.current = { ...player.position }
    })

    if (!player.alive) return null

    return (
      <group ref={groupRef}>
        {/* 元々のBoxやSphereの代わりに、ProceduralUFOコンポーネントを配置 */}
        <ProceduralUFO 
          playerColor={player.color} 
          scale={[0.25, 0.25, 0.25]} // マス目のサイズに合わせて調整（必要なら変更してください）
        />
      </group>
    )
  }
)

BombermanCharacter.displayName = 'BombermanCharacter'