import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { mockRooms } from '../mocks/room'
import type { GameRoom } from '../types/room'

interface LobbyStore {
  rooms: GameRoom[]
  currentRoom: GameRoom | null
  setRooms: (rooms: GameRoom[]) => void
  upsertRoom: (room: GameRoom) => void
  removeRoom: (roomId: string) => void
  setCurrentRoom: (room: GameRoom | null) => void
}

export const useLobbyStore = create<LobbyStore>()(
  immer((set) => ({
    rooms: mockRooms,
    currentRoom: null,
    setRooms: (rooms) =>
      set((state) => {
        state.rooms = rooms
        if (
          state.currentRoom &&
          !rooms.some((room) => room.id === state.currentRoom?.id)
        ) {
          state.currentRoom = null
        }
      }),
    upsertRoom: (room) =>
      set((state) => {
        const index = state.rooms.findIndex((r: GameRoom) => r.id === room.id)
        if (index >= 0) {
          state.rooms[index] = room // update
        } else {
          state.rooms.push(room) // insert
        }
        if (state.currentRoom?.id === room.id) {
          state.currentRoom = room
        }
      }),
    removeRoom: (id) =>
      set((state) => {
        state.rooms = state.rooms.filter((r: GameRoom) => r.id !== id)
        if (state.currentRoom?.id === id) {
          state.currentRoom = null
        }
      }),
    setCurrentRoom: (room) => set({ currentRoom: room }),
  }))
)
