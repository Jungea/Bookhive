import Phaser from 'phaser'
import { DEPTH } from '../depths'
import type { BookEntry } from '../../lib/types'

export const SHELF_ROWS = 10

export const GENRE_COLORS: Record<string, number> = {
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

const MIN_BOOK_W  = 3
const MAX_BOOK_W  = 12
const PAGES_PER_PX = 60
const BOOK_GAP    = 1

export function calcBookWidth(pages: number | null): number {
  if (!pages) return MIN_BOOK_W
  return Math.min(MAX_BOOK_W, Math.max(MIN_BOOK_W, Math.round(pages / PAGES_PER_PX)))
}

interface BookshelfConfig {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  height: number
  level: number
  books: BookEntry[]
}

export class Bookshelf {
  private container: Phaser.GameObjects.Container
  private g: Phaser.GameObjects.Graphics
  private rentedIds: Set<string> = new Set()
  private config: BookshelfConfig
  readonly hasBooks: boolean
  readonly x: number
  readonly width: number

  constructor(config: BookshelfConfig) {
    this.config = config
    this.hasBooks = config.books.length > 0
    this.x = config.x
    this.width = config.width

    this.g = config.scene.add.graphics()
    this.container = config.scene.add.container(config.x, config.y, [this.g]).setDepth(DEPTH.FURNITURE)
    this.redraw()
  }

  private redraw() {
    const { width, height, books } = this.config
    const g = this.g
    g.clear()

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

    // 책을 행 단위로 배치 (가변 너비)
    const availW = width - 6
    type SlotInfo = { genre: string; w: number; contentId: string }
    const rows: SlotInfo[][] = []
    let currentRow: SlotInfo[] = []
    let currentRowW = 0

    for (const book of books) {
      const bw = calcBookWidth(book.pages)
      const needed = currentRow.length === 0 ? bw : bw + BOOK_GAP
      if (currentRowW + needed > availW && currentRow.length > 0) {
        rows.push(currentRow)
        if (rows.length >= SHELF_ROWS) break
        currentRow = [{ genre: book.genre, w: bw, contentId: book.content_id }]
        currentRowW = bw
      } else {
        if (currentRow.length > 0) currentRowW += BOOK_GAP
        currentRow.push({ genre: book.genre, w: bw, contentId: book.content_id })
        currentRowW += bw
      }
    }
    if (currentRow.length > 0 && rows.length < SHELF_ROWS) rows.push(currentRow)

    rows.forEach((row, rowIdx) => {
      let xOff = 3
      const by = -height + 3 + rowIdx * rowH
      row.forEach(({ genre, w, contentId }) => {
        if (this.rentedIds.has(contentId)) {
          // 빈 자리 — 투명한 영역 표시
          g.fillStyle(0x2a1a0a, 0.35)
          g.fillRect(xOff, by, w, rowH - 4)
          g.lineStyle(1, 0x6b4f3a, 0.6)
          g.strokeRect(xOff, by, w, rowH - 4)
        } else {
          g.fillStyle(GENRE_COLORS[genre] ?? DEFAULT_COLOR, 1)
          g.fillRect(xOff, by, w, rowH - 4)
        }
        xOff += w + BOOK_GAP
      })
    })
  }

  rentBook(contentId: string) {
    this.rentedIds.add(contentId)
    this.redraw()
  }

  returnBook(contentId: string) {
    if (!this.rentedIds.has(contentId)) return
    this.rentedIds.delete(contentId)
    this.redraw()
  }

  destroy() {
    this.container.destroy()
  }
}
