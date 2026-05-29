import Phaser from 'phaser'
import { DEPTH } from '../depths'
import { loadTheme } from '../config/theme'
import type { Theme } from '../config/theme'

export class Desk {
  private g: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  private container: Phaser.GameObjects.Container
  private gameEvents: Phaser.Events.EventEmitter
  private themeListener: (theme: Theme) => void
  private width: number
  private height: number

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.width = width
    this.height = height
    this.gameEvents = scene.game.events

    const theme = loadTheme()

    this.g = scene.add.graphics()
    this.label = scene.add.text(width / 2, -height / 2, 'INFO', {
      fontSize: '9px',
      color: theme.bgCss,
      fontFamily: 'Courier New',
      fontStyle: 'bold',
    }).setOrigin(0.5)

    this.container = scene.add.container(x, y, [this.g, this.label]).setDepth(DEPTH.FURNITURE)
    this.drawDesk(theme)

    this.themeListener = (t: Theme) => {
      this.drawDesk(t)
      this.label.setStyle({ color: t.bgCss })
    }
    this.gameEvents.on('theme-changed', this.themeListener)
  }

  private drawDesk(theme: Theme) {
    const { g, width, height } = this
    g.clear()
    g.fillStyle(theme.fg, 1)
    g.fillRect(0, -height, width, height)
    g.lineStyle(1, theme.bg, 0.4)
    g.strokeRect(0, -height, width, height)
  }

  destroy() {
    this.gameEvents.off('theme-changed', this.themeListener)
    this.container.destroy()
  }
}
