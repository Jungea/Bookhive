import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../game/config'

interface Props {
  onGameReady?: (game: Phaser.Game) => void
}

export function GameCanvas({ onGameReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game(createPhaserConfig(containerRef.current))
    gameRef.current = game
    onGameReady?.(game)

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full" style={{ height: 300 }} />
}
