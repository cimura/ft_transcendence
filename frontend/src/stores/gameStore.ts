import { create } from 'zustand'
import type { BombermanGameState } from '../game/bomberman/bombermanTypes'

type GameStore = {
  gameState: BombermanGameState
  setGameState: (state: BombermanGameState) => void
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
}))
