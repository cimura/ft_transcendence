import { describe, it, expect } from 'vitest'
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types'
import { toGameRoom } from './roomSnapshot'

const buildSnapshot = (overrides: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  id: 'room-1',
  gameId: 'bomberman',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  players: [
    {
      userId: 'user-1',
      username: 'Host',
      avatarUrl: null,
      isReady: true,
      isHost: true,
      joinedAt: '2026-07-01T00:00:00.000Z',
    },
  ],
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  startedAt: undefined,
  finishedAt: undefined,
  ...overrides,
})

describe('toGameRoom', () => {
  it('RoomSnapshot を GameRoom に変換する', () => {
    const snapshot = buildSnapshot()

    expect(toGameRoom(snapshot)).toEqual({
      id: 'room-1',
      name: 'Test Room',
      hostId: 'user-1',
      hostName: 'Host',
      players: [
        {
          userId: 'user-1',
          username: 'Host',
          avatarUrl: undefined,
          isReady: true,
          isHost: true,
        },
      ],
      maxPlayers: 2,
      status: 'waiting',
      mode: 'online',
      mapId: undefined,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      startedAt: undefined,
      finishedAt: undefined,
    })
  })

  it('player.avatarUrl が null の場合は undefined に変換する', () => {
    const snapshot = buildSnapshot({
      players: [
        {
          userId: 'user-1',
          username: 'Host',
          avatarUrl: null,
          isReady: false,
          isHost: true,
        },
      ],
    })

    expect(toGameRoom(snapshot).players[0].avatarUrl).toBeUndefined()
  })

  it('player.avatarUrl が設定されている場合はそのまま維持する', () => {
    const snapshot = buildSnapshot({
      players: [
        {
          userId: 'user-1',
          username: 'Host',
          avatarUrl: 'https://example.com/avatar.png',
          isReady: false,
          isHost: true,
        },
      ],
    })

    expect(toGameRoom(snapshot).players[0].avatarUrl).toBe(
      'https://example.com/avatar.png'
    )
  })

  it('startedAt / finishedAt が設定されている場合はそのまま維持する', () => {
    const snapshot = buildSnapshot({
      startedAt: '2026-07-02T00:00:00.000Z',
      finishedAt: '2026-07-03T00:00:00.000Z',
    })

    const result = toGameRoom(snapshot)

    expect(result.startedAt).toBe('2026-07-02T00:00:00.000Z')
    expect(result.finishedAt).toBe('2026-07-03T00:00:00.000Z')
  })

  it('players が複数いる場合は全員分を変換する', () => {
    const snapshot = buildSnapshot({
      players: [
        {
          userId: 'user-1',
          username: 'Host',
          avatarUrl: null,
          isReady: true,
          isHost: true,
        },
        {
          userId: 'user-2',
          username: 'Guest',
          avatarUrl: null,
          isReady: false,
          isHost: false,
        },
      ],
    })

    expect(toGameRoom(snapshot).players).toHaveLength(2)
    expect(toGameRoom(snapshot).players[1].userId).toBe('user-2')
  })

  it('mode / mapId をそのまま維持する', () => {
    const snapshot = buildSnapshot({ mode: 'local_cpu', mapId: 'map-1' })

    const result = toGameRoom(snapshot)

    expect(result.mode).toBe('local_cpu')
    expect(result.mapId).toBe('map-1')
  })
})