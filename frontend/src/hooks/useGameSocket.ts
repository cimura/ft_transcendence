import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'

export function useGameSocket(roomId: string) {
  const socketRef = useRef<Socket | null>(null)
  const setGameState = useGameStore((state) => state.setGameState)
  const setMyPlayerId = useGameStore((state) => state.setMyPlayerId)
  const setResultStats = useGameStore((state) => state.setResultStats)
  const setErrorMessage = useGameStore((state) => state.setErrorMessage)
  const applyBombExplosion = useGameStore((state) => state.applyBombExplosion)

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

    socket.on(
      'game:init',
      (data: Parameters<ServerToClientEvents['game:init']>[0]) => {
        setMyPlayerId(data.yourId)
        setGameState({
          map: data.map,
          players: data.players,
          bombs: data.bombs,
          explosions: [],
        })
      }
    )

    socket.on(
      'game:state',
      (data: Parameters<ServerToClientEvents['game:state']>[0]) => {
        const currentGameState = useGameStore.getState().gameState
        setGameState({
          ...currentGameState,
          players: data.players,
          bombs: data.bombs,
        })
      }
    )

    socket.on(
      'bomb:spawn',
      (data: Parameters<ServerToClientEvents['bomb:spawn']>[0]) => {
        const state = useGameStore.getState().gameState
        setGameState({
          ...state,
          bombs: { ...state.bombs, [data.bomb.id]: data.bomb },
        })
      }
    )

    socket.on(
      'bomb:explode',
      (data: Parameters<ServerToClientEvents['bomb:explode']>[0]) => {
        applyBombExplosion(data)
      }
    )

    socket.on(
      'game:end',
      (data: Parameters<ServerToClientEvents['game:end']>[0]) => {
        setResultStats(data)
      }
    )

    socket.emit('game:join', { roomId })

    return () => {
      socket.off('game:init')
      socket.off('game:state')
      socket.off('bomb:spawn')
      socket.off('bomb:explode')
      socket.off('game:end')

      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId, setGameState, setMyPlayerId, setResultStats, setErrorMessage])

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
      })
      setMyPlayerId(null)
      setResultStats(null)
      setErrorMessage(undefined)
    }
  }, [setGameState, setMyPlayerId, setResultStats, setErrorMessage])

  return socketRef
}
