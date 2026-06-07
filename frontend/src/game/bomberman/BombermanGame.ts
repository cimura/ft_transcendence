import {
  BLAST_RANGE,
  BOMB_TIMER_MS,
  EXPLOSION_DURATION_MS,
  NPC_ATTACK_RANGE,
  NPC_BOMB_COOLDOWN_MS,
  NPC_SPEED_MULTIPLIER,
  PLAYER_SPEED,
  SMOKE_DURATION_MS,
  createInitialBombermanMap,
  createInitialBombermanPlayers,
  getBreakableColor,
} from './bombermanMap'
import {
  calculateBlastCells,
  directionToVector,
  gridToWorld,
  isBlockedCell,
  isColliding,
  isInBlast,
  sameCell,
  worldToGrid,
} from './bombermanRules'
import type {
  BombermanBomb,
  BombermanGameState,
  BombermanInput,
  BombermanPlayer,
  Direction,
  GridPosition,
} from './bombermanTypes'

type NpcBrain = {
  direction: Direction
  nextDecisionAt: number
  nextBombAt: number
  path: GridPosition[]
  escapingBombId: string | null
}

const directions: Direction[] = ['up', 'down', 'left', 'right']

const cloneState = (state: BombermanGameState): BombermanGameState => ({
  ...state,
  map: state.map.map((row) => [...row]),
  players: state.players.map((player) => ({
    ...player,
    position: { ...player.position },
    spawn: { ...player.spawn },
  })),
  bombs: state.bombs.map((bomb) => ({
    ...bomb,
    position: { ...bomb.position },
  })),
  explosions: state.explosions.map((explosion) => ({
    ...explosion,
    cells: explosion.cells.map((cell) => ({ ...cell })),
  })),
  smokes: state.smokes.map((smoke) => ({
    ...smoke,
    position: { ...smoke.position },
  })),
})

export class BombermanGame {
  private state: BombermanGameState
  private activeDirection: Direction | null = null
  private readonly npcBrains = new Map<string, NpcBrain>()
  private idCounter = 0

  constructor() {
    const players = createInitialBombermanPlayers()
    this.state = {
      map: createInitialBombermanMap(),
      players,
      bombs: [],
      explosions: [],
      smokes: [],
      status: 'playing',
    }

    players
      .filter((player) => !player.isLocal)
      .forEach((player, index) => {
        this.npcBrains.set(player.id, {
          direction: directions[index % directions.length],
          nextDecisionAt: 0,
          nextBombAt: 1200 + index * 500,
          path: [],
          escapingBombId: null,
        })
      })
  }

  getSnapshot() {
    return cloneState(this.state)
  }

  handleInput(input: BombermanInput) {
    if (this.state.status !== 'playing') return

    if (input.type === 'move') {
      this.activeDirection = input.direction
      return
    }

    if (input.type === 'stop') {
      this.activeDirection = null
      return
    }

    this.placeBomb('local-player')
  }

  update(deltaTime: number, elapsedMs: number) {
    if (this.state.status !== 'playing') return this.getSnapshot()

    this.updateBombs(elapsedMs)
    this.clearExpiredEffects(elapsedMs)
    this.moveLocalPlayer(deltaTime)
    this.updateNpcs(deltaTime, elapsedMs)
    this.resolveExplosionHits()
    this.updateGameStatus()

    return this.getSnapshot()
  }

  private moveLocalPlayer(deltaTime: number) {
    if (!this.activeDirection) return

    const player = this.state.players.find((item) => item.id === 'local-player')
    if (!player?.alive) return

    this.movePlayer(player, this.activeDirection, deltaTime)
  }

  private updateNpcs(deltaTime: number, elapsedMs: number) {
    const localPlayer = this.state.players.find((player) => player.isLocal)
    if (!localPlayer?.alive) return

    this.state.players
      .filter((player) => !player.isLocal && player.alive)
      .forEach((npc) => {
        const brain = this.npcBrains.get(npc.id)
        if (!brain) return

        if (elapsedMs >= brain.nextDecisionAt) {
          this.updateNpcDecision(npc, localPlayer, brain, elapsedMs)
          brain.nextDecisionAt = elapsedMs + 220 + Math.random() * 180
        }

        this.moveNpcAlongPath(npc, brain, deltaTime)
      })
  }

  private updateNpcDecision(
    npc: BombermanPlayer,
    localPlayer: BombermanPlayer,
    brain: NpcBrain,
    elapsedMs: number
  ) {
    const npcCell = worldToGrid(npc.position)
    const playerCell = worldToGrid(localPlayer.position)
    const ownBomb = this.state.bombs.find((bomb) => bomb.ownerId === npc.id)
    const inDanger = this.isDangerousCell(npcCell)

    if (brain.escapingBombId) {
      const escapingBombExists = this.state.bombs.some(
        (bomb) => bomb.id === brain.escapingBombId
      )
      if (!escapingBombExists) {
        brain.escapingBombId = null
      } else {
        if (brain.path.length === 0) {
          const escapePath = this.findSafePath(npcCell, brain.escapingBombId)
          if (escapePath.length > 0) brain.path = escapePath
        }
        if (brain.path.length > 0 || inDanger) return
        brain.escapingBombId = null
      }
    }

    if (inDanger) {
      const escapePath = this.findSafePath(npcCell, ownBomb?.id)
      if (escapePath.length > 0) brain.path = escapePath
      return
    }

    if (ownBomb) {
      brain.path = []
      return
    }

    const distance =
      Math.abs(npcCell.x - playerCell.x) + Math.abs(npcCell.y - playerCell.y)
    const shouldAttack =
      distance <= NPC_ATTACK_RANGE ||
      this.canHitPlayerFromCell(npcCell, playerCell) ||
      this.hasAdjacentBreakable(npcCell)

    if (
      shouldAttack &&
      elapsedMs >= brain.nextBombAt &&
      this.canPlaceBomb(npc.id) &&
      this.findSafePath(npcCell, undefined, npcCell).length > 0
    ) {
      const placedBomb = this.placeBomb(npc.id)
      if (!placedBomb) return

      brain.escapingBombId = placedBomb.id
      brain.path = this.findSafePath(npcCell, placedBomb.id)
      brain.nextBombAt = elapsedMs + NPC_BOMB_COOLDOWN_MS + Math.random() * 500
      return
    }

    if (brain.path.length === 0) {
      brain.path = this.findChasePath(npcCell, playerCell)
      brain.direction = this.chooseNpcDirection(npc, localPlayer)
    }
  }

  private chooseNpcDirection(npc: BombermanPlayer, target: BombermanPlayer) {
    const npcCell = worldToGrid(npc.position)
    const targetCell = worldToGrid(target.position)
    const preferred: Direction =
      Math.abs(npcCell.x - targetCell.x) > Math.abs(npcCell.y - targetCell.y)
        ? targetCell.x > npcCell.x
          ? 'right'
          : 'left'
        : targetCell.y > npcCell.y
          ? 'down'
          : 'up'

    const candidates: Direction[] = [
      preferred,
      ...directions.filter((direction) => direction !== preferred),
    ]

    return (
      candidates.find((direction) => {
        const vector = directionToVector(direction)
        const next = {
          x: npc.position.x + vector.x * 0.45,
          z: npc.position.z + vector.z * 0.45,
        }
        return !isColliding(this.state.map, next, this.state.bombs)
      }) ?? preferred
    )
  }

  private moveNpcAlongPath(
    npc: BombermanPlayer,
    brain: NpcBrain,
    deltaTime: number
  ) {
    if (brain.path.length === 0) {
      this.movePlayer(npc, brain.direction, deltaTime, NPC_SPEED_MULTIPLIER)
      return
    }

    const target = brain.path[0]
    const targetWorld = gridToWorld(target)
    const dx = targetWorld.x - npc.position.x
    const dz = targetWorld.z - npc.position.z

    if (Math.hypot(dx, dz) < 0.06) {
      npc.position = targetWorld
      brain.path.shift()
      return
    }

    const direction =
      Math.abs(dx) > Math.abs(dz)
        ? dx > 0
          ? 'right'
          : 'left'
        : dz > 0
          ? 'down'
          : 'up'

    brain.direction = direction
    this.movePlayer(npc, direction, deltaTime, NPC_SPEED_MULTIPLIER)
  }

  private movePlayer(
    player: BombermanPlayer,
    direction: Direction,
    deltaTime: number,
    speedMultiplier = 1
  ) {
    const vector = directionToVector(direction)
    const distance = PLAYER_SPEED * speedMultiplier * deltaTime
    const nextX = {
      x: player.position.x + vector.x * distance,
      z: player.position.z,
    }
    const nextZ = {
      x: player.position.x,
      z: player.position.z + vector.z * distance,
    }

    const playerBomb = this.state.bombs.find(
      (bomb) =>
        bomb.ownerId === player.id &&
        sameCell(bomb.position, worldToGrid(player.position))
    )

    if (!isColliding(this.state.map, nextX, this.state.bombs, playerBomb?.id)) {
      player.position.x = nextX.x
    }

    if (!isColliding(this.state.map, nextZ, this.state.bombs, playerBomb?.id)) {
      player.position.z = nextZ.z
    }
  }

  private canPlaceBomb(ownerId: string) {
    const owner = this.state.players.find((player) => player.id === ownerId)
    if (!owner?.alive) return false
    if (this.state.bombs.some((bomb) => bomb.ownerId === ownerId)) return false

    const cell = worldToGrid(owner.position)
    return !isBlockedCell(this.state.map, cell, this.state.bombs)
  }

  private placeBomb(ownerId: string) {
    if (!this.canPlaceBomb(ownerId)) return null

    const owner = this.state.players.find((player) => player.id === ownerId)
    if (!owner) return null

    const placedAt = performance.now()
    const bomb = {
      id: this.createId('bomb'),
      ownerId,
      position: worldToGrid(owner.position),
      placedAt,
      explodesAt: placedAt + BOMB_TIMER_MS,
      blastRange: BLAST_RANGE,
    }
    this.state.bombs.push(bomb)

    return bomb
  }

  private updateBombs(elapsedMs: number) {
    const explodingBombs = this.state.bombs.filter(
      (bomb) => elapsedMs >= bomb.explodesAt
    )

    explodingBombs.forEach((bomb) => {
      this.explodeBomb(bomb)
    })
  }

  private explodeBomb(bomb: BombermanBomb) {
    const cells = calculateBlastCells(
      this.state.map,
      bomb.position,
      bomb.blastRange
    )

    this.state.bombs = this.state.bombs.filter((item) => item.id !== bomb.id)
    this.state.explosions.push({
      id: this.createId('explosion'),
      cells,
      expiresAt: performance.now() + EXPLOSION_DURATION_MS,
    })

    const destroyedCells: GridPosition[] = []
    this.state.map = this.state.map.map((row, y) =>
      row.map((tile, x) => {
        if (
          tile === 'breakable' &&
          cells.some((cell) => cell.x === x && cell.y === y)
        ) {
          destroyedCells.push({ x, y })
          return 'empty'
        }

        return tile
      })
    )

    destroyedCells.forEach((cell) => {
      this.state.smokes.push({
        id: this.createId('smoke'),
        position: cell,
        color: getBreakableColor(cell.x, cell.y),
        expiresAt: performance.now() + SMOKE_DURATION_MS,
      })
    })
  }

  private clearExpiredEffects(elapsedMs: number) {
    this.state.explosions = this.state.explosions.filter(
      (explosion) => elapsedMs < explosion.expiresAt
    )
    this.state.smokes = this.state.smokes.filter(
      (smoke) => elapsedMs < smoke.expiresAt
    )
  }

  private resolveExplosionHits() {
    const activeCells = this.state.explosions.flatMap(
      (explosion) => explosion.cells
    )
    if (activeCells.length === 0) return

    this.state.players = this.state.players.map((player) => {
      if (!player.alive || !isInBlast(player.position, activeCells)) {
        return player
      }

      return { ...player, alive: false }
    })
  }

  private updateGameStatus() {
    const localPlayer = this.state.players.find((player) => player.isLocal)
    const livingNpcs = this.state.players.filter(
      (player) => !player.isLocal && player.alive
    )

    if (!localPlayer?.alive && livingNpcs.length === 0) {
      this.state.status = 'draw'
      return
    }

    if (!localPlayer?.alive) {
      this.state.status = 'lose'
      this.state.winnerId = livingNpcs[0]?.id
      return
    }

    if (livingNpcs.length === 0) {
      this.state.status = 'win'
      this.state.winnerId = localPlayer.id
    }
  }

  private hasAdjacentBreakable(position: GridPosition) {
    return directions.some((direction) => {
      const vector = directionToVector(direction)
      const cell = {
        x: position.x + vector.x,
        y: position.y + vector.z,
      }
      return this.state.map[cell.y]?.[cell.x] === 'breakable'
    })
  }

  private findSafePath(
    start: GridPosition,
    ignoredBombId?: string,
    virtualBomb?: GridPosition
  ) {
    const queue = [{ cell: start, path: [] as GridPosition[] }]
    const visited = new Set([`${start.x},${start.y}`])

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break

      if (
        current.path.length > 0 &&
        !this.isDangerousCell(current.cell, virtualBomb)
      ) {
        return current.path
      }

      if (current.path.length >= 5) continue

      directions.forEach((direction) => {
        const vector = directionToVector(direction)
        const next = {
          x: current.cell.x + vector.x,
          y: current.cell.y + vector.z,
        }
        const key = `${next.x},${next.y}`

        if (visited.has(key) || !this.canWalkCell(next, ignoredBombId)) return

        visited.add(key)
        queue.push({
          cell: next,
          path: [...current.path, next],
        })
      })
    }

    return []
  }

  private findChasePath(start: GridPosition, target: GridPosition) {
    const queue = [{ cell: start, path: [] as GridPosition[] }]
    const visited = new Set([`${start.x},${start.y}`])
    let best = { path: [] as GridPosition[], score: Number.POSITIVE_INFINITY }

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) break

      const score =
        Math.abs(current.cell.x - target.x) +
        Math.abs(current.cell.y - target.y)
      if (current.path.length > 0 && score < best.score) {
        best = { path: current.path, score }
      }

      if (score <= 1 || current.path.length >= 12) continue

      directions.forEach((direction) => {
        const vector = directionToVector(direction)
        const cell = {
          x: current.cell.x + vector.x,
          y: current.cell.y + vector.z,
        }
        const key = `${cell.x},${cell.y}`

        if (
          visited.has(key) ||
          !this.canWalkCell(cell) ||
          this.isDangerousCell(cell)
        ) {
          return
        }

        visited.add(key)
        queue.push({
          cell,
          path: [...current.path, cell],
        })
      })
    }

    return best.path.slice(0, 3)
  }

  private canWalkCell(cell: GridPosition, ignoredBombId?: string) {
    return !isBlockedCell(
      this.state.map,
      cell,
      this.state.bombs.filter((bomb) => bomb.id !== ignoredBombId)
    )
  }

  private isDangerousCell(cell: GridPosition, virtualBomb?: GridPosition) {
    const bombCells = this.state.bombs.some((bomb) =>
      calculateBlastCells(this.state.map, bomb.position, bomb.blastRange).some(
        (blastCell) => sameCell(blastCell, cell)
      )
    )

    if (bombCells) return true

    return virtualBomb
      ? calculateBlastCells(this.state.map, virtualBomb, BLAST_RANGE).some(
          (blastCell) => sameCell(blastCell, cell)
        )
      : false
  }

  private canHitPlayerFromCell(origin: GridPosition, playerCell: GridPosition) {
    return calculateBlastCells(this.state.map, origin, BLAST_RANGE).some(
      (cell) => sameCell(cell, playerCell)
    )
  }

  private createId(prefix: string) {
    this.idCounter += 1
    return `${prefix}-${this.idCounter}`
  }
}
