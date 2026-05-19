import Phaser from 'phaser'

export type CustomerState = 'entering' | 'at_shelf' | 'going_to_desk' | 'at_desk' | 'leaving'

const CUSTOMER_COLORS: Record<string, number> = {
  student:   0xf4d03f,
  worker:    0xe8b88a,
  webnovel:  0xaed6f1,
  collector: 0xd5a6a6,
}

interface CustomerConfig {
  scene: Phaser.Scene
  x: number
  y: number
  shelfX: number
  deskX: number
  customerType: string
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
    this.targetX = config.shelfX

    const { scene, x, y, customerType } = config
    const color = CUSTOMER_COLORS[customerType] ?? 0xffffff

    const head = scene.add.circle(0, -18, 6, color)
    const body = scene.add.rectangle(0, -6, 10, 16, color)
    this.container = scene.add.container(x, y, [head, body]).setDepth(1)
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

  private onReachTarget() {
    const { config } = this

    if (this.state === 'entering') {
      this.state = 'at_shelf'
      config.onAtShelf(this)
      config.scene.time.delayedCall(2000, () => {
        this.targetX = config.deskX
        this.state = 'going_to_desk'
      })
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
