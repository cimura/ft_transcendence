import { create } from 'zustand'
import { computeBombExplosion } from '../game/bomb-explosion'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'
import type { ClientGameState } from '../types/game'

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
    set((state) => ({
      gameState: computeBombExplosion(state.gameState, data),
    })),
}))
