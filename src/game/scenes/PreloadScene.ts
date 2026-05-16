import Phaser from 'phaser'
import { ASSETS } from '../assets'

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene') }

  preload() {
    const { width, height } = this.cameras.main

    const bar = this.add.rectangle(width / 2, height / 2, 0, 8, 0xffd700)
    this.load.on('progress', (v: number) => {
      bar.width = width * v
    })

    this.load.image(ASSETS.TILESET_WALLS, 'assets/book_shop_floor_walls_32x32.png')
    this.load.spritesheet(ASSETS.TILESET_PROPS, 'assets/book_shop_props_32x32.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet(ASSETS.NPC_01, 'assets/npc01_spritesheet.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
  }

  create() {
    this.scene.start('MainScene')
    this.scene.launch('UIScene')
  }
}
