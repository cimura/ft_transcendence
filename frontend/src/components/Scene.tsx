import { Canvas } from '@react-three/fiber'


export default function Scene() {
	return (
		<>
			<div className='bg-green-300'>
				<h1 className='text-center'>Login Success!</h1>
			</div>
			<div className='canvasCotainer'>
				<Canvas>
					<mesh>
						<sphereGeometry/>
						<meshNormalMaterial/>
					</mesh>
				</Canvas>
			</div>
		</>
	)
}