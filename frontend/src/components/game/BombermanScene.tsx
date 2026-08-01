// frontend/src/components/game/BombermanScene.tsx

import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { RockBlock } from './models/RockBlock'
import { BreakRock1 } from './models/Break_Rock1'
import { Field } from './models/field'
import { BombModel } from './models/Bom'
import { BREAKABLE_COLORS } from '../../components/game/utils/map-colors'
import { BOMBERMAN_GRID_SIZE } from '../../constants/game-constants'
import type { ClientGameState } from '../../types/game'
import { BombermanCharacter } from './BombermanCharacter'
import { BombermanEffects } from './BombermanEffects'
import { CameraRig } from './CameraRig'
import { SCENE_CONFIG } from '../../components/game/constants/scene-constants'

type BombermanSceneProps = {
  gameState: ClientGameState
}

export function BombermanScene({ gameState }: BombermanSceneProps) {
  const center = (BOMBERMAN_GRID_SIZE - 1) / SCENE_CONFIG.grid.centerDivisor
  const { colors } = SCENE_CONFIG // pointLightで使うためcolorsだけ残しています

  return (
    <Canvas
      camera={{
        position: [
          center,
          SCENE_CONFIG.camera.height * 1.2,
          center + SCENE_CONFIG.camera.distanceFromCenter * 1.2,
        ],
      }}
    >
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

      {/* 元々の mesh と boxGeometry による土台を削除し、Field コンポーネントに置き換え */}
      <Field position={[center, -4.2, center]} scale={[2.6, 4, 2.3]} />

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
              <group
                key={`${x}-${y}`}
                position={[x, 0.3, y]}
                scale={[0.5, 0.5, 0.6]}
              >
                <RockBlock />
              </group>
            )
          }

          // インポートされている BREAKABLE_COLORS を使用
          const colorIndex = (x * 7 + y * 13) % 3
          const blockColor = BREAKABLE_COLORS[colorIndex]

          return (
            <group
              key={`${x}-${y}`}
              position={[x, 0.3, y]}
              scale={[0.5, 0.5, 0.5]}
              rotation={[
                Math.sin(x * y) * Math.PI,
                Math.cos(x + y) * Math.PI,
                Math.sin(x - y) * Math.PI,
              ]}
            >
              <BreakRock1 color={blockColor} />
            </group>
          )
        })
      )}

      {Object.values(gameState.bombs).map((bomb) => (
        <group key={bomb.id} position={[bomb.position.x, 0.5, bomb.position.y]}>
          <BombModel scale={0.3} />
        </group>
      ))}

      <BombermanEffects explosions={gameState.explosions} />

      {Object.values(gameState.players).map((player) => (
        <BombermanCharacter key={player.id} player={player} />
      ))}
    </Canvas>
  )
}
