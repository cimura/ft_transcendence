import { Canvas } from '@react-three/fiber'
import {
  Box,
  Edges,
  Grid,
  MeshReflectorMaterial,
  OrbitControls,
  Sphere,
} from '@react-three/drei'
import {
  BOMBERMAN_GRID_SIZE,
  getBreakableColor,
} from '../../game/bomberman/bombermanMap'
import type { BombermanGameState } from '../../game/bomberman/bombermanTypes'
import { BombermanCharacter } from './BombermanCharacter'
import { BombermanEffects } from './BombermanEffects'

type BombermanSceneProps = {
  gameState: BombermanGameState
}

export function BombermanScene({ gameState }: BombermanSceneProps) {
  const center = (BOMBERMAN_GRID_SIZE - 1) / 2

  return (
    <Canvas camera={{ position: [center, 8, center + 7], fov: 58 }}>
      <color attach="background" args={['#010103']} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[10, 10, 5]} intensity={0.7} />
      <pointLight
        position={[center, 3, center]}
        color="#ff00ff"
        intensity={4}
        distance={15}
      />
      <OrbitControls
        target={[center, 0, center]}
        enablePan={false}
        minDistance={6}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.46}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center, -0.5, center]}>
        <planeGeometry
          args={[BOMBERMAN_GRID_SIZE + 1, BOMBERMAN_GRID_SIZE + 1]}
        />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={1}
          mixStrength={40}
          roughness={0.22}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#050510"
          metalness={0.9}
        />
      </mesh>
      <Grid
        args={[BOMBERMAN_GRID_SIZE, BOMBERMAN_GRID_SIZE]}
        cellColor="#222222"
        sectionColor="#00ffff"
        position={[center, -0.48, center]}
      />

      {gameState.map.map((row, y) =>
        row.map((tile, x) => {
          if (tile === 'empty') return null

          if (tile === 'solid') {
            return (
              <group key={`${x}-${y}`} position={[x, 0, y]}>
                <Box args={[1, 1, 1]}>
                  <meshStandardMaterial color="#080808" metalness={0.9} />
                  <Edges color="#00ffff" opacity={0.22} transparent />
                </Box>
                <Box args={[0.5, 1.1, 0.5]}>
                  <meshStandardMaterial color="#111111" />
                </Box>
              </group>
            )
          }

          const color = getBreakableColor(x, y)
          return (
            <group key={`${x}-${y}`} position={[x, 0, y]}>
              <Sphere args={[0.35, 16, 16]}>
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={2}
                  toneMapped={false}
                />
              </Sphere>
              <Box args={[0.9, 0.9, 0.9]}>
                <meshStandardMaterial
                  color="#111111"
                  transparent
                  opacity={0.6}
                />
                <Edges color="#333333" />
              </Box>
            </group>
          )
        })
      )}

      {gameState.bombs.map((bomb) => (
        <group key={bomb.id} position={[bomb.position.x, 0, bomb.position.y]}>
          <Sphere args={[0.3, 32, 32]}>
            <meshStandardMaterial
              color={bomb.ownerId === 'local-player' ? '#ffffff' : '#ff0000'}
              emissive={bomb.ownerId === 'local-player' ? '#00ffff' : '#ff0000'}
              emissiveIntensity={4}
              toneMapped={false}
            />
          </Sphere>
          <Sphere args={[0.4, 16, 16]}>
            <meshBasicMaterial
              color="#ffffff"
              wireframe
              transparent
              opacity={0.4}
            />
          </Sphere>
        </group>
      ))}

      <BombermanEffects
        explosions={gameState.explosions}
        smokes={gameState.smokes}
      />

      {gameState.players.map((player) => (
        <BombermanCharacter key={player.id} player={player} />
      ))}
    </Canvas>
  )
}
