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
} from '../../game/bomberman/bombermanTypes'

const ROOM_ID = 'test-room'

type GameCanvasProps = {
  onInput?: (input: BombermanInput) => void
  onGameEnd?: (result: 'WIN' | 'LOSE' | 'DRAW') => void
}

const BOMB_HIGHLIGHT_DURATION_MS = 180

export function GameCanvas({ onInput, onGameEnd }: GameCanvasProps) {
  const socketRef = useRef<Socket | null>(null)
  const inputManagerRef = useRef<InputManager | null>(null)
  const bombHighlightTimeoutRef = useRef<number | null>(null)
  const seqRef = useRef<number>(0)

  const [activeControl, setActiveControl] = useState<ActiveControl>(null)

  const gameState = useGameStore((state) => state.gameState)
  const setGameState = useGameStore((state) => state.setGameState)

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
        secure: true
      });
    }

    const socket = socketRef.current;

    socket.emit('game:join', { roomId: ROOM_ID, username: 'Player-Local' })

    socket.on('game:init', (data) => {
      console.log('Game initialized from server:', data)
      setGameState({
        map: data.map,
        players: data.players,
        bombs: data.bombs,
        explosions: [],
        smokes: [],
      })
    })

    socket.on('game:state', (data: BombermanGameState) => {
      // Zustandストアからその時点の最新の gameState を取得
      const currentGameState = useGameStore.getState().gameState;
      
      setGameState({
        ...currentGameState,     // 既存の map, explosions, smokes を維持
        players: data.players,   // サーバーからの最新プレイヤー位置
        bombs: data.bombs,       // サーバーからの最新爆弾状態
      })
    })

    socket.on('game:end', (data: { winnerId?: string; isDraw: boolean }) => {
      if (data.isDraw) {
        onGameEnd?.('DRAW')
      } else if (data.winnerId === socket.id) {
        onGameEnd?.('WIN')
      } else {
        onGameEnd?.('LOSE')
      }
    })

    return () => {
      socket.off('game:init')
      socket.off('game:state')
      socket.off('game:end')
    }
  }, [setGameState, onGameEnd])

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
