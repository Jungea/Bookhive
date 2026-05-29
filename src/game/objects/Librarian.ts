import Phaser from 'phaser'
import { DEPTH } from '../depths'
import { loadTheme } from '../config/theme'
import type { Theme } from '../config/theme'

export class Librarian {
  private text: Phaser.GameObjects.Text
  private gameEvents: Phaser.Events.EventEmitter
  private themeListener: (theme: Theme) => void

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const theme = loadTheme()
    this.gameEvents = scene.game.events

    this.text = scene.add.text(x, y, '(｀・ω・´)ﾉ', {
      fontSize: '13px',
      color: theme.fgCss,
      fontFamily: 'Courier New',
    }).setOrigin(0.5, 1).setDepth(DEPTH.LIBRARIAN)

    this.themeListener = (t: Theme) => this.text.setStyle({ color: t.fgCss })
    this.gameEvents.on('theme-changed', this.themeListener)
  }

  destroy() {
    this.gameEvents.off('theme-changed', this.themeListener)
    this.text.destroy()
  }
}
