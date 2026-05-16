import Phaser from 'phaser'
import { Bookshelf, SLOTS_PER_ROW, SHELF_ROWS } from '../objects/Bookshelf'
import type { GenreInventory } from '../../lib/types'

const FLOOR_Y_RATIO = 0.65

export class MainScene extends Phaser.Scene {
  private wallGraphics!: Phaser.GameObjects.Graphics
  private floorGraphics!: Phaser.GameObjects.Graphics
  private bookshelves: Bookshelf[] = []

  constructor() { super('MainScene') }

  create() {
    this.drawBackground()
    // 임시 재고로 책장 표시 (Task 13에서 Supabase 데이터로 교체)
    this.placeBookshelves({ '소설': 5, '철학': 3, '판타지': 2 }, 1)
  }

  private drawBackground() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.wallGraphics?.destroy()
    this.floorGraphics?.destroy()

    this.wallGraphics = this.add.graphics()
    this.wallGraphics.fillStyle(0x2a2240)
    this.wallGraphics.fillRect(0, 0, width, floorY)

    this.floorGraphics = this.add.graphics()
    this.floorGraphics.fillStyle(0x3d2b1a)
    this.floorGraphics.fillRect(0, floorY, width, height - floorY)
    this.floorGraphics.lineStyle(2, 0x6b4f3a)
    this.floorGraphics.lineBetween(0, floorY, width, floorY)
  }

  placeBookshelves(inventory: GenreInventory, storeLevel: number) {
    this.bookshelves.forEach(b => b.destroy())
    this.bookshelves = []

    const floorY = this.cameras.main.height * FLOOR_Y_RATIO

    // 완독 권수만큼 장르 배열 생성 (최대 5권/장르)
    const genreList = Object.entries(inventory)
      .flatMap(([genre, count]) => Array(Math.min(count, SLOTS_PER_ROW)).fill(genre))

    for (let i = 0; i < storeLevel; i++) {
      const x = 16 + i * (52 + 12)
      const slotCount = SLOTS_PER_ROW * SHELF_ROWS
      const genres = Array<string>(slotCount)
        .fill('')
        .map((_, j) => genreList[i * slotCount + j] ?? '')

      this.bookshelves.push(new Bookshelf({
        scene: this,
        x,
        y: floorY,
        level: i + 1,
        genres,
      }))
    }
  }

  update() {}
}
