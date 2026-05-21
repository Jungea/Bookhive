import Phaser from 'phaser'

interface StoreStats {
  gold: number
  reputation: number
  stock: number
  rentedCount?: number
}

interface RentalInfo {
  id: string
  isOverdue: boolean
}

const ICON_SIZE = 16
const PANEL_PAD = 6

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private repText!: Phaser.GameObjects.Text
  private stockText!: Phaser.GameObjects.Text
  private rentalContainer!: Phaser.GameObjects.Container

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    const { width } = this.cameras.main
    const style = { fontSize: '11px', color: '#FFD700', fontFamily: 'Courier New' }

    // 배경 바
    this.add.rectangle(0, 0, width, 22, 0x000000, 0.6).setOrigin(0, 0)

    this.goldText  = this.add.text(8,   5, '💰 0 G', style)
    this.repText   = this.add.text(110, 5, '⭐ 0',   style)
    this.stockText = this.add.text(180, 5, '📚 0',   style)

    this.rentalContainer = this.add.container(width, 28)

    this.game.events.on('stats-updated', (stats: StoreStats) => {
      this.goldText.setText(`💰 ${stats.gold} G`)
      this.repText.setText(`⭐ ${stats.reputation}`)
      const rented = stats.rentedCount ?? 0
      const remaining = stats.stock - rented
      this.stockText.setText(`📚 ${remaining}/${stats.stock}`)
    })

    this.game.events.on('rentals-updated', (rentals: RentalInfo[]) => {
      this.drawRentals(rentals)
    })

    // 초기값 표시
    this.game.events.emit('stats-updated', { gold: 0, reputation: 0, stock: 0 })
  }

  private drawRentals(rentals: RentalInfo[]) {
    this.rentalContainer.removeAll(true)

    const hasOverdue = rentals.some(r => r.isOverdue)
    const panelW = PANEL_PAD * 2 + ICON_SIZE
    const panelH = PANEL_PAD * 2 + ICON_SIZE

    // 배경
    const bg = this.add.graphics()
    bg.fillStyle(0x000000, 0.55)
    bg.fillRoundedRect(-panelW, 0, panelW, panelH, 4)
    this.rentalContainer.add(bg)

    // 책 아이콘 (단일)
    const baseColor  = rentals.length === 0 ? 0x555555 : hasOverdue ? 0xe05050 : 0x7a9bbf
    const spineColor = rentals.length === 0 ? 0x333333 : hasOverdue ? 0xb03030 : 0x4a6b8f
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

    // 대여 수 뱃지
    if (rentals.length > 0) {
      const badge = this.add.text(-PANEL_PAD - 1, 0, `${rentals.length}`, {
        fontSize: '7px', color: '#ffffff', fontFamily: 'Courier New',
        backgroundColor: hasOverdue ? '#e05050' : '#4a6b8f',
        padding: { x: 2, y: 1 },
      })
      this.rentalContainer.add(badge)
    }

    // 클릭 히트존
    const hitZone = this.add.rectangle(-panelW / 2, panelH / 2, panelW, panelH)
      .setInteractive({ useHandCursor: true })
    hitZone.on('pointerdown', () => { this.game.events.emit('rental-panel-clicked') })
    this.rentalContainer.add(hitZone)
  }
}
