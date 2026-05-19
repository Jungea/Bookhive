import Phaser from 'phaser'

export const SLOTS_PER_ROW = 20
export const SHELF_ROWS    = 10

const GENRE_COLORS: Record<string, number> = {
  '소설':     0xe74c3c,
  '철학':     0x3498db,
  '경제':     0x2ecc71,
  '판타지':   0x9b59b6,
  '인문학':   0xe67e22,
  'SF':       0x1abc9c,
  '역사':     0xf39c12,
  '에세이':   0xec407a,
  '자기계발': 0x26c6da,
  '로맨스':   0xff80ab,
}
const DEFAULT_COLOR = 0x95a5a6

interface BookshelfConfig {
  scene: Phaser.Scene
  x: number
  y: number      // 바닥 기준 y
  width: number
  height: number
  level: number
  genres: string[]
}

export class Bookshelf {
  private container: Phaser.GameObjects.Container
  readonly hasBooks: boolean
  readonly x: number
  readonly width: number

  constructor(config: BookshelfConfig) {
    const { scene, x, y, width, height, genres } = config
    this.hasBooks = genres.some(g => g !== '')
    this.x = x
    this.width = width

    const g = scene.add.graphics()

    // 책장 외곽
    g.fillStyle(0x3d2b1a)
    g.fillRect(0, -height, width, height)
    g.lineStyle(2, 0x6b4f3a)
    g.strokeRect(0, -height, width, height)

    // 선반 구분선
    const rowH = height / SHELF_ROWS
    for (let r = 1; r < SHELF_ROWS; r++) {
      g.lineStyle(1, 0x6b4f3a)
      g.lineBetween(0, -height + rowH * r, width, -height + rowH * r)
    }

    // 책 슬롯
    const slotW = (width - 6) / SLOTS_PER_ROW

    genres.slice(0, SLOTS_PER_ROW * SHELF_ROWS).forEach((genre, i) => {
      const row = Math.floor(i / SLOTS_PER_ROW)
      const col = i % SLOTS_PER_ROW
      const bx = 3 + col * slotW
      const by = -height + 3 + row * rowH

      if (genre) {
        g.fillStyle(GENRE_COLORS[genre] ?? DEFAULT_COLOR, 1)
        g.fillRect(bx, by, slotW - 1, rowH - 4)
      }
    })

    this.container = scene.add.container(x, y, [g]).setDepth(0)
  }

  destroy() {
    this.container.destroy()
  }
}
