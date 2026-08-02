// frontend/src/components/game/BombermanCharacter.tsx
import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, Material } from 'three'
import type { PlayerSnapshot } from '@ft_transcendence/shared/game-events.types'
import { ProceduralUFO } from './models/ProceduralUFO'
import { PlayerNameLabel } from './PlayerNameLabel'
import { SCENE_CONFIG } from './constants/scene-constants'

type BombermanCharacterProps = {
  player: PlayerSnapshot
}

const MOVEMENT_EPSILON = 0.001
const WALK_BOB_FREQUENCY = 10
const WALK_BOB_AMPLITUDE = 0.05
const IDLE_BOB_FREQUENCY = 2
const IDLE_BOB_AMPLITUDE = 0.08
const CHARACTER_BASE_HEIGHT = 0.5
const ROTATION_SMOOTHING = 0.2
const FULL_TURN_RADIANS = Math.PI * 2

const DISCONNECTED_BLINK_SPEED = 5
const MIN_OPACITY = 0.2
const MAX_OPACITY = 0.7

export const BombermanCharacter = forwardRef<Group, BombermanCharacterProps>(
  ({ player }, ref) => {
    const groupRef = useRef<Group>(null)
    const lastPositionRef = useRef({ ...player.position })
    const materialsRef = useRef<Material[]>([])
    const baseOpacitiesRef = useRef<number[]>([]) // 初期opacityを保存するRef

    useImperativeHandle(ref, () => groupRef.current as Group)

    // player.color を依存配列に追加し、色変更時に正しくマテリアルを再取得する
    useEffect(() => {
      if (groupRef.current) {
        const materials: Material[] = []
        groupRef.current.traverse((child) => {
          const mesh = child as Mesh
          if (mesh.isMesh && mesh.material) {
            materials.push(mesh.material as Material)
          }
        })
        materialsRef.current = materials
        baseOpacitiesRef.current = materials.map((material) => material.opacity)
      }
    }, [player.color])

    useFrame((state) => {
      const group = groupRef.current
      if (!group) return

      const dx = player.position.x - lastPositionRef.current.x
      const dz = player.position.z - lastPositionRef.current.z
      const isMoving =
        Math.abs(dx) > MOVEMENT_EPSILON || Math.abs(dz) > MOVEMENT_EPSILON
      const time = state.clock.elapsedTime

      const bobbing = isMoving
        ? Math.abs(Math.sin(time * WALK_BOB_FREQUENCY)) * WALK_BOB_AMPLITUDE
        : Math.sin(time * IDLE_BOB_FREQUENCY) * IDLE_BOB_AMPLITUDE

      group.position.set(
        player.position.x,
        CHARACTER_BASE_HEIGHT + bobbing,
        player.position.z
      )

      if (isMoving) {
        const targetAngle = Math.atan2(dx, dz)
        let diff = targetAngle - group.rotation.y
        while (diff < -Math.PI) diff += FULL_TURN_RADIANS
        while (diff > Math.PI) diff -= FULL_TURN_RADIANS
        group.rotation.y += diff * ROTATION_SMOOTHING
      }

      if (player.isDisconnected) {
        const blinkOpacity =
          MIN_OPACITY +
          Math.abs(Math.sin(time * DISCONNECTED_BLINK_SPEED)) *
            (MAX_OPACITY - MIN_OPACITY)

        for (let i = 0; i < materialsRef.current.length; i++) {
          materialsRef.current[i].opacity = blinkOpacity
        }
      } else {
        // 切断から復帰した時、1ではなく各マテリアルの初期opacity（UFOのガラス等は0.6）に戻す
        for (let i = 0; i < materialsRef.current.length; i++) {
          const baseOpacity = baseOpacitiesRef.current[i] ?? 1
          if (materialsRef.current[i].opacity !== baseOpacity) {
            materialsRef.current[i].opacity = baseOpacity
          }
        }
      }

      lastPositionRef.current = { ...player.position }
    })

    if (!player.alive) return null

    return (
      <>
        <group ref={groupRef}>
          <ProceduralUFO
            playerColor={player.color}
            scale={[0.25, 0.25, 0.25]}
          />
        </group>
        <PlayerNameLabel
          playerId={player.id}
          username={player.username}
          position={[
            player.position.x,
            SCENE_CONFIG.playerLabel.height,
            player.position.z,
          ]}
        />
      </>
    )
  }
)

BombermanCharacter.displayName = 'BombermanCharacter'
