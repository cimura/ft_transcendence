// frontend/src/components/game/utils/fit-camera.ts
import { MathUtils, Vector3, type Box3 } from 'three'

type FitDistanceParams = {
  bounds: Box3
  target: Vector3
  direction: Vector3
  fov: number
  aspect: number
  margin: number
}

const WORLD_UP = new Vector3(0, 1, 0)

export function computeFitDistance({
  bounds,
  target,
  direction,
  fov,
  aspect,
  margin,
}: FitDistanceParams): number {
  const tanV = Math.tan(MathUtils.degToRad(fov) / 2)
  const tanH = tanV * aspect

  const backward = direction
  const right = new Vector3().crossVectors(WORLD_UP, backward)

  // directionがWORLD_UPと平行な場合（真上からの視点）NaNになるのを防ぐ
  if (right.lengthSq() < 1e-8) {
    right.set(1, 0, 0)
  }
  right.normalize()

  const up = new Vector3().crossVectors(backward, right)

  const corner = new Vector3()
  const offset = new Vector3()
  let distance = 0

  for (const cornerX of [bounds.min.x, bounds.max.x]) {
    for (const cornerY of [bounds.min.y, bounds.max.y]) {
      for (const cornerZ of [bounds.min.z, bounds.max.z]) {
        corner.set(cornerX, cornerY, cornerZ)
        offset.subVectors(corner, target)

        const x = offset.dot(right)
        const y = offset.dot(up)
        const z = offset.dot(backward)

        distance = Math.max(
          distance,
          z + Math.abs(x) / tanH,
          z + Math.abs(y) / tanV
        )
      }
    }
  }

  return distance * margin
}
