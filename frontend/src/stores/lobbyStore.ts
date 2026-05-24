import { create } from 'zustand'
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

export const useLobbyStore = create<LobbyStore>((set) => ({
  rooms: mockRooms,
  currentRoom: null,
  setRooms: (rooms) => set({ rooms }),
  upsertRoom: (room) =>
    set((s) => ({
      rooms: s.rooms.some((r) => r.id === room.id)
        ? s.rooms.map((r) => (r.id === room.id ? room : r))
        : [...s.rooms, room],
    })),
  removeRoom: (id) =>
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) })),
  setCurrentRoom: (room) => set({ currentRoom: room }),
}))
