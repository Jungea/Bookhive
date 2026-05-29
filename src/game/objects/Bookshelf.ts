import Phaser from 'phaser'
import { DEPTH } from '../depths'
import type { BookEntry } from '../../lib/types'
import { loadTheme } from '../config/theme'
import type { Theme } from '../config/theme'

export const SHELF_ROWS = 10

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
  private currentTheme: Theme
  private gameEvents: Phaser.Events.EventEmitter
  private themeListener: (theme: Theme) => void
  readonly hasBooks: boolean
  readonly x: number
  readonly width: number

  constructor(config: BookshelfConfig) {
    this.config = config
    this.hasBooks = config.books.length > 0
    this.x = config.x
    this.width = config.width
    this.currentTheme = loadTheme()
    this.gameEvents = config.scene.game.events

    this.g = config.scene.add.graphics()
    this.container = config.scene.add.container(config.x, config.y, [this.g]).setDepth(DEPTH.FURNITURE)
    this.redraw()

    this.themeListener = (theme: Theme) => {
      this.currentTheme = theme
      this.redraw()
    }
    this.gameEvents.on('theme-changed', this.themeListener)
  }

  private redraw() {
    const { width, height, books } = this.config
    const { fg, bg } = this.currentTheme
    const g = this.g
    g.clear()

    // 책장 외곽 (fg 색 테두리, bg 색 배경)
    g.fillStyle(bg, 1)
    g.fillRect(0, -height, width, height)
    g.lineStyle(2, fg, 1)
    g.strokeRect(0, -height, width, height)

    // 선반 구분선
    const rowH = height / SHELF_ROWS
    for (let r = 1; r < SHELF_ROWS; r++) {
      g.lineStyle(1, fg, 0.4)
      g.lineBetween(0, -height + rowH * r, width, -height + rowH * r)
    }

    // 책 배치 (가변 너비)
    const availW = width - 6
    type SlotInfo = { w: number; copyId: string }
    const rows: SlotInfo[][] = []
    let currentRow: SlotInfo[] = []
    let currentRowW = 0

    for (const book of books) {
      const bw = calcBookWidth(book.pages)
      const needed = currentRow.length === 0 ? bw : bw + BOOK_GAP
      if (currentRowW + needed > availW && currentRow.length > 0) {
        rows.push(currentRow)
        if (rows.length >= SHELF_ROWS) break
        currentRow = [{ w: bw, copyId: book.copy_id }]
        currentRowW = bw
      } else {
        if (currentRow.length > 0) currentRowW += BOOK_GAP
        currentRow.push({ w: bw, copyId: book.copy_id })
        currentRowW += bw
      }
    }
    if (currentRow.length > 0 && rows.length < SHELF_ROWS) rows.push(currentRow)

    rows.forEach((row, rowIdx) => {
      let xOff = 3
      const by = -height + 3 + rowIdx * rowH
      row.forEach(({ w, copyId }) => {
        if (this.rentedIds.has(copyId)) {
          // 빈 자리: bg 색 + fg 점선 테두리
          g.lineStyle(1, fg, 0.35)
          g.strokeRect(xOff, by, w, rowH - 4)
        } else {
          // 책: fg 색 채움
          g.fillStyle(fg, 1)
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
    this.gameEvents.off('theme-changed', this.themeListener)
    this.container.destroy()
  }
}
