// frontend/src/components/game/models/Bom.tsx

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: {
    Torus001: THREE.Mesh
  }
  materials: Record<string, THREE.Material>
  animations: THREE.AnimationClip[]
}

export function BombModel(props: ThreeElements['group']) {
  const { nodes } = useGLTF('/Bom.glb') as unknown as GLTFResult

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Torus001.geometry}
        position={[0, -0.2, 0]}
        rotation={[-0.6, 0.7, 0]} // まっすぐな向きにリセット
      >
        {/* 色を赤に固定し、白飛び・黒潰れしない質感に設定 */}
        <meshStandardMaterial
          color="#fffb13"
          roughness={0.2}
          metalness={0.9}
          emissive="#233307" // 光る色（赤）
          emissiveIntensity={6.2} // 光の強さ
          toneMapped={false} // 周りの明るさに影響されず光らせる
        />
      </mesh>
    </group>
  )
}

useGLTF.preload('/Bom.glb')
