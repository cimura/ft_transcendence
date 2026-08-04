import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: {
    Cube: THREE.Mesh
  }
  materials: {
    Material: THREE.MeshStandardMaterial
  }
}

export function RockBlock(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF(
    '/rock_block.glb'
  ) as unknown as GLTFResult

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Cube.geometry}
        material={materials.Material}
        material-color="#888899"
        material-roughness={1.0}
        material-metalness={0.0}
      />
    </group>
  )
}

useGLTF.preload('/rock_block.glb')
