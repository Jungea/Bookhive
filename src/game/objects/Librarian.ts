import Phaser from 'phaser'
import { DEPTH } from '../depths'

export class Librarian {
  private container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const head = scene.add.circle(0, -28, 7, 0xf5cba7)
    const body = scene.add.rectangle(0, -12, 12, 20, 0x2e4057)

    this.container = scene.add.container(x, y, [head, body]).setDepth(DEPTH.LIBRARIAN)
  }

  destroy() {
    this.container.destroy()
  }
}
