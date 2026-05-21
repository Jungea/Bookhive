import Phaser from 'phaser'

interface StoreStats {
  gold: number
  reputation: number
  stock: number
  rentedCount?: number
}

interface RentalInfo {
  id: string
  title: string
  dueDateStr: string
  isOverdue: boolean
}

const ICON_SIZE = 16
const PANEL_PAD = 6
const PANEL_W = 190
const ITEM_H = 38
const HEADER_H = 22

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private repText!: Phaser.GameObjects.Text
  private stockText!: Phaser.GameObjects.Text
  private rentalContainer!: Phaser.GameObjects.Container
  private rentals: RentalInfo[] = []
  private panelContainer: Phaser.GameObjects.Container | null = null
  private panelVisible = false

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    const { width } = this.cameras.main
    const style = { fontSize: '11px', color: '#FFD700', fontFamily: 'Courier New' }

    this.add.rectangle(0, 0, width, 22, 0x000000, 0.6).setOrigin(0, 0)

    this.goldText  = this.add.text(8,   5, '💰 0 G', style)
    this.repText   = this.add.text(110, 5, '⭐ 0',   style)
    this.stockText = this.add.text(180, 5, '📚 0',   style)

    this.rentalContainer = this.add.container(width - 8, 28)
    this.drawRentalIcon()

    this.game.events.on('stats-updated', (stats: StoreStats) => {
      this.goldText.setText(`💰 ${stats.gold} G`)
      this.repText.setText(`⭐ ${stats.reputation}`)
      const rented = stats.rentedCount ?? 0
      const remaining = stats.stock - rented
      this.stockText.setText(`📚 ${remaining}/${stats.stock}`)
    })

    this.game.events.on('rentals-updated', (rentals: RentalInfo[]) => {
      this.rentals = rentals
      this.drawRentalIcon()
      if (this.panelVisible) this.drawPanel()
    })

    this.game.events.emit('stats-updated', { gold: 0, reputation: 0, stock: 0 })
  }

  private drawRentalIcon() {
    this.rentalContainer.removeAll(true)

    const hasOverdue = this.rentals.some(r => r.isOverdue)
    const panelW = PANEL_PAD * 2 + ICON_SIZE
    const panelH = PANEL_PAD * 2 + ICON_SIZE

    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.55)
    bg.fillRoundedRect(-panelW, 0, panelW, panelH, 4)
    this.rentalContainer.add(bg)

    const baseColor  = this.rentals.length === 0 ? 0x555555 : hasOverdue ? 0xe05050 : 0x7a9bbf
    const spineColor = this.rentals.length === 0 ? 0x333333 : hasOverdue ? 0xb03030 : 0x4a6b8f
    const ix = -panelW + PANEL_PAD
    const iy = PANEL_PAD

    const iconG = this.add.graphics()
    iconG.fillStyle(baseColor, 1)
    iconG.fillRect(ix, iy, ICON_SIZE, ICON_SIZE)
    iconG.fillStyle(spineColor, 1)
    iconG.fillRect(ix, iy, 3, ICON_SIZE)
    iconG.fillStyle(0xffffff, 0.25)
    iconG.fillRect(ix + 5, iy + 4, ICON_SIZE - 7, 1)
    iconG.fillRect(ix + 5, iy + 7, ICON_SIZE - 7, 1)
    iconG.fillRect(ix + 5, iy + 10, ICON_SIZE - 7, 1)
    iconG.lineStyle(0.5, 0x000000, 0.4)
    iconG.strokeRect(ix, iy, ICON_SIZE, ICON_SIZE)
    this.rentalContainer.add(iconG)

    if (this.rentals.length > 0) {
      const badge = this.add.text(-PANEL_PAD - 1, 0, `${this.rentals.length}`, {
        fontSize: '7px', color: '#ffffff', fontFamily: 'Courier New',
        backgroundColor: hasOverdue ? '#e05050' : '#4a6b8f',
        padding: { x: 2, y: 1 },
      })
      this.rentalContainer.add(badge)
    }

    const hitZone = this.add.rectangle(-panelW / 2, panelH / 2, panelW, panelH)
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
    const totalH = HEADER_H + this.rentals.length * ITEM_H + 8
    const px = width - PANEL_W - 8
    const py = 26

    const container = this.add.container(px, py)
    this.panelContainer = container

    const bg = this.add.graphics()
    bg.fillStyle(0x0a0a0a, 0.93)
    bg.fillRoundedRect(0, 0, PANEL_W, totalH, 5)
    bg.lineStyle(1, 0x444444, 0.6)
    bg.strokeRoundedRect(0, 0, PANEL_W, totalH, 5)
    container.add(bg)

    container.add(this.add.text(8, 5, `반납 대기 ${this.rentals.length}권`, {
      fontSize: '9px', color: '#aaaaaa', fontFamily: 'Courier New',
    }))

    const closeBtn = this.add.text(PANEL_W - 14, 4, '✕', {
      fontSize: '9px', color: '#888888', fontFamily: 'Courier New',
    }).setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => this.hidePanel())
    container.add(closeBtn)

    this.rentals.forEach((r, i) => {
      const y = HEADER_H + i * ITEM_H

      const itemBg = this.add.graphics()
      itemBg.fillStyle(r.isOverdue ? 0x2a0808 : 0x111111, 0.9)
      itemBg.fillRoundedRect(4, y, PANEL_W - 8, ITEM_H - 4, 3)
      container.add(itemBg)

      const maxLen = 16
      const titleStr = r.title.length > maxLen ? r.title.slice(0, maxLen) + '…' : r.title
      container.add(this.add.text(8, y + 4, titleStr, {
        fontSize: '9px', color: '#eeeeee', fontFamily: 'Courier New',
      }))

      const dateLabel = r.isOverdue ? `연체 — ${r.dueDateStr}` : `반납일 ${r.dueDateStr}`
      container.add(this.add.text(8, y + 18, dateLabel, {
        fontSize: '8px', color: r.isOverdue ? '#e05050' : '#777777', fontFamily: 'Courier New',
      }))

      const btnColor = r.isOverdue ? 0x992222 : 0x2a5070
      const btnG = this.add.graphics()
      btnG.fillStyle(btnColor, 1)
      btnG.fillRoundedRect(PANEL_W - 44, y + 9, 36, 18, 3)
      container.add(btnG)

      container.add(this.add.text(PANEL_W - 36, y + 13, '반납', {
        fontSize: '8px', color: '#ffffff', fontFamily: 'Courier New',
      }))

      const rentalId = r.id
      const btnZone = this.add.zone(PANEL_W - 26, y + 18, 36, 18).setInteractive({ useHandCursor: true })
      btnZone.on('pointerdown', () => {
        this.game.events.emit('book-return-requested', { rentalId })
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
