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

const HASH_MULTIPLIER = 31
const HASH_MODULUS = 9973
const SMOKE_PARTICLE_COUNT = 5
const CENTERED_RANDOM_OFFSET = 0.5
const SMOKE_SPREAD = 0.8
const SMOKE_INITIAL_HEIGHT = 0.5
const SMOKE_SPEED_RANGE = 1.5
const SMOKE_MIN_SPEED = 0.5
const SMOKE_SCALE_RANGE = 0.4
const SMOKE_MIN_SCALE = 0.1
const SMOKE_RISE_SCALE_RATE = 1.2
const SMOKE_HEIGHT_SEED_OFFSET = 10
const SMOKE_Z_SEED_OFFSET = 20
const SMOKE_SPEED_SEED_OFFSET = 30
const SMOKE_SCALE_SEED_OFFSET = 40
const SMOKE_SEGMENTS = 8
const SMOKE_OPACITY = 0.55
const EXPLOSION_BOX_SIZE = 1
const EXPLOSION_SPHERE_RADIUS = 0.5
const EXPLOSION_SEGMENTS = 16
const EXPLOSION_OPACITY = 0.58

const seededValue = (seed: string, index: number) => {
  let hash = 0
  const input = `${seed}-${index}`
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * HASH_MULTIPLIER + input.charCodeAt(i)) % HASH_MODULUS
  }
  return hash / HASH_MODULUS
}

function SmokeParticle({ smoke }: { smoke: BombermanSmoke }) {
  const groupRef = useRef<Group>(null)
  const particles = useMemo(
    () =>
      Array.from({ length: SMOKE_PARTICLE_COUNT }).map((_, index) => ({
        id: `${smoke.id}-${index}`,
        x:
          smoke.position.x +
          (seededValue(smoke.id, index) - CENTERED_RANDOM_OFFSET) *
            SMOKE_SPREAD,
        y:
          seededValue(smoke.id, index + SMOKE_HEIGHT_SEED_OFFSET) *
          SMOKE_INITIAL_HEIGHT,
        z:
          smoke.position.y +
          (seededValue(smoke.id, index + SMOKE_Z_SEED_OFFSET) -
            CENTERED_RANDOM_OFFSET) *
            SMOKE_SPREAD,
        speed:
          seededValue(smoke.id, index + SMOKE_SPEED_SEED_OFFSET) *
            SMOKE_SPEED_RANGE +
          SMOKE_MIN_SPEED,
        scale:
          seededValue(smoke.id, index + SMOKE_SCALE_SEED_OFFSET) *
            SMOKE_SCALE_RANGE +
          SMOKE_MIN_SCALE,
      })),
    [smoke.id, smoke.position.x, smoke.position.y]
  )

  useFrame((_, delta) => {
    groupRef.current?.children.forEach((child, index) => {
      child.position.y += delta * particles[index].speed
      const scale = child.scale.x + delta * SMOKE_RISE_SCALE_RATE
      child.scale.set(scale, scale, scale)
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <Sphere
          key={particle.id}
          args={[particle.scale, SMOKE_SEGMENTS, SMOKE_SEGMENTS]}
          position={[particle.x, particle.y, particle.z]}
        >
          <meshBasicMaterial
            color={smoke.color}
            transparent
            opacity={SMOKE_OPACITY}
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
            <Box
              args={[
                EXPLOSION_BOX_SIZE,
                EXPLOSION_BOX_SIZE,
                EXPLOSION_BOX_SIZE,
              ]}
            >
              <meshBasicMaterial
                color="#ff00ff"
                transparent
                opacity={EXPLOSION_OPACITY}
                toneMapped={false}
              />
            </Box>
            <Sphere
              args={[
                EXPLOSION_SPHERE_RADIUS,
                EXPLOSION_SEGMENTS,
                EXPLOSION_SEGMENTS,
              ]}
            >
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </Sphere>
          </group>
        ))
      )}
    </>
  )
}
