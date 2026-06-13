export type TileType = 'empty' | 'solid' | 'breakable'

export type Direction = 'up' | 'down' | 'left' | 'right'

export type BombermanInput =
  | { type: 'move'; direction: Direction }
  | { type: 'stop' }
  | { type: 'place_bomb' }

export type BombermanMap = TileType[][]

export type BombermanPlayerPreview = {
  id: string
  username: string
  gridX: number
  gridY: number
  color: string
}
