import Phaser from 'phaser'

interface StoreStats {
  gold: number
  reputation: number
  stock: number
}

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private repText!: Phaser.GameObjects.Text
  private stockText!: Phaser.GameObjects.Text

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    const { width } = this.cameras.main
    const style = { fontSize: '11px', color: '#FFD700', fontFamily: 'Courier New' }

    // 배경 바
    this.add.rectangle(0, 0, width, 22, 0x000000, 0.6).setOrigin(0, 0)

    this.goldText  = this.add.text(8,   5, '💰 0 G', style)
    this.repText   = this.add.text(110, 5, '⭐ 0',   style)
    this.stockText = this.add.text(180, 5, '📚 0',   style)

    this.game.events.on('stats-updated', (stats: StoreStats) => {
      this.goldText.setText(`💰 ${stats.gold} G`)
      this.repText.setText(`⭐ ${stats.reputation}`)
      this.stockText.setText(`📚 ${stats.stock}`)
    })

    // 초기값 표시
    this.game.events.emit('stats-updated', { gold: 0, reputation: 0, stock: 0 })
  }
}
