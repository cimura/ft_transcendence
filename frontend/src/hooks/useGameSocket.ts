import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore'
import type {
  BombermanGameState,
  BombermanBomb,
  BombermanExplosion,
  GridPosition,
  GameEndPayload,
} from '../game/bomberman/bombermanTypes'

export function useGameSocket(
  roomId: string,
  onGameEnd?: (
    result: 'WIN' | 'LOSE' | 'DRAW',
    rankings?: GameEndPayload['rankings']
  ) => void
) {
  const socketRef = useRef<Socket | null>(null)
  const myIdRef = useRef<string | null>(null)
  const setGameState = useGameStore((state) => state.setGameState)
  const setResultStats = useGameStore((state) => state.setResultStats)

  useEffect(() => {
    if (!socketRef.current) {
      const token = localStorage.getItem('accessToken')

      socketRef.current = io({
        transports: ['websocket'],
        secure: true,
        auth: { token: `Bearer ${token}` },
      })
    }

    const socket = socketRef.current

    socket.emit('game:join', { roomId })

    socket.on('game:init', (data) => {
      myIdRef.current = data.yourId
      setGameState({
        map: data.map,
        players: data.players,
        bombs: data.bombs,
        explosions: [],
        smokes: [],
      })
    })

    socket.on('game:state', (data: BombermanGameState) => {
      const currentGameState = useGameStore.getState().gameState
      setGameState({
        ...currentGameState,
        players: data.players,
        bombs: data.bombs,
      })
    })

    socket.on('bomb:spawn', (data: { bomb: BombermanBomb }) => {
      const state = useGameStore.getState().gameState
      setGameState({
        ...state,
        bombs: { ...state.bombs, [data.bomb.id]: data.bomb },
      })
    })

    socket.on(
      'bomb:explode',
      (data: {
        bombId: string
        affectedTiles: GridPosition[]
        destroyedBlocks: GridPosition[]
        damagedPlayerIds: string[]
        mapRevision: number
      }) => {
        const state = useGameStore.getState().gameState
        const newBombs = { ...state.bombs }
        delete newBombs[data.bombId]

        const newMap = [...state.map]
        data.destroyedBlocks.forEach((pos) => {
          newMap[pos.y] = [...newMap[pos.y]]
          newMap[pos.y][pos.x] = 'empty'
        })

        const newPlayers = { ...state.players }
        data.damagedPlayerIds.forEach((pid) => {
          if (newPlayers[pid]) {
            newPlayers[pid] = { ...newPlayers[pid], alive: false }
          }
        })

        const explosion: BombermanExplosion = {
          id: `exp_${Date.now()}_${Math.random()}`,
          cells: data.affectedTiles,
          expiresAt: Date.now() + 500,
        }

        setGameState({
          ...state,
          map: newMap,
          bombs: newBombs,
          players: newPlayers,
          explosions: [...state.explosions, explosion],
        })
      }
    )

    socket.on(
      'game:end',
      (data: { winnerId: string | null; rankings: any[] }) => {
        setResultStats(data)
        if (data.winnerId === null) {
          onGameEnd?.('DRAW', data.rankings)
        } else if (data.winnerId === myIdRef.current) {
          onGameEnd?.('WIN', data.rankings)
        } else {
          onGameEnd?.('LOSE', data.rankings)
        }
      }
    )

    return () => {
      socket.off('game:init')
      socket.off('game:state')
      socket.off('bomb:spawn')
      socket.off('bomb:explode')
      socket.off('game:end')
    }
  }, [roomId, setGameState, onGameEnd, setResultStats])

  useEffect(() => {
    const timer = setInterval(() => {
      const state = useGameStore.getState().gameState
      const now = Date.now()

      const activeExplosions = state.explosions.filter((e) => e.expiresAt > now)

      if (activeExplosions.length !== state.explosions.length) {
        setGameState({ ...state, explosions: activeExplosions })
      }
    }, 100)

    return () => clearInterval(timer)
  }, [setGameState])

  useEffect(() => {
    return () => {
      setGameState({
        map: [],
        players: {},
        bombs: {},
        explosions: [],
        smokes: [],
      })
      setResultStats(null)
    }
  }, [setGameState, setResultStats])

  return socketRef
}
