import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { GameRoom } from '../types/room'

interface RoomStore {
  rooms: GameRoom[]
  currentRoom: GameRoom | null
  setRooms: (rooms: GameRoom[]) => void
  upsertRoom: (room: GameRoom) => void
  removeRoom: (roomId: string) => void
  setCurrentRoom: (room: GameRoom | null) => void
}

export const useRoomStore = create<RoomStore>()(
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
        const index = state.rooms.findIndex((item) => item.id === room.id)
        if (index >= 0) {
          state.rooms[index] = room
        } else {
          state.rooms.push(room)
        }
        if (state.currentRoom?.id === room.id) {
          state.currentRoom = room
        }
      }),
    removeRoom: (id) =>
      set((state) => {
        state.rooms = state.rooms.filter((room) => room.id !== id)
        if (state.currentRoom?.id === id) {
          state.currentRoom = null
        }
      }),
    setCurrentRoom: (room) => set({ currentRoom: room }),
  }))
)
