import { create } from 'zustand'
import type {
  BombermanGameState,
  GameEndPayload,
} from '../game/bomberman/bombermanTypes'

type GameStore = {
  gameState: BombermanGameState
  setGameState: (state: BombermanGameState) => void
  resultStats: GameEndPayload | null
  setResultStats: (stats: GameEndPayload | null) => void
}

const defaultState: BombermanGameState = {
  map: [],
  players: {},
  bombs: {},
  explosions: [],
  smokes: [],
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: defaultState,
  setGameState: (newState) => set({ gameState: newState }),
  resultStats: null,
  setResultStats: (stats) => set({ resultStats: stats }),
}))
