import Phaser from 'phaser'
import { DEPTH } from '../depths'
import { loadTheme } from '../config/theme'
import type { Theme } from '../config/theme'

export type CustomerState = 'entering' | 'at_shelf' | 'going_to_desk' | 'at_desk' | 'leaving'
export type CustomerRoute = 'exit_only' | 'shelf_then_exit' | 'shelf_then_desk' | 'desk_then_exit'

export interface CarriedBook {
  color: number
  thickness: number  // calcBookWidth(pages) 값 (3~12px)
}

const CUSTOMER_EMOTICONS: Record<string, string> = {
  student:   '(・∀・)',
  worker:    '( ￣_￣)',
  webnovel:  '(✿◕‿◕)',
  collector: '(ΦωΦ)',
}

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
  private emoText: Phaser.GameObjects.Text
  private state: CustomerState = 'entering'
  private config: CustomerConfig
  private targetX: number
  private booksText: Phaser.GameObjects.Text | null = null
  private returnIcon: Phaser.GameObjects.Text | null = null
  private currentTheme: Theme
  private gameEvents: Phaser.Events.EventEmitter
  private themeListener: (theme: Theme) => void

  constructor(config: CustomerConfig) {
    this.config = config
    this.currentTheme = loadTheme()
    this.gameEvents = config.scene.game.events

    this.targetX = config.route === 'exit_only' ? config.entryX
      : config.route === 'desk_then_exit' ? config.deskX
      : config.shelfX

    const { scene, x, y, customerType } = config
    const theme = this.currentTheme
    const emoticon = CUSTOMER_EMOTICONS[customerType] ?? '(・ω・)'

    this.emoText = scene.add.text(0, 0, emoticon, {
      fontSize: '11px',
      color: theme.fgCss,
      fontFamily: 'Courier New',
    }).setOrigin(0.5, 1)

    this.container = scene.add.container(x, y, [this.emoText]).setDepth(DEPTH.CUSTOMER)

    // 반납 고객: 책 들고 입장 + 머리 위 아이콘
    if (config.route === 'desk_then_exit') {
      if (config.carriedBooks?.length) this.showCarriedBooks()
      this.returnIcon = scene.add.text(0, -22, '↩', {
        fontSize: '9px',
        color: theme.bgCss,
        backgroundColor: theme.fgCss,
        padding: { x: 2, y: 1 },
      }).setOrigin(0.5, 1)
      this.container.add(this.returnIcon)
    }

    // 퀘스트 손님: 장르 요청 말풍선
    if (config.isQuest && config.questGenre) {
      const label = '? ' + config.questGenre.slice(0, 5)
      const t = scene.add.text(0, -28, label, {
        fontSize: '8px',
        color: theme.bgCss,
        fontFamily: 'Courier New',
      }).setOrigin(0.5, 0.5)
      const tw = t.width + 10
      const th = 14
      const by = -28
      const g = scene.add.graphics()
      g.fillStyle(theme.fg, 1)
      g.fillRoundedRect(-tw / 2, by - th / 2, tw, th, 3)
      g.lineStyle(1, theme.bg, 0.6)
      g.strokeRoundedRect(-tw / 2, by - th / 2, tw, th, 3)
      g.fillStyle(theme.fg, 1)
      g.fillTriangle(-3, by + th / 2, 3, by + th / 2, 0, by + th / 2 + 5)
      this.container.add([g, t])
    }

    this.themeListener = (newTheme: Theme) => this.applyTheme(newTheme)
    this.gameEvents.on('theme-changed', this.themeListener)
  }

  private applyTheme(theme: Theme) {
    this.currentTheme = theme
    this.emoText.setStyle({ color: theme.fgCss })
    if (this.booksText) this.booksText.setStyle({ color: theme.fgCss })
    if (this.returnIcon) {
      this.returnIcon.setStyle({ color: theme.bgCss, backgroundColor: theme.fgCss })
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

    const count = Math.min(books.length, 5)
    const booksStr = '■'.repeat(count)

    this.booksText = this.config.scene.add.text(0, -14, booksStr, {
      fontSize: '8px',
      color: this.currentTheme.fgCss,
      fontFamily: 'Courier New',
    }).setOrigin(0.5, 1)

    this.container.add(this.booksText)
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
        this.booksText?.destroy()
        this.booksText = null
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
    this.gameEvents.off('theme-changed', this.themeListener)
    this.container.destroy()
  }
}
