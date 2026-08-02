// frontend/src/components/game/models/ProceduralUFO.tsx
import * as THREE from 'three'
import { useMemo, useEffect } from 'react'
import { Edges } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'

type ProceduralUFOProps = ThreeElements['group'] & {
  playerColor?: string
}

export function ProceduralUFO({
  playerColor = '#00ffff',
  ...props
}: ProceduralUFOProps) {
  const { hullMaterial, glassMaterial, neonMaterial } = useMemo(() => {
    const hullMaterial = new THREE.MeshStandardMaterial({
      color: '#33333a',
      metalness: 1.0,
      roughness: 0.4,
      flatShading: false,
      transparent: true,
    })

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: '#aaddff',
      metalness: 0.2,
      roughness: 0.05,
      transparent: true,
      opacity: 0.6,
    })

    const neonMaterial = new THREE.MeshStandardMaterial({
      color: playerColor,
      emissive: playerColor,
      emissiveIntensity: 4.0,
      toneMapped: false,
      transparent: true,
    })

    return { hullMaterial, glassMaterial, neonMaterial }
  }, [playerColor])

  // マテリアルのメモリリーク防止（dispose）
  useEffect(() => {
    return () => {
      hullMaterial.dispose()
      glassMaterial.dispose()
      neonMaterial.dispose()
    }
  }, [hullMaterial, glassMaterial, neonMaterial])

  return (
    <group {...props} dispose={null}>
      <mesh position={[0, 0, 0]} material={hullMaterial}>
        <cylinderGeometry args={[1.5, 1.8, 0.2, 32]} />
      </mesh>

      <mesh position={[0, 0.2, 0]} material={hullMaterial}>
        <cylinderGeometry args={[0.8, 1.5, 0.2, 32]} />
      </mesh>

      <mesh position={[0, 0.3, 0]} material={glassMaterial}>
        <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* groupからmeshに変更し、visible={false}を設定 */}
      <mesh position={[0, 0.3, 0]} scale={0.61} visible={false}>
        <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Edges color="#222222" threshold={5} lineWidth={2} />
      </mesh>

      {useMemo(() => {
        const detailCount = 8
        const details = []
        for (let i = 0; i < detailCount; i++) {
          const angle = (i / detailCount) * Math.PI * 2
          const radius = 1.6
          details.push(
            <mesh
              key={`detail-${i}`}
              position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
              rotation={[0, -angle, 0]}
              material={hullMaterial}
            >
              <boxGeometry args={[0.2, 0.1, 0.3]} />
            </mesh>
          )
        }
        return details
      }, [hullMaterial])}

      <mesh
        position={[0, 0.05, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={neonMaterial}
      >
        <torusGeometry args={[1.5, 0.05, 8, 32]} />
      </mesh>

      <mesh position={[0, -0.15, 0]} material={neonMaterial}>
        <coneGeometry args={[0.3, 0.3, 16]} />
      </mesh>
    </group>
  )
}
