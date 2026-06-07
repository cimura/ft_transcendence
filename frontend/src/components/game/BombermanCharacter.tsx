import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere } from '@react-three/drei'
import type { Group } from 'three'
import type { BombermanPlayer } from '../../game/bomberman/bombermanTypes'

type BombermanCharacterProps = {
  player: BombermanPlayer
}

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
      const isMoving = Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001
      const time = state.clock.elapsedTime
      const bobbing = isMoving
        ? Math.abs(Math.sin(time * 15)) * 0.1
        : Math.sin(time * 3) * 0.05

      group.position.set(player.position.x, 0.3 + bobbing, player.position.z)

      if (isMoving) {
        const targetAngle = Math.atan2(dx, dz)
        let diff = targetAngle - group.rotation.y
        while (diff < -Math.PI) diff += Math.PI * 2
        while (diff > Math.PI) diff -= Math.PI * 2
        group.rotation.y += diff * 0.2
      }

      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = isMoving ? Math.sin(time * 15) * 0.6 : 0
        rightLegRef.current.rotation.x = isMoving
          ? Math.sin(time * 15 + Math.PI) * 0.6
          : 0
      }

      lastPositionRef.current = { ...player.position }
    })

    if (!player.alive) return null

    return (
      <group ref={groupRef}>
        <Box args={[0.5, 0.4, 0.4]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={player.color}
            roughness={0.3}
            metalness={0.5}
          />
        </Box>
        <Sphere args={[0.25, 16, 16]} position={[0, 0.35, 0]}>
          <meshStandardMaterial
            color="#dddddd"
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
        <Box args={[0.4, 0.1, 0.15]} position={[0, 0.35, 0.2]}>
          <meshStandardMaterial
            color={player.visorColor}
            emissive={player.visorColor}
            emissiveIntensity={3}
            toneMapped={false}
          />
        </Box>
        <Box args={[0.3, 0.3, 0.2]} position={[0, 0, -0.25]}>
          <meshStandardMaterial color="#222222" />
        </Box>
        <group position={[-0.15, -0.2, 0]} ref={leftLegRef}>
          <Box args={[0.15, 0.3, 0.15]} position={[0, -0.15, 0]}>
            <meshStandardMaterial color="#333333" />
          </Box>
        </group>
        <group position={[0.15, -0.2, 0]} ref={rightLegRef}>
          <Box args={[0.15, 0.3, 0.15]} position={[0, -0.15, 0]}>
            <meshStandardMaterial color="#333333" />
          </Box>
        </group>
      </group>
    )
  }
)

BombermanCharacter.displayName = 'BombermanCharacter'
