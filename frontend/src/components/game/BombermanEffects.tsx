import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere } from '@react-three/drei'
import type { Group } from 'three'
import type {
  BombermanExplosion,
  BombermanSmoke,
} from '../../game/bomberman/bombermanTypes'

type BombermanEffectsProps = {
  explosions: BombermanExplosion[]
  smokes: BombermanSmoke[]
}

const seededValue = (seed: string, index: number) => {
  let hash = 0
  const input = `${seed}-${index}`
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 9973
  }
  return hash / 9973
}

function SmokeParticle({ smoke }: { smoke: BombermanSmoke }) {
  const groupRef = useRef<Group>(null)
  const particles = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => ({
        id: `${smoke.id}-${index}`,
        x: smoke.position.x + (seededValue(smoke.id, index) - 0.5) * 0.8,
        y: seededValue(smoke.id, index + 10) * 0.5,
        z: smoke.position.y + (seededValue(smoke.id, index + 20) - 0.5) * 0.8,
        speed: seededValue(smoke.id, index + 30) * 1.5 + 0.5,
        scale: seededValue(smoke.id, index + 40) * 0.4 + 0.1,
      })),
    [smoke.id, smoke.position.x, smoke.position.y]
  )

  useFrame((_, delta) => {
    groupRef.current?.children.forEach((child, index) => {
      child.position.y += delta * particles[index].speed
      const scale = child.scale.x + delta * 1.2
      child.scale.set(scale, scale, scale)
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <Sphere
          key={particle.id}
          args={[particle.scale, 8, 8]}
          position={[particle.x, particle.y, particle.z]}
        >
          <meshBasicMaterial
            color={smoke.color}
            transparent
            opacity={0.55}
            toneMapped={false}
          />
        </Sphere>
      ))}
    </group>
  )
}

export function BombermanEffects({
  explosions,
  smokes,
}: BombermanEffectsProps) {
  return (
    <>
      {smokes.map((smoke) => (
        <SmokeParticle key={smoke.id} smoke={smoke} />
      ))}
      {explosions.flatMap((explosion) =>
        explosion.cells.map((cell) => (
          <group
            key={`${explosion.id}-${cell.x}-${cell.y}`}
            position={[cell.x, 0, cell.y]}
          >
            <Box args={[1, 1, 1]}>
              <meshBasicMaterial
                color="#ff00ff"
                transparent
                opacity={0.58}
                toneMapped={false}
              />
            </Box>
            <Sphere args={[0.5, 16, 16]}>
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </Sphere>
          </group>
        ))
      )}
    </>
  )
}
