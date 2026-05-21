import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../game/config'

interface Props {
  onGameReady?: (game: Phaser.Game) => void
}

const RATIO = 9 / 20

function calcSize(availW: number, availH: number) {
  let w = availW
  let h = Math.round(w * RATIO)
  if (availH > 0 && h > availH) {
    h = availH
    w = Math.round(h / RATIO)
  }
  return { w, h }
}

export function GameCanvas({ onGameReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return
    const el = containerRef.current
    const parent = el.parentElement!
    const { w, h } = calcSize(parent.clientWidth, parent.clientHeight)
    el.style.width = `${w}px`
    el.style.height = `${h}px`

    const game = new Phaser.Game(createPhaserConfig(el))
    gameRef.current = game
    onGameReady?.(game)

    return () => { game.destroy(true); gameRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const parent = el.parentElement!
    const observer = new ResizeObserver(() => {
      const { w, h } = calcSize(parent.clientWidth, parent.clientHeight)
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      gameRef.current?.scale.resize(w, h)
    })
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  return <div ref={containerRef} style={{ width: '100%' }} />
}
