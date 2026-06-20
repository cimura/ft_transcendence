import { BombermanGame } from './BombermanGame'
import type { BombermanGameState, BombermanInput } from './bombermanTypes'

export type MockBombermanInputResponse =
  | {
      ok: true
      input: BombermanInput
      state: BombermanGameState
    }
  | {
      ok: false
      input: BombermanInput
      code: string
      message: string
      state: BombermanGameState
    }

type MockBombermanApiOptions = {
  latencyMs?: number
}

export class MockBombermanApi {
  private readonly game = new BombermanGame()
  private readonly latencyMs: number

  constructor({ latencyMs = 0 }: MockBombermanApiOptions = {}) {
    this.latencyMs = latencyMs
  }

  getSnapshot() {
    return this.game.getSnapshot()
  }

  tick(deltaTime: number, elapsedMs: number) {
    return this.game.update(deltaTime, elapsedMs)
  }

  sendInput(input: BombermanInput): Promise<MockBombermanInputResponse> {
    return this.respond(() => {
      this.game.handleInput(input)

      return {
        ok: true,
        input,
        state: this.game.getSnapshot(),
      }
    })
  }

  private respond<T>(handler: () => T): Promise<T> {
    if (this.latencyMs <= 0) {
      return Promise.resolve(handler())
    }

    return new Promise((resolve) => {
      window.setTimeout(() => {
        resolve(handler())
      }, this.latencyMs)
    })
  }
}
