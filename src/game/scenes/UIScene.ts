import Phaser from 'phaser'
import { loadTheme, toggleTheme } from '../config/theme'
import type { Theme } from '../config/theme'

interface StoreStats {
  gold: number
  reputation: number
  stock: number
  rentedCount?: number
}

export interface RentalInfo {
  id: string
  title: string
  dueDateStr: string
  isOverdue: boolean
  returnDueAt: string
  contentId: string
  customerType: string
}

const PANEL_W = 190
const ITEM_H = 38
const HEADER_H = 22

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private repText!: Phaser.GameObjects.Text
  private stockText!: Phaser.GameObjects.Text
  private rentalContainer!: Phaser.GameObjects.Container
  private headerBg!: Phaser.GameObjects.Rectangle
  private themeToggleText!: Phaser.GameObjects.Text
  private rentals: RentalInfo[] = []
  private panelContainer: Phaser.GameObjects.Container | null = null
  private panelVisible = false
  private currentTheme: Theme = loadTheme()

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    const { width } = this.cameras.main
    const theme = this.currentTheme

    this.headerBg = this.add.rectangle(0, 0, width, HEADER_H, theme.bg, 0.85).setOrigin(0, 0)

    const style = { fontSize: '11px', color: theme.fgCss, fontFamily: 'Courier New' }
    this.goldText  = this.add.text(8,   5, '[G] 0', style)
    this.repText   = this.add.text(90,  5, '[★] 0', style)
    this.stockText = this.add.text(170, 5, '[≡] 0/0', style)

    // 테마 토글 버튼
    this.themeToggleText = this.add.text(width - 60, 5, this.themeButtonLabel(), {
      fontSize: '10px',
      color: theme.fgCss,
      fontFamily: 'Courier New',
      backgroundColor: theme.bgCss,
      padding: { x: 3, y: 1 },
    }).setInteractive({ useHandCursor: true })

    this.themeToggleText.on('pointerdown', () => {
      const newTheme = toggleTheme(this.currentTheme.mode)
      this.currentTheme = newTheme
      this.game.events.emit('theme-changed', newTheme)
      this.applyTheme(newTheme)
    })

    this.rentalContainer = this.add.container(width - 8, 28)
    this.drawRentalIcon()

    this.game.events.on('stats-updated', (stats: StoreStats) => {
      this.goldText.setText(`[G] ${stats.gold}`)
      this.repText.setText(`[★] ${stats.reputation}`)
      const rented = stats.rentedCount ?? 0
      const remaining = stats.stock - rented
      this.stockText.setText(`[≡] ${remaining}/${stats.stock}`)
    })

    this.game.events.on('rentals-updated', (rentals: RentalInfo[]) => {
      this.rentals = rentals
      this.drawRentalIcon()
      if (this.panelVisible) this.drawPanel()
    })

    this.game.events.emit('stats-updated', { gold: 0, reputation: 0, stock: 0 })
  }

  private themeButtonLabel(): string {
    return this.currentTheme.mode === 'dark' ? '[ ☀ ]' : '[ ☾ ]'
  }

  private applyTheme(theme: Theme) {
    this.headerBg.setFillStyle(theme.bg, 0.85)
    const style = { color: theme.fgCss }
    this.goldText.setStyle(style)
    this.repText.setStyle(style)
    this.stockText.setStyle(style)
    this.themeToggleText.setText(this.themeButtonLabel())
    this.themeToggleText.setStyle({ color: theme.fgCss, backgroundColor: theme.bgCss })
    this.drawRentalIcon()
    if (this.panelVisible) this.drawPanel()
  }

  private drawRentalIcon() {
    this.rentalContainer.removeAll(true)

    const theme = this.currentTheme
    const hasOverdue = this.rentals.some(r => r.isOverdue)
    const count = this.rentals.length

    const label = count === 0
      ? '[↩]'
      : hasOverdue ? `[!↩ ${count}]` : `[↩ ${count}]`

    const iconText = this.add.text(0, 0, label, {
      fontSize: '10px',
      color: hasOverdue ? '#e05050' : count === 0 ? theme.fgCss + '88' : theme.fgCss,
      fontFamily: 'Courier New',
    }).setOrigin(1, 0)

    this.rentalContainer.add(iconText)

    const hitZone = this.add.zone(-iconText.width / 2, iconText.height / 2, iconText.width, iconText.height)
      .setInteractive({ useHandCursor: true })
    hitZone.on('pointerdown', () => {
      if (this.panelVisible) {
        this.hidePanel()
      } else {
        this.panelVisible = true
        this.drawPanel()
      }
    })
    this.rentalContainer.add(hitZone)
  }

  private drawPanel() {
    if (this.panelContainer) {
      this.panelContainer.destroy()
      this.panelContainer = null
    }

    const { width } = this.scale
    const theme = this.currentTheme
    const totalH = HEADER_H + this.rentals.length * ITEM_H + 8
    const px = width - PANEL_W - 8
    const py = 26

    const container = this.add.container(px, py)
    this.panelContainer = container

    const bg = this.add.graphics()
    bg.fillStyle(theme.bg, 0.95)
    bg.fillRoundedRect(0, 0, PANEL_W, totalH, 5)
    bg.lineStyle(1, theme.fg, 0.4)
    bg.strokeRoundedRect(0, 0, PANEL_W, totalH, 5)
    container.add(bg)

    container.add(this.add.text(8, 5, `반납 대기 ${this.rentals.length}권`, {
      fontSize: '9px', color: theme.fgCss, fontFamily: 'Courier New',
    }))

    const closeBtn = this.add.text(PANEL_W - 14, 4, '✕', {
      fontSize: '9px', color: theme.fgCss, fontFamily: 'Courier New',
    }).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => this.hidePanel())
    container.add(closeBtn)

    this.rentals.forEach((r, i) => {
      const y = HEADER_H + i * ITEM_H

      const itemBg = this.add.graphics()
      itemBg.fillStyle(r.isOverdue ? (theme.mode === 'dark' ? 0x2a0808 : 0xffe0e0) : theme.fg, r.isOverdue ? 0.9 : 0.08)
      itemBg.fillRoundedRect(4, y, PANEL_W - 8, ITEM_H - 4, 3)
      itemBg.lineStyle(1, theme.fg, 0.2)
      itemBg.strokeRoundedRect(4, y, PANEL_W - 8, ITEM_H - 4, 3)
      container.add(itemBg)

      const maxLen = 16
      const titleStr = r.title.length > maxLen ? r.title.slice(0, maxLen) + '…' : r.title
      container.add(this.add.text(8, y + 4, titleStr, {
        fontSize: '9px', color: theme.fgCss, fontFamily: 'Courier New',
      }))

      const dateLabel = r.isOverdue ? `연체 — ${r.dueDateStr}` : `반납일 ${r.dueDateStr}`
      container.add(this.add.text(8, y + 18, dateLabel, {
        fontSize: '8px', color: r.isOverdue ? '#e05050' : theme.fgCss, fontFamily: 'Courier New',
      }))

      const btnG = this.add.graphics()
      btnG.fillStyle(theme.fg, 1)
      btnG.fillRoundedRect(PANEL_W - 44, y + 9, 36, 18, 3)
      container.add(btnG)

      container.add(this.add.text(PANEL_W - 36, y + 13, '반납', {
        fontSize: '8px', color: theme.bgCss, fontFamily: 'Courier New',
      }))

      const rentalId = r.id
      const customerType = r.customerType
      const contentId = r.contentId
      const btnZone = this.add.zone(PANEL_W - 26, y + 18, 36, 18).setInteractive({ useHandCursor: true })
      btnZone.on('pointerdown', () => {
        this.game.events.emit('manual-return-requested', { rentalId, customerType, contentId })
      })
      container.add(btnZone)
    })
  }

  private hidePanel() {
    if (this.panelContainer) {
      this.panelContainer.destroy()
      this.panelContainer = null
    }
    this.panelVisible = false
  }
}
