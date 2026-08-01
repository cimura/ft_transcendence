// frontend/src/game/models/Break_Rock1.tsx

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: {
    // ※もし後で「ノードが見つからない」というエラーが出たら、ここをBlenderでの名前に変えます
    Icosphere: THREE.Mesh 
  }
  materials: {
    ['Material.001']: THREE.MeshStandardMaterial
  }
}

type BreakRock1Props = ThreeElements['group'] & {
  color?: string
}

export function BreakRock1({ color = '#4a3018', ...props }: BreakRock1Props) {
  // パスを /Break_Rock1.glb に修正しています
  const { nodes } = useGLTF('/Break_Rock1.glb') as unknown as GLTFResult
  
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Icosphere.geometry} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          roughness={1.0} 
          metalness={1.9} 
        />
      </mesh>
    </group>
  )
}

// プリロードのパスも修正
useGLTF.preload('/Break_Rock1.glb')