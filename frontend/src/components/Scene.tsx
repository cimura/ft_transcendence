import { Canvas } from '@react-three/fiber'


export default function Scene() {
	return (
		<div className='canvasCotainer'>
			<Canvas>
				<mesh>
					<sphereGeometry/>
					<meshNormalMaterial/>
				</mesh>
			</Canvas>
		</div>
	)
}