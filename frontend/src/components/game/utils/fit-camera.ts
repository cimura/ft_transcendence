import { MathUtils, Vector3, type Box3 } from 'three'

type FitDistanceParams = {
  /** 画面に収めたい対象を囲む箱（ワールド座標） */
  bounds: Box3
  /** カメラの注視点 */
  target: Vector3
  /** target からカメラへ向かう単位ベクトル */
  direction: Vector3
  /** 垂直画角（度） */
  fov: number
  /** 描画領域のアスペクト比（width / height） */
  aspect: number
  /** 算出距離に掛ける余白倍率 */
  margin: number
}

const WORLD_UP = new Vector3(0, 1, 0)

/**
 * 箱の8頂点をカメラ空間へ射影し、すべてが視錐台に収まる最小のカメラ距離を求める。
 *
 * カメラ空間での頂点 (x, y, z) が画角内に入る条件は
 *   |x| <= tanH * (distance - z) かつ |y| <= tanV * (distance - z)
 * なので、頂点ごとの必要距離は max(z + |x|/tanH, z + |y|/tanV) となる。
 * 全頂点の最大値を取れば箱全体が収まる。
 */
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

  // カメラの回転基底。direction がカメラの +Z（target から見て手前）にあたる
  const backward = direction
  const right = new Vector3().crossVectors(WORLD_UP, backward).normalize()
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
