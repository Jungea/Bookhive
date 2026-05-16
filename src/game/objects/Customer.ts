import Phaser from 'phaser'

export type CustomerState = 'entering' | 'browsing' | 'leaving'

// 손님 유형별 색상
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
  targetX: number
  customerType: string
  onReachTarget: (customer: Customer) => void
  onExit: (customer: Customer) => void
}

const SPEED = 60

export class Customer {
  private container: Phaser.GameObjects.Container
  private state: CustomerState = 'entering'
  private config: CustomerConfig
  private vx = -SPEED

  constructor(config: CustomerConfig) {
    this.config = config
    const { scene, x, y, customerType } = config

    const color = CUSTOMER_COLORS[customerType] ?? 0xffffff

    const head = scene.add.circle(0, -18, 6, color)
    const body = scene.add.rectangle(0, -6, 10, 16, color)

    this.container = scene.add.container(x, y, [head, body])
  }

  update() {
    const { container, config, state } = this

    if (state === 'entering') {
      container.x += this.vx * (1 / 60)
      if (container.x <= config.targetX) {
        container.x = config.targetX
        this.vx = 0
        this.state = 'browsing'
        config.onReachTarget(this)
      }
    }

    if (state === 'leaving') {
      container.x += SPEED * (1 / 60)
      if (container.x > config.scene.cameras.main.width + 32) {
        config.onExit(this)
      }
    }
  }

  leave() {
    this.state = 'leaving'
    this.vx = SPEED
  }

  destroy() {
    this.container.destroy()
  }
}
