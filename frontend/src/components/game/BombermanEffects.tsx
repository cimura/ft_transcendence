import { Box, Sphere } from '@react-three/drei'
import type { BombermanExplosion } from '../../types/game'

type BombermanEffectsProps = {
  explosions: BombermanExplosion[]
}

const EXPLOSION_BOX_SIZE = 1
const EXPLOSION_SPHERE_RADIUS = 0.5
const EXPLOSION_SEGMENTS = 16
const EXPLOSION_OPACITY = 0.58

export function BombermanEffects({ explosions }: BombermanEffectsProps) {
  return (
    <>
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
