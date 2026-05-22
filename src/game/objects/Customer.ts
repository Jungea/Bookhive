import Phaser from 'phaser'
import { DEPTH } from '../depths'

export type CustomerState = 'entering' | 'at_shelf' | 'going_to_desk' | 'at_desk' | 'leaving'
export type CustomerRoute = 'exit_only' | 'shelf_then_exit' | 'shelf_then_desk' | 'desk_then_exit'

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
  isQuest?: boolean
  questGenre?: string
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
  private carriedBooksGraphics: Phaser.GameObjects.Graphics | null = null
  private returnIcon: Phaser.GameObjects.Text | null = null

  constructor(config: CustomerConfig) {
    this.config = config
    this.targetX = config.route === 'exit_only' ? config.entryX
      : config.route === 'desk_then_exit' ? config.deskX
      : config.shelfX

    const { scene, x, y, customerType } = config
    const color = CUSTOMER_COLORS[customerType] ?? 0xffffff

    const head = scene.add.circle(0, -18, 6, 0xf5cba7)
    const body = scene.add.rectangle(0, -6, 10, 16, color)
    this.container = scene.add.container(x, y, [head, body]).setDepth(DEPTH.CUSTOMER)

    // 반납 고객: 책 들고 입장 + 머리 위 아이콘
    if (config.route === 'desk_then_exit') {
      if (config.carriedBooks?.length) this.showCarriedBooks()
      this.returnIcon = scene.add.text(0, -36, '↩', {
        fontSize: '10px', color: '#ffffff',
        backgroundColor: '#c0392b',
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 1)
      this.container.add(this.returnIcon)
    }

    // 퀘스트 손님: 장르 요청 말풍선
    if (config.isQuest && config.questGenre) {
      const label = '? ' + config.questGenre.slice(0, 5)
      const t = scene.add.text(0, -46, label, {
        fontSize: '8px', color: '#5d4037', fontFamily: 'Courier New',
      }).setOrigin(0.5, 0.5)
      const tw = t.width + 10
      const th = 14
      const by = -46
      const g = scene.add.graphics()
      g.fillStyle(0xfff3cd, 1)
      g.fillRoundedRect(-tw / 2, by - th / 2, tw, th, 3)
      g.lineStyle(1, 0xc8a020, 0.8)
      g.strokeRoundedRect(-tw / 2, by - th / 2, tw, th, 3)
      // 말풍선 꼬리
      g.fillStyle(0xfff3cd, 1)
      g.fillTriangle(-3, by + th / 2, 3, by + th / 2, 0, by + th / 2 + 5)
      this.container.add([g, t])
    }
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

    this.carriedBooksGraphics = g
    this.container.add(g)
  }

  private onReachTarget() {
    const { config } = this

    if (this.state === 'entering') {
      if (config.route === 'exit_only') {
        config.scene.time.delayedCall(800, () => {
          this.state = 'leaving'
        })
      } else if (config.route === 'desk_then_exit') {
        this.state = 'at_desk'
        // 책과 아이콘을 데스크에 두고 감
        this.carriedBooksGraphics?.destroy()
        this.carriedBooksGraphics = null
        this.returnIcon?.destroy()
        this.returnIcon = null
        config.onAtDesk(this)
        config.scene.time.delayedCall(1500, () => {
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
