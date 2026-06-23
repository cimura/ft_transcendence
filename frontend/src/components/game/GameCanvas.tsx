import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { InputManager } from '../../game/engine/InputManager'
import { BombermanScene } from './BombermanScene'
import { TouchControls, type ActiveControl } from './TouchControls'
import { useGameStore } from '../../stores/gameStore'
import type {
  BombermanGameState,
  BombermanInput,
  Direction,
  BombermanBomb,
  BombermanExplosion,
  GridPosition,
  GameEndPayload,
} from '../../game/bomberman/bombermanTypes'

type GameCanvasProps = {
  roomId: string // ★ Propsに roomId を追加
  onInput?: (input: BombermanInput) => void
  onGameEnd?: (
    result: 'WIN' | 'LOSE' | 'DRAW',
    rankings?: GameEndPayload['rankings']
  ) => void
}

const BOMB_HIGHLIGHT_DURATION_MS = 180

export function GameCanvas({ roomId, onInput, onGameEnd }: GameCanvasProps) {
  const socketRef = useRef<Socket | null>(null)
  const inputManagerRef = useRef<InputManager | null>(null)
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const seqRef = useRef<number>(0)

  const [activeControl, setActiveControl] = useState<ActiveControl>(null)

  const gameState = useGameStore((state) => state.gameState)
  const setGameState = useGameStore((state) => state.setGameState)
  const setResultStats = useGameStore((state) => state.setResultStats)

  const isDirection = (value: ActiveControl): value is Direction =>
    value === 'up' || value === 'down' || value === 'left' || value === 'right'

  const clearBombHighlightTimeout = useCallback(() => {
    if (bombHighlightTimeoutRef.current === null) return
    window.clearTimeout(bombHighlightTimeoutRef.current)
    bombHighlightTimeoutRef.current = null
  }, [])

  const highlightBomb = useCallback(() => {
    clearBombHighlightTimeout()
    setActiveControl('bomb')
    bombHighlightTimeoutRef.current = window.setTimeout(() => {
      setActiveControl(null)
      bombHighlightTimeoutRef.current = null
    }, BOMB_HIGHLIGHT_DURATION_MS)
  }, [clearBombHighlightTimeout])

  const handleInputState = useCallback(
    (input: BombermanInput) => {
      if (input.type === 'move') {
        clearBombHighlightTimeout()
        setActiveControl(input.direction)
        return
      }
      if (input.type === 'place_bomb') {
        highlightBomb()
        return
      }
      setActiveControl((current) => (isDirection(current) ? null : current))
    },
    [clearBombHighlightTimeout, highlightBomb]
  )

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io({
        transports: ['websocket'],
        secure: true,
      })
    }

    const socket = socketRef.current

    // ★ Props で受け取った roomId を使って参加
    socket.emit('game:join', { roomId, username: 'Player-Local' })

    socket.on('game:init', (data) => {
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

    socket.on('game:end', (data: GameEndPayload) => {
      setResultStats(data)
      if (data.isDraw) {
        onGameEnd?.('DRAW', data.rankings)
      } else if (data.winnerId === socket.id) {
        onGameEnd?.('WIN', data.rankings)
      } else {
        onGameEnd?.('LOSE', data.rankings)
      }
    })

    return () => {
      socket.off('game:init')
      socket.off('game:state')
      socket.off('bomb:spawn')
      socket.off('bomb:explode')
      socket.off('game:end')
    }
  }, [roomId, setGameState, onGameEnd])

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

  useEffect(() => {
    return () => {
      setGameState({
        map: [],
        players: {},
        bombs: {},
        explosions: [],
        smokes: [],
      })
    }
  }, [setGameState])

  useEffect(() => {
    const manager = new InputManager((input) => {
      handleInputState(input)

      if (socketRef.current) {
        seqRef.current += 1

        if (input.type === 'move') {
          socketRef.current.emit('player:input', {
            direction: input.direction,
            seq: seqRef.current,
            clientTime: performance.now(),
          })
        } else if (input.type === 'stop') {
          socketRef.current.emit('player:input', {
            direction: null,
            seq: seqRef.current,
            clientTime: performance.now(),
          })
        } else if (input.type === 'place_bomb') {
          socketRef.current.emit('bomb:place', {
            seq: seqRef.current,
            clientTime: performance.now(),
          })
        }
      }

      onInput?.(input)
    })
    inputManagerRef.current = manager
    manager.attach()

    return () => {
      manager.detach()
      inputManagerRef.current = null
      clearBombHighlightTimeout()
    }
  }, [clearBombHighlightTimeout, handleInputState, onInput])

  const handleTouchInput = (input: BombermanInput) => {
    inputManagerRef.current?.emitTouchInput(input)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
      <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-cyan-500/20 bg-gray-950">
        <BombermanScene gameState={gameState} />
      </div>
      <TouchControls onInput={handleTouchInput} activeControl={activeControl} />
    </div>
  )
}
