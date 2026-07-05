import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
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
    rooms: [],
    currentRoom: null,
    setRooms: (rooms) =>
      set((state) => {
        state.rooms = rooms
        const currentRoomId = state.currentRoom?.id
        if (currentRoomId) {
          state.currentRoom =
            rooms.find((room) => room.id === currentRoomId) ?? null
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
