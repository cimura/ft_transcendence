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

const GRID_CENTER_DIVISOR = 2
const CAMERA_HEIGHT = 8
const CAMERA_DISTANCE_FROM_CENTER = 7
const CAMERA_FOV = 58
const AMBIENT_LIGHT_INTENSITY = 0.42
const DIRECTIONAL_LIGHT_POSITION: [number, number, number] = [10, 10, 5]
const DIRECTIONAL_LIGHT_INTENSITY = 0.7
const POINT_LIGHT_HEIGHT = 3
const POINT_LIGHT_INTENSITY = 4
const POINT_LIGHT_DISTANCE = 15
const ORBIT_MIN_DISTANCE = 6
const ORBIT_MAX_DISTANCE = 14
const ORBIT_MAX_POLAR_ANGLE_RATIO = 0.46
const GROUND_Y = -0.5
const GRID_Y = -0.48
const GROUND_SIZE_PADDING = 1
const REFLECTOR_BLUR: [number, number] = [300, 80]
const REFLECTOR_RESOLUTION = 512
const REFLECTOR_MIX_BLUR = 1
const REFLECTOR_MIX_STRENGTH = 40
const REFLECTOR_ROUGHNESS = 0.22
const REFLECTOR_DEPTH_SCALE = 1
const REFLECTOR_MIN_DEPTH_THRESHOLD = 0.4
const REFLECTOR_MAX_DEPTH_THRESHOLD = 1.2
const METALLIC_BLOCK_METALNESS = 0.9
const BREAKABLE_EMISSIVE_INTENSITY = 2
const BOMB_EMISSIVE_INTENSITY = 4
const BREAKABLE_SHELL_OPACITY = 0.6
const BOMB_AURA_OPACITY = 0.4
const SOLID_EDGE_OPACITY = 0.22
const SOLID_BLOCK_SIZE: [number, number, number] = [1, 1, 1]
const SOLID_PILLAR_SIZE: [number, number, number] = [0.5, 1.1, 0.5]
const BREAKABLE_CORE_RADIUS = 0.35
const BREAKABLE_CORE_SEGMENTS = 16
const BREAKABLE_SHELL_SIZE: [number, number, number] = [0.9, 0.9, 0.9]
const BOMB_CORE_RADIUS = 0.3
const BOMB_CORE_SEGMENTS = 32
const BOMB_AURA_RADIUS = 0.4
const BOMB_AURA_SEGMENTS = 16

export function BombermanScene({ gameState }: BombermanSceneProps) {
  const center = (BOMBERMAN_GRID_SIZE - 1) / GRID_CENTER_DIVISOR
  const assets = useMemo(() => {
    const breakableMaterials = new Map(
      BREAKABLE_COLORS.map((color) => [
        color,
        new MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: BREAKABLE_EMISSIVE_INTENSITY,
          toneMapped: false,
        }),
      ])
    )

    return {
      solidBlockGeometry: new BoxGeometry(...SOLID_BLOCK_SIZE),
      solidPillarGeometry: new BoxGeometry(...SOLID_PILLAR_SIZE),
      breakableCoreGeometry: new SphereGeometry(
        BREAKABLE_CORE_RADIUS,
        BREAKABLE_CORE_SEGMENTS,
        BREAKABLE_CORE_SEGMENTS
      ),
      breakableShellGeometry: new BoxGeometry(...BREAKABLE_SHELL_SIZE),
      bombCoreGeometry: new SphereGeometry(
        BOMB_CORE_RADIUS,
        BOMB_CORE_SEGMENTS,
        BOMB_CORE_SEGMENTS
      ),
      bombAuraGeometry: new SphereGeometry(
        BOMB_AURA_RADIUS,
        BOMB_AURA_SEGMENTS,
        BOMB_AURA_SEGMENTS
      ),
      solidBlockMaterial: new MeshStandardMaterial({
        color: '#080808',
        metalness: METALLIC_BLOCK_METALNESS,
      }),
      solidPillarMaterial: new MeshStandardMaterial({ color: '#111111' }),
      breakableShellMaterial: new MeshStandardMaterial({
        color: '#111111',
        transparent: true,
        opacity: BREAKABLE_SHELL_OPACITY,
      }),
      localBombMaterial: new MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#00ffff',
        emissiveIntensity: BOMB_EMISSIVE_INTENSITY,
        toneMapped: false,
      }),
      enemyBombMaterial: new MeshStandardMaterial({
        color: '#ff0000',
        emissive: '#ff0000',
        emissiveIntensity: BOMB_EMISSIVE_INTENSITY,
        toneMapped: false,
      }),
      bombAuraMaterial: new MeshBasicMaterial({
        color: '#ffffff',
        wireframe: true,
        transparent: true,
        opacity: BOMB_AURA_OPACITY,
      }),
      breakableMaterials,
    }
  }, [])

  return (
    <Canvas
      camera={{
        position: [center, CAMERA_HEIGHT, center + CAMERA_DISTANCE_FROM_CENTER],
        fov: CAMERA_FOV,
      }}
    >
      <color attach="background" args={['#010103']} />
      <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
      <directionalLight
        position={DIRECTIONAL_LIGHT_POSITION}
        intensity={DIRECTIONAL_LIGHT_INTENSITY}
      />
      <pointLight
        position={[center, POINT_LIGHT_HEIGHT, center]}
        color="#ff00ff"
        intensity={POINT_LIGHT_INTENSITY}
        distance={POINT_LIGHT_DISTANCE}
      />
      <OrbitControls
        target={[center, 0, center]}
        enablePan={false}
        minDistance={ORBIT_MIN_DISTANCE}
        maxDistance={ORBIT_MAX_DISTANCE}
        maxPolarAngle={Math.PI * ORBIT_MAX_POLAR_ANGLE_RATIO}
      />

      <mesh
        rotation={[-Math.PI / GRID_CENTER_DIVISOR, 0, 0]}
        position={[center, GROUND_Y, center]}
      >
        <planeGeometry
          args={[
            BOMBERMAN_GRID_SIZE + GROUND_SIZE_PADDING,
            BOMBERMAN_GRID_SIZE + GROUND_SIZE_PADDING,
          ]}
        />
        <MeshReflectorMaterial
          blur={REFLECTOR_BLUR}
          resolution={REFLECTOR_RESOLUTION}
          mixBlur={REFLECTOR_MIX_BLUR}
          mixStrength={REFLECTOR_MIX_STRENGTH}
          roughness={REFLECTOR_ROUGHNESS}
          depthScale={REFLECTOR_DEPTH_SCALE}
          minDepthThreshold={REFLECTOR_MIN_DEPTH_THRESHOLD}
          maxDepthThreshold={REFLECTOR_MAX_DEPTH_THRESHOLD}
          color="#050510"
          metalness={METALLIC_BLOCK_METALNESS}
        />
      </mesh>
      <Grid
        args={[BOMBERMAN_GRID_SIZE, BOMBERMAN_GRID_SIZE]}
        cellColor="#222222"
        sectionColor="#00ffff"
        position={[center, GRID_Y, center]}
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
                  <Edges
                    color="#00ffff"
                    opacity={SOLID_EDGE_OPACITY}
                    transparent
                  />
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

      {Object.values(gameState.bombs).map((bomb) => (
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

      {Object.values(gameState.players).map((player) => (
        <BombermanCharacter key={player.id} player={player} />
      ))}
    </Canvas>
  )
}
