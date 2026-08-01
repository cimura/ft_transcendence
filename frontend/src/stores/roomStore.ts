import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'

interface RoomStore {
  rooms: RoomSnapshot[]
  currentRoom: RoomSnapshot | null
  setRooms: (rooms: RoomSnapshot[]) => void
  upsertRoom: (room: RoomSnapshot) => void
  removeRoom: (roomId: string) => void
  setCurrentRoom: (room: RoomSnapshot | null) => void
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
