import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: {
    Icosphere: THREE.Mesh
  }
  materials: {
    ['Material.001']: THREE.MeshStandardMaterial
  }
}

type BreakBlockProps = ThreeElements['group'] & {
  color?: string
}

export function BreakBlock({ color = '#4a3018', ...props }: BreakBlockProps) {
  // materials は使わないので nodes だけ受け取ります
  const { nodes } = useGLTF('/Break_Rock.glb') as unknown as GLTFResult
  
  return (
    <group {...props} dispose={null}>
      {/* material属性を削除し、中に meshStandardMaterial を追加します */}
      <mesh geometry={nodes.Icosphere.geometry} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color={color} 
          roughness={1.0} 
          metalness={0.0} 
        />
      </mesh>
    </group>
  )
}

useGLTF.preload('/Break_Rock.glb')