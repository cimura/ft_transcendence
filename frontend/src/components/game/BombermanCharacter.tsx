import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere } from '@react-three/drei'
import type { Group } from 'three'
import type { BombermanPlayer } from '../../game/bomberman/bombermanTypes'

type BombermanCharacterProps = {
  player: BombermanPlayer
}

const MOVEMENT_EPSILON = 0.001
const WALK_BOB_FREQUENCY = 15
const WALK_BOB_AMPLITUDE = 0.1
const IDLE_BOB_FREQUENCY = 3
const IDLE_BOB_AMPLITUDE = 0.05
const CHARACTER_BASE_HEIGHT = 0.3
const ROTATION_SMOOTHING = 0.2
const LEG_SWING_AMPLITUDE = 0.6
const FULL_TURN_RADIANS = Math.PI * 2
const BODY_SIZE: [number, number, number] = [0.5, 0.4, 0.4]
const HEAD_RADIUS = 0.25
const HEAD_SEGMENTS = 16
const HEAD_POSITION: [number, number, number] = [0, 0.35, 0]
const VISOR_SIZE: [number, number, number] = [0.4, 0.1, 0.15]
const VISOR_POSITION: [number, number, number] = [0, 0.35, 0.2]
const VISOR_EMISSIVE_INTENSITY = 3
const BACKPACK_SIZE: [number, number, number] = [0.3, 0.3, 0.2]
const BACKPACK_POSITION: [number, number, number] = [0, 0, -0.25]
const LEG_SIZE: [number, number, number] = [0.15, 0.3, 0.15]
const LEG_MESH_POSITION: [number, number, number] = [0, -0.15, 0]
const LEFT_LEG_POSITION: [number, number, number] = [-0.15, -0.2, 0]
const RIGHT_LEG_POSITION: [number, number, number] = [0.15, -0.2, 0]
const BODY_ROUGHNESS = 0.3
const BODY_METALNESS = 0.5
const HEAD_ROUGHNESS = 0.2
const HEAD_METALNESS = 0.8

export const BombermanCharacter = forwardRef<Group, BombermanCharacterProps>(
  ({ player }, ref) => {
    const groupRef = useRef<Group>(null)
    const leftLegRef = useRef<Group>(null)
    const rightLegRef = useRef<Group>(null)
    const lastPositionRef = useRef({ ...player.position })

    useImperativeHandle(ref, () => groupRef.current as Group)

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

      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = isMoving
          ? Math.sin(time * WALK_BOB_FREQUENCY) * LEG_SWING_AMPLITUDE
          : 0
        rightLegRef.current.rotation.x = isMoving
          ? Math.sin(time * WALK_BOB_FREQUENCY + Math.PI) * LEG_SWING_AMPLITUDE
          : 0
      }

      lastPositionRef.current = { ...player.position }
    })

    if (!player.alive) return null

    return (
      <group ref={groupRef}>
        <Box args={BODY_SIZE} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={player.color}
            roughness={BODY_ROUGHNESS}
            metalness={BODY_METALNESS}
          />
        </Box>
        <Sphere
          args={[HEAD_RADIUS, HEAD_SEGMENTS, HEAD_SEGMENTS]}
          position={HEAD_POSITION}
        >
          <meshStandardMaterial
            color="#dddddd"
            roughness={HEAD_ROUGHNESS}
            metalness={HEAD_METALNESS}
          />
        </Sphere>
        <Box args={VISOR_SIZE} position={VISOR_POSITION}>
          <meshStandardMaterial
            color={player.visorColor}
            emissive={player.visorColor}
            emissiveIntensity={VISOR_EMISSIVE_INTENSITY}
            toneMapped={false}
          />
        </Box>
        <Box args={BACKPACK_SIZE} position={BACKPACK_POSITION}>
          <meshStandardMaterial color="#222222" />
        </Box>
        <group position={LEFT_LEG_POSITION} ref={leftLegRef}>
          <Box args={LEG_SIZE} position={LEG_MESH_POSITION}>
            <meshStandardMaterial color="#333333" />
          </Box>
        </group>
        <group position={RIGHT_LEG_POSITION} ref={rightLegRef}>
          <Box args={LEG_SIZE} position={LEG_MESH_POSITION}>
            <meshStandardMaterial color="#333333" />
          </Box>
        </group>
      </group>
    )
  }
)

BombermanCharacter.displayName = 'BombermanCharacter'
