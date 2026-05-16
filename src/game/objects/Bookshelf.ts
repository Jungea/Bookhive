import Phaser from 'phaser'

export const SHELF_WIDTH   = 52
export const SHELF_HEIGHT  = 90
export const SLOTS_PER_ROW = 5
export const SHELF_ROWS    = 3

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
  level: number
  genres: string[]
}

export class Bookshelf {
  private container: Phaser.GameObjects.Container

  constructor(config: BookshelfConfig) {
    const { scene, x, y, genres } = config

    const g = scene.add.graphics()

    // 책장 외곽
    g.fillStyle(0x3d2b1a)
    g.fillRect(0, -SHELF_HEIGHT, SHELF_WIDTH, SHELF_HEIGHT)
    g.lineStyle(2, 0x6b4f3a)
    g.strokeRect(0, -SHELF_HEIGHT, SHELF_WIDTH, SHELF_HEIGHT)

    // 선반 구분선
    const rowH = SHELF_HEIGHT / SHELF_ROWS
    for (let r = 1; r < SHELF_ROWS; r++) {
      g.lineStyle(1, 0x6b4f3a)
      g.lineBetween(0, -SHELF_HEIGHT + rowH * r, SHELF_WIDTH, -SHELF_HEIGHT + rowH * r)
    }

    // 책 슬롯
    const slotW = (SHELF_WIDTH - 6) / SLOTS_PER_ROW

    genres.slice(0, SLOTS_PER_ROW * SHELF_ROWS).forEach((genre, i) => {
      const row = Math.floor(i / SLOTS_PER_ROW)
      const col = i % SLOTS_PER_ROW
      const bx = 3 + col * slotW
      const by = -SHELF_HEIGHT + 3 + row * rowH

      if (genre) {
        g.fillStyle(GENRE_COLORS[genre] ?? DEFAULT_COLOR, 1)
        g.fillRect(bx, by, slotW - 1, rowH - 4)
      }
    })

    this.container = scene.add.container(x, y, [g])
  }

  destroy() {
    this.container.destroy()
  }
}
