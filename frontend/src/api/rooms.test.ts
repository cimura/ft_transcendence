import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from './client'
import { getRooms } from './rooms'

vi.mock('./client', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('getRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('status を指定した場合は params に status を含めて GET する', async () => {
    const rooms = [{ id: 'room-1', status: 'waiting' }]
    vi.mocked(api.get).mockResolvedValue({ data: rooms })

    const result = await getRooms('waiting')

    expect(api.get).toHaveBeenCalledWith('/rooms', {
      params: { status: 'waiting' },
    })
    expect(result).toBe(rooms)
  })

  it('status を省略した場合は params を undefined にして GET する', async () => {
    const rooms = [{ id: 'room-1' }, { id: 'room-2' }]
    vi.mocked(api.get).mockResolvedValue({ data: rooms })

    const result = await getRooms()

    expect(api.get).toHaveBeenCalledWith('/rooms', { params: undefined })
    expect(result).toBe(rooms)
  })

  it('playing / finished などの他ステータスも params に反映する', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    await getRooms('finished')

    expect(api.get).toHaveBeenCalledWith('/rooms', {
      params: { status: 'finished' },
    })
  })

  it('API がエラーを返した場合は例外を伝播する', async () => {
    const error = new Error('network error')
    vi.mocked(api.get).mockRejectedValue(error)

    await expect(getRooms('waiting')).rejects.toThrow('network error')
  })
})