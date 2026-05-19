import Phaser from 'phaser'
import { DEPTH } from '../depths'

export class Desk {
  private container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    const g = scene.add.graphics()

    g.fillStyle(0x795548)
    g.fillRect(0, -height, width, height)
    g.lineStyle(1, 0x4e342e)
    g.strokeRect(0, -height, width, height)

    const text = scene.add.text(width / 2, -height / 2, 'INFO', {
      fontSize: '9px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.container = scene.add.container(x, y, [g, text]).setDepth(DEPTH.FURNITURE)
  }

  destroy() {
    this.container.destroy()
  }
}
