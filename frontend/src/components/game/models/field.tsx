import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'
import type { ThreeElements } from '@react-three/fiber'

type GLTFResult = GLTF & {
  nodes: {
    Plane: THREE.Mesh
  }
  materials: {}
  animations: any[]
}

export function Field(props: ThreeElements['group']) {
  // ★ materials を削除し、 as unknown as GLTFResult に変更
  const { nodes } = useGLTF('/field.glb') as unknown as GLTFResult
  
  return (
    <group {...props} dispose={null}>
      {/* ★ nodes.Plane.material を使うとエラーになる場合は一旦削除し、標準マテリアルを適用します（後述の色問題への暫定対応） */}
      <mesh geometry={nodes.Plane.geometry}>
        <meshStandardMaterial color="#65737a" /> {/* デフォルトの色を仮置き */}
      </mesh>
    </group>
  )
}

useGLTF.preload('/field.glb')