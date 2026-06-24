type GameLoopHandlers = {
  update: (deltaTime: number) => void
  render: () => void
}

export class GameLoop {
  private frameId: number | null = null
  private previousTime = 0
  private readonly handlers: GameLoopHandlers

  constructor(handlers: GameLoopHandlers) {
    this.handlers = handlers
  }

  start() {
    if (this.frameId !== null) return
    this.previousTime = performance.now()
    this.frameId = requestAnimationFrame(this.tick)
  }

  stop() {
    if (this.frameId === null) return
    cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  private tick = (time: number) => {
    const deltaTime = Math.min((time - this.previousTime) / 1000, 0.1)
    this.previousTime = time

    this.handlers.update(deltaTime)
    this.handlers.render()
    this.frameId = requestAnimationFrame(this.tick)
  }
}
