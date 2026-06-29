import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'

export function useGameSocket(roomId: string) {
  const socketRef = useRef<Socket | null>(null)
  const setGameState = useGameStore((state) => state.setGameState)
  const setGamePhase = useGameStore((state) => state.setGamePhase)
  const setCountdown = useGameStore((state) => state.setCountdown)
  const setMyPlayerId = useGameStore((state) => state.setMyPlayerId)
  const setResultStats = useGameStore((state) => state.setResultStats)
  const setErrorMessage = useGameStore((state) => state.setErrorMessage)
  const applyBombExplosion = useGameStore((state) => state.applyBombExplosion)

  useEffect(() => {
    if (!socketRef.current) {
      const token = localStorage.getItem('accessToken')

      socketRef.current = io('/game', {
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
        setGamePhase(data.phase)
      }
    )

    socket.on(
      'game:countdown',
      (data: Parameters<ServerToClientEvents['game:countdown']>[0]) => {
        setGamePhase('countdown')
        setCountdown(data)
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
        setGamePhase('ended')
        setResultStats(data)
      }
    )

    socket.on('game:error', (data: { message: string }) => {
      setErrorMessage(data.message)
      setGamePhase('ended')
    })

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error)
      setErrorMessage(
        `接続エラー: ${error.message || 'サーバーに接続できません'}`
      )
      setGamePhase('ended')
    })

    socket.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect') {
        setErrorMessage(
          'サーバーから切断されました（認証エラーの可能性があります）'
        )
        setGamePhase('ended')
      }
    })

    socket.emit('game:join', { roomId })

    return () => {
      socket.off('game:init')
      socket.off('game:countdown')
      socket.off('game:state')
      socket.off('bomb:spawn')
      socket.off('bomb:explode')
      socket.off('game:end')
      socket.off('game:error')
      socket.off('connect_error')
      socket.off('disconnect')

      socket.disconnect()
      socketRef.current = null
    }
  }, [
    roomId,
    setGameState,
    setCountdown,
    setGamePhase,
    setMyPlayerId,
    setResultStats,
    setErrorMessage,
    applyBombExplosion,
  ])

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
      setGamePhase('waiting')
      setCountdown({ seconds: 0, startsAt: 0 })
    }
  }, [
    setGameState,
    setMyPlayerId,
    setResultStats,
    setErrorMessage,
    setGamePhase,
    setCountdown,
  ])

  return socketRef
}
