import { useCallback, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../stores/gameStore'
import type { ServerToClientEvents } from '@ft_transcendence/shared/game-events.types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin
const GAME_NAMESPACE = `${BACKEND_URL.replace(/\/$/, '')}/game`

export function useGameSocket(roomId: string) {
  const socketRef = useRef<Socket | null>(null)
  const setGameState = useGameStore((state) => state.setGameState)
  const setGamePhase = useGameStore((state) => state.setGamePhase)
  const setCountdown = useGameStore((state) => state.setCountdown)
  const setServerTimeOffset = useGameStore((state) => state.setServerTimeOffset)
  const setMyPlayerId = useGameStore((state) => state.setMyPlayerId)
  const setResultStats = useGameStore((state) => state.setResultStats)
  const setErrorMessage = useGameStore((state) => state.setErrorMessage)
  const applyBombExplosion = useGameStore((state) => state.applyBombExplosion)

  useEffect(() => {
    if (!socketRef.current) {
      const token = localStorage.getItem('accessToken')

      socketRef.current = io(GAME_NAMESPACE, {
        transports: ['websocket'],
        secure: true,
        auth: { token: `Bearer ${token}` },
      })
    }

    const socket = socketRef.current

    socket.on(
      'game:init',
      (data: Parameters<ServerToClientEvents['game:init']>[0]) => {
        const offset = data.serverTime - performance.now()
        setServerTimeOffset(offset)
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
        console.log(`[gamesocket:countdown] set countdown ${data.seconds}`)
      }
    )

    socket.on('game:playing', () => {
      setGamePhase('playing')
      console.log('[gamesocket:start]')
    })

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
    })

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error)
      setErrorMessage('接続エラー: サーバーに接続できません。')
    })

    socket.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect') {
        setErrorMessage(
          'サーバーから切断されました（認証エラーの可能性があります）'
        )
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
    setServerTimeOffset,
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
      setCountdown(null)
      console.log(`[gamesocket:cleanup] set countdown null`)
    }
  }, [
    setGameState,
    setMyPlayerId,
    setResultStats,
    setErrorMessage,
    setGamePhase,
    setCountdown,
  ])

  // 明示的なリタイア操作(ホームへ戻るボタン)専用。unmount(リロード/タブ閉じなど)には
  // 紐付けない — それらは切断として扱われ、バックエンド側の猶予付き処理に委ねる。
  const leaveGame = useCallback(() => {
    socketRef.current?.emit('game:leave')
  }, [])

  return { socketRef, leaveGame }
}
