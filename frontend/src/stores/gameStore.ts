import { create } from 'zustand'
import { computeBombExplosion } from '../game/bomb-explosion'
import type {
  GamePhase,
  ServerToClientEvents,
} from '@ft_transcendence/shared/game-events.types'
import type { ClientGameState } from '../types/game'

type GameStore = {
  gameState: ClientGameState
  setGameState: (state: ClientGameState) => void

  gamePhase: GamePhase
  setGamePhase: (phase: GamePhase) => void

  countdown: { seconds: number; startsAt: number } | null
  setCountdown: (
    countdown: { seconds: number; startsAt: number } | null
  ) => void

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

  gamePhase: 'waiting',
  setGamePhase: (phase) => set({ gamePhase: phase }),

  countdown: null,
  setCountdown: (countdown) => set({ countdown }),

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
