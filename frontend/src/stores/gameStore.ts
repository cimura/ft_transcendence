import { create } from 'zustand'
import { EXPLOSION_DURATION_MS } from '../constants/game-constants'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'
import type { BombermanExplosion, ClientGameState } from '../types/game'

type GameStore = {
  gameState: ClientGameState
  setGameState: (state: ClientGameState) => void

  myPlayerId: string | null
  setMyPlayerId: (id: string | null) => void

  resultStats: Parameters<ServerToClientEvents['game:end']>[0] | null
  setResultStats: (
    stats: Parameters<ServerToClientEvents['game:end']>[0] | null
  ) => void

  errorMessage: string | undefined
  setErrorMessage: (msg: string | undefined) => void

  applyBombExplosion: (
    data: Parameters<ServerToClientEvents['bomb:explode']>[0]
  ) => void
}

const defaultState: ClientGameState = {
  map: [],
  players: {},
  bombs: {},
  explosions: [],
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: defaultState,
  setGameState: (newState) => set({ gameState: newState }),

  myPlayerId: null,
  setMyPlayerId: (id) => set({ myPlayerId: id }),

  resultStats: null,
  setResultStats: (stats) => set({ resultStats: stats }),

  errorMessage: undefined,
  setErrorMessage: (msg) => set({ errorMessage: msg }),

  applyBombExplosion: (data) =>
    set((state) => {
      const current = state.gameState

      // 爆弾の削除
      const newBombs = { ...current.bombs }
      delete newBombs[data.bombId]

      // マップの更新（破壊されたブロックを空にする）
      const newMap = [...current.map]
      data.destroyedBlocks.forEach((pos) => {
        newMap[pos.y] = [...newMap[pos.y]]
        newMap[pos.y][pos.x] = 'empty'
      })

      // プレイヤーの生存状態の更新
      const newPlayers = { ...current.players }
      data.damagedPlayerIds.forEach((pid) => {
        if (newPlayers[pid]) {
          newPlayers[pid] = { ...newPlayers[pid], alive: false }
        }
      })

      // 爆発エフェクトの追加
      const explosion: BombermanExplosion = {
        id: `exp_${Date.now()}_${Math.random()}`,
        cells: data.affectedTiles,
        expiresAt: Date.now() + EXPLOSION_DURATION_MS,
      }

      return {
        gameState: {
          ...current,
          map: newMap,
          bombs: newBombs,
          players: newPlayers,
          explosions: [...current.explosions, explosion],
        },
      }
    }),
}))
