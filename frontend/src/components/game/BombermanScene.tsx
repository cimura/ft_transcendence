import { Canvas } from '@react-three/fiber'
import {
  Box,
  Edges,
  Grid,
  MeshReflectorMaterial,
  OrbitControls,
} from '@react-three/drei'
import { useMemo } from 'react'
import {
  BoxGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from 'three'
import {
  BREAKABLE_COLORS,
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
  const assets = useMemo(() => {
    const breakableMaterials = new Map(
      BREAKABLE_COLORS.map((color) => [
        color,
        new MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 2,
          toneMapped: false,
        }),
      ])
    )

    return {
      solidBlockGeometry: new BoxGeometry(1, 1, 1),
      solidPillarGeometry: new BoxGeometry(0.5, 1.1, 0.5),
      breakableCoreGeometry: new SphereGeometry(0.35, 16, 16),
      breakableShellGeometry: new BoxGeometry(0.9, 0.9, 0.9),
      bombCoreGeometry: new SphereGeometry(0.3, 32, 32),
      bombAuraGeometry: new SphereGeometry(0.4, 16, 16),
      solidBlockMaterial: new MeshStandardMaterial({
        color: '#080808',
        metalness: 0.9,
      }),
      solidPillarMaterial: new MeshStandardMaterial({ color: '#111111' }),
      breakableShellMaterial: new MeshStandardMaterial({
        color: '#111111',
        transparent: true,
        opacity: 0.6,
      }),
      localBombMaterial: new MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#00ffff',
        emissiveIntensity: 4,
        toneMapped: false,
      }),
      enemyBombMaterial: new MeshStandardMaterial({
        color: '#ff0000',
        emissive: '#ff0000',
        emissiveIntensity: 4,
        toneMapped: false,
      }),
      bombAuraMaterial: new MeshBasicMaterial({
        color: '#ffffff',
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      }),
      breakableMaterials,
    }
  }, [])

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
                <Box
                  geometry={assets.solidBlockGeometry}
                  material={assets.solidBlockMaterial}
                >
                  <Edges color="#00ffff" opacity={0.22} transparent />
                </Box>
                <Box
                  geometry={assets.solidPillarGeometry}
                  material={assets.solidPillarMaterial}
                />
              </group>
            )
          }

          const color = getBreakableColor(x, y)
          const breakableMaterial = assets.breakableMaterials.get(color)

          return (
            <group key={`${x}-${y}`} position={[x, 0, y]}>
              <mesh
                geometry={assets.breakableCoreGeometry}
                material={breakableMaterial}
              />
              <Box
                geometry={assets.breakableShellGeometry}
                material={assets.breakableShellMaterial}
              >
                <Edges color="#333333" />
              </Box>
            </group>
          )
        })
      )}

      {gameState.bombs.map((bomb) => (
        <group key={bomb.id} position={[bomb.position.x, 0, bomb.position.y]}>
          <mesh
            geometry={assets.bombCoreGeometry}
            material={
              bomb.ownerId === 'local-player'
                ? assets.localBombMaterial
                : assets.enemyBombMaterial
            }
          />
          <mesh
            geometry={assets.bombAuraGeometry}
            material={assets.bombAuraMaterial}
          />
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
