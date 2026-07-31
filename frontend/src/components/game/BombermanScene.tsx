import { Canvas } from '@react-three/fiber'
import { Edges, Grid } from '@react-three/drei'
import { useMemo } from 'react'
import {
  BoxGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  IcosahedronGeometry,
} from 'three'
import {
  BREAKABLE_COLORS,
  getBreakableColor,
} from '../../components/game/utils/map-colors'
import { BOMBERMAN_GRID_SIZE } from '../../constants/game-constants'
import type { ClientGameState } from '../../types/game'
import { BombermanCharacter } from './BombermanCharacter'
import { BombermanEffects } from './BombermanEffects'
import { CameraRig } from './CameraRig'
import { SCENE_CONFIG } from '../../components/game/constants/scene-constants'
import { useGameStore } from '../../stores/gameStore'

type BombermanSceneProps = {
  gameState: ClientGameState
}

export function BombermanScene({ gameState }: BombermanSceneProps) {
  const myPlayerId = useGameStore((state) => state.myPlayerId)
  const center = (BOMBERMAN_GRID_SIZE - 1) / SCENE_CONFIG.grid.centerDivisor
  const { blocks, bombs, colors } = SCENE_CONFIG

  const assets = useMemo(() => {
    const breakableMaterials = new Map(
      BREAKABLE_COLORS.map((color) => [
        color,
        new MeshStandardMaterial({
          color,
          roughness: 1.0,
          metalness: 0.1,
          emissive: color,
          emissiveIntensity: 0.15,
          flatShading: true,
        }),
      ])
    )

    return {
      solidBlockGeometry: new BoxGeometry(...blocks.solidSize),
      breakableBlockGeometry: new IcosahedronGeometry(0.55, 1),
      
      bombCoreGeometry: new SphereGeometry(
        bombs.coreRadius,
        bombs.coreSegments,
        bombs.coreSegments
      ),
      bombAuraGeometry: new SphereGeometry(
        bombs.auraRadius,
        bombs.auraSegments,
        bombs.auraSegments
      ),
      
      solidBlockMaterial: new MeshStandardMaterial({
        color: colors.solidBlock,
        roughness: 0.8,
        metalness: 0.4,
      }),
      
      localBombMaterial: new MeshStandardMaterial({
        color: colors.localBomb,
        emissive: colors.localBombEmissive,
        emissiveIntensity: bombs.emissiveIntensity,
        toneMapped: false,
      }),
      enemyBombMaterial: new MeshStandardMaterial({
        color: colors.enemyBomb,
        emissive: colors.enemyBombEmissive,
        emissiveIntensity: bombs.emissiveIntensity,
        toneMapped: false,
      }),
      bombAuraMaterial: new MeshBasicMaterial({
        color: colors.bombAura,
        wireframe: true,
        transparent: true,
        opacity: bombs.auraOpacity,
      }),
      breakableMaterials,
    }
  }, [blocks, bombs, colors])

  return (
    <Canvas
      camera={{
        // 前回は 0.85 でしたが、今回は 1.2 倍にしてカメラを遠くに配置します
        position: [
          center,
          SCENE_CONFIG.camera.height * 1.2,
          center + SCENE_CONFIG.camera.distanceFromCenter * 1.2,
        ],
      }}
    >
      <color attach="background" args={[colors.background]} />
      <ambientLight intensity={SCENE_CONFIG.light.ambientIntensity} />
      <directionalLight
        position={SCENE_CONFIG.light.directionalPosition}
        intensity={SCENE_CONFIG.light.directionalIntensity}
      />
      <pointLight
        position={[center, SCENE_CONFIG.light.pointHeight, center]}
        color={colors.pointLight}
        intensity={SCENE_CONFIG.light.pointIntensity}
        distance={SCENE_CONFIG.light.pointDistance}
      />
      <CameraRig />

      <mesh position={[center, -0.6, center]}>
        <boxGeometry args={[BOMBERMAN_GRID_SIZE + 1.5, 1, BOMBERMAN_GRID_SIZE + 1.5]} />
        <meshStandardMaterial 
          color="#2a2a3a" 
          roughness={0.9} 
          metalness={0.1}
        />
        <Edges color="#00ffff" opacity={0.3} transparent />
      </mesh>

      <Grid
        args={[BOMBERMAN_GRID_SIZE, BOMBERMAN_GRID_SIZE]}
        cellColor="#00ffff"
        sectionColor="#ff00ff"
        cellThickness={1.0}
        sectionThickness={1.5}
        fadeDistance={30}
        position={[center, 0.01, center]}
      />

      {gameState.map.map((row, y) =>
        row.map((tile, x) => {
          if (tile === 'empty') return null

          if (tile === 'solid') {
            return (
              <group key={`${x}-${y}`} position={[x, 0.5, y]}>
                <mesh
                  geometry={assets.solidBlockGeometry}
                  material={assets.solidBlockMaterial}
                >
                  <Edges
                    color={colors.solidEdge}
                    opacity={0.8}
                    transparent
                  />
                </mesh>
              </group>
            )
          }

          const color = getBreakableColor(x, y)
          const breakableMaterial = assets.breakableMaterials.get(color)

          return (
            <group key={`${x}-${y}`} position={[x, 0.5, y]}>
              <mesh
                geometry={assets.breakableBlockGeometry}
                material={breakableMaterial}
                rotation={[
                  Math.sin(x * y) * Math.PI,
                  Math.cos(x + y) * Math.PI,
                  Math.sin(x - y) * Math.PI
                ]}
              >
              </mesh>
            </group>
          )
        })
      )}

      {Object.values(gameState.bombs).map((bomb) => (
        <group key={bomb.id} position={[bomb.position.x, 0.5, bomb.position.y]}>
          <mesh
            geometry={assets.bombCoreGeometry}
            material={
              bomb.ownerId === myPlayerId
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

      <BombermanEffects explosions={gameState.explosions} />

      {Object.values(gameState.players).map((player) => (
        <BombermanCharacter key={player.id} player={player} />
      ))}
    </Canvas>
  )
}