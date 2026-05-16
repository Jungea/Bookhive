import Phaser from 'phaser'

const FLOOR_Y_RATIO = 0.65

export class MainScene extends Phaser.Scene {
  private wallGraphics!: Phaser.GameObjects.Graphics
  private floorGraphics!: Phaser.GameObjects.Graphics

  constructor() { super('MainScene') }

  create() {
    this.drawBackground()
  }

  private drawBackground() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.wallGraphics?.destroy()
    this.floorGraphics?.destroy()

    // 벽
    this.wallGraphics = this.add.graphics()
    this.wallGraphics.fillStyle(0x2a2240)
    this.wallGraphics.fillRect(0, 0, width, floorY)

    // 바닥
    this.floorGraphics = this.add.graphics()
    this.floorGraphics.fillStyle(0x3d2b1a)
    this.floorGraphics.fillRect(0, floorY, width, height - floorY)

    // 바닥선
    this.floorGraphics.lineStyle(2, 0x6b4f3a)
    this.floorGraphics.lineBetween(0, floorY, width, floorY)
  }

  update() {}
}
