import Phaser from 'phaser'
import { DEPTH } from '../depths'

export type CustomerState = 'entering' | 'at_shelf' | 'going_to_desk' | 'at_desk' | 'leaving'
export type CustomerRoute = 'exit_only' | 'shelf_then_exit' | 'shelf_then_desk'

export interface CarriedBook {
  color: number
  thickness: number  // calcBookWidth(pages) 값 (3~12px)
}

const CUSTOMER_COLORS: Record<string, number> = {
  student:   0xf4d03f,
  worker:    0xe8b88a,
  webnovel:  0xaed6f1,
  collector: 0xd5a6a6,
}

const BOOK_LENGTH = 16  // 가로로 누운 책의 긴 면 (px)

interface CustomerConfig {
  scene: Phaser.Scene
  x: number
  y: number
  entryX: number
  shelfX: number
  deskX: number
  customerType: string
  route: CustomerRoute
  carriedBooks?: CarriedBook[]
  onAtShelf: (customer: Customer) => void
  onAtDesk: (customer: Customer) => void
  onExit: (customer: Customer) => void
}

const SPEED = 60

export class Customer {
  private container: Phaser.GameObjects.Container
  private state: CustomerState = 'entering'
  private config: CustomerConfig
  private targetX: number

  constructor(config: CustomerConfig) {
    this.config = config
    this.targetX = config.route === 'exit_only' ? config.entryX : config.shelfX

    const { scene, x, y, customerType } = config
    const color = CUSTOMER_COLORS[customerType] ?? 0xffffff

    const head = scene.add.circle(0, -18, 6, 0xf5cba7)
    const body = scene.add.rectangle(0, -6, 10, 16, color)
    this.container = scene.add.container(x, y, [head, body]).setDepth(DEPTH.CUSTOMER)
  }

  update() {
    const { container, state } = this

    if (state === 'entering' || state === 'going_to_desk') {
      const dx = this.targetX - container.x
      const step = SPEED * (1 / 60)

      if (Math.abs(dx) <= step) {
        container.x = this.targetX
        this.onReachTarget()
      } else {
        container.x += (dx > 0 ? 1 : -1) * step
      }
    }

    if (state === 'leaving') {
      container.x -= SPEED * (1 / 60)
      if (container.x < -32) {
        this.config.onExit(this)
      }
    }
  }

  private showCarriedBooks() {
    const books = this.config.carriedBooks
    if (!books?.length) return

    const g = this.config.scene.add.graphics()

    // 가장 아래 책이 머리 바로 위 (-28)에서 시작, 위로 쌓임
    let yBottom = -28
    for (const book of books) {
      const t = book.thickness
      g.fillStyle(book.color, 1)
      g.fillRect(-BOOK_LENGTH / 2, yBottom - t, BOOK_LENGTH, t)
      g.lineStyle(0.5, 0x000000, 0.6)
      g.strokeRect(-BOOK_LENGTH / 2, yBottom - t, BOOK_LENGTH, t)
      // 책 내지 선
      g.lineStyle(0.5, 0xffffff, 0.3)
      g.lineBetween(-BOOK_LENGTH / 2 + 2, yBottom - t + 1, -BOOK_LENGTH / 2 + 2, yBottom - 1)
      yBottom -= t + 1
    }

    this.container.add(g)
  }

  private onReachTarget() {
    const { config } = this

    if (this.state === 'entering') {
      if (config.route === 'exit_only') {
        config.scene.time.delayedCall(800, () => {
          this.state = 'leaving'
        })
      } else {
        this.state = 'at_shelf'
        config.onAtShelf(this)
        config.scene.time.delayedCall(2000, () => {
          if (config.route === 'shelf_then_desk') {
            this.showCarriedBooks()
            this.targetX = config.deskX
            this.state = 'going_to_desk'
          } else {
            this.state = 'leaving'
          }
        })
      }
    } else if (this.state === 'going_to_desk') {
      this.state = 'at_desk'
      config.onAtDesk(this)
      config.scene.time.delayedCall(1500, () => {
        this.state = 'leaving'
      })
    }
  }

  destroy() {
    this.container.destroy()
  }
}
