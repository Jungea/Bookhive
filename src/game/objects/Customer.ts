import Phaser from 'phaser'
import { ASSETS } from '../assets'

export type CustomerState = 'entering' | 'browsing' | 'leaving'

interface CustomerConfig {
  scene: Phaser.Scene
  x: number
  y: number
  targetX: number
  onReachTarget: (customer: Customer) => void
  onExit: (customer: Customer) => void
}

const SPEED = 60

export class Customer {
  private sprite: Phaser.Physics.Arcade.Sprite
  private state: CustomerState = 'entering'
  private config: CustomerConfig

  constructor(config: CustomerConfig) {
    this.config = config
    const { scene, x, y } = config

    this.sprite = scene.physics.add.sprite(x, y, ASSETS.NPC_01)
    this.sprite.setScale(1.5)
    this.sprite.play('npc_walk_left')

    scene.physics.moveTo(this.sprite, config.targetX, y, SPEED)
  }

  update() {
    const { sprite, config, state } = this

    if (state === 'entering') {
      if (Math.abs(sprite.x - config.targetX) < 8) {
        const body = sprite.body as Phaser.Physics.Arcade.Body
        body.setVelocity(0)
        sprite.anims.stop()
        this.state = 'browsing'
        config.onReachTarget(this)
      }
    }

    if (state === 'leaving') {
      if (sprite.x > config.scene.cameras.main.width + 32) {
        config.onExit(this)
      }
    }
  }

  leave() {
    this.state = 'leaving'
    this.sprite.play('npc_walk_right')
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocityX(SPEED)
  }

  destroy() {
    this.sprite.destroy()
  }
}
