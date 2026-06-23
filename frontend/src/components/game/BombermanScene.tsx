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
import { SCENE_CONFIG } from '../../game/constants/scene.constants'

type BombermanSceneProps = {
  gameState: BombermanGameState
}

export function BombermanScene({ gameState }: BombermanSceneProps) {
  const center = (BOMBERMAN_GRID_SIZE - 1) / SCENE_CONFIG.grid.centerDivisor
  const { blocks, bombs, colors } = SCENE_CONFIG

  const assets = useMemo(() => {
    const breakableMaterials = new Map(
      BREAKABLE_COLORS.map((color) => [
        color,
        new MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: blocks.breakableEmissiveIntensity,
          toneMapped: false,
        }),
      ])
    )

    return {
      solidBlockGeometry: new BoxGeometry(...blocks.solidSize),
      solidPillarGeometry: new BoxGeometry(...blocks.solidPillarSize),
      breakableCoreGeometry: new SphereGeometry(
        blocks.breakableCoreRadius,
        blocks.breakableCoreSegments,
        blocks.breakableCoreSegments
      ),
      breakableShellGeometry: new BoxGeometry(...blocks.breakableShellSize),
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
        metalness: blocks.metallicMetalness,
      }),
      solidPillarMaterial: new MeshStandardMaterial({
        color: colors.solidPillar,
      }),
      breakableShellMaterial: new MeshStandardMaterial({
        color: colors.breakableShell,
        transparent: true,
        opacity: blocks.breakableShellOpacity,
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
        position: [
          center,
          SCENE_CONFIG.camera.height,
          center + SCENE_CONFIG.camera.distanceFromCenter,
        ],
        fov: SCENE_CONFIG.camera.fov,
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
      <OrbitControls
        target={[center, 0, center]}
        enablePan={false}
        minDistance={SCENE_CONFIG.orbit.minDistance}
        maxDistance={SCENE_CONFIG.orbit.maxDistance}
        maxPolarAngle={Math.PI * SCENE_CONFIG.orbit.maxPolarAngleRatio}
      />

      <mesh
        rotation={[-Math.PI / SCENE_CONFIG.grid.centerDivisor, 0, 0]}
        position={[center, SCENE_CONFIG.ground.y, center]}
      >
        <planeGeometry
          args={[
            BOMBERMAN_GRID_SIZE + SCENE_CONFIG.ground.sizePadding,
            BOMBERMAN_GRID_SIZE + SCENE_CONFIG.ground.sizePadding,
          ]}
        />
        <MeshReflectorMaterial
          blur={SCENE_CONFIG.ground.reflectorBlur}
          resolution={SCENE_CONFIG.ground.reflectorResolution}
          mixBlur={SCENE_CONFIG.ground.reflectorMixBlur}
          mixStrength={SCENE_CONFIG.ground.reflectorMixStrength}
          roughness={SCENE_CONFIG.ground.reflectorRoughness}
          depthScale={SCENE_CONFIG.ground.reflectorDepthScale}
          minDepthThreshold={SCENE_CONFIG.ground.minDepthThreshold}
          maxDepthThreshold={SCENE_CONFIG.ground.maxDepthThreshold}
          color={colors.ground}
          metalness={blocks.metallicMetalness}
        />
      </mesh>
      <Grid
        args={[BOMBERMAN_GRID_SIZE, BOMBERMAN_GRID_SIZE]}
        cellColor={colors.gridCell}
        sectionColor={colors.gridSection}
        position={[center, SCENE_CONFIG.grid.y, center]}
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
                    color={colors.solidEdge}
                    opacity={blocks.solidEdgeOpacity}
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
                <Edges color={colors.breakableEdge} />
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
