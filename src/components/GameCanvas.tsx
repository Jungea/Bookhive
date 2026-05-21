import { useEffect, useRef, forwardRef } from 'react'
import type { ReactNode } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../game/config'

interface Props {
  onGameReady?: (game: Phaser.Game) => void
  children?: ReactNode
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

export const GameCanvas = forwardRef<HTMLDivElement, Props>(({ onGameReady, children }, ref) => {
  const divRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  function setRef(el: HTMLDivElement | null) {
    (divRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  useEffect(() => {
    if (!divRef.current || gameRef.current) return
    const el = divRef.current
    const parent = el.parentElement!
    const cs = getComputedStyle(parent)
    const availW = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const availH = parent.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const { w, h } = calcSize(availW, availH)
    el.style.width = `${w}px`
    el.style.height = `${h}px`

    const game = new Phaser.Game(createPhaserConfig(el))
    gameRef.current = game
    onGameReady?.(game)

    return () => { game.destroy(true); gameRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!divRef.current) return
    const el = divRef.current
    const parent = el.parentElement!
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      const { w, h } = calcSize(width, height)
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      gameRef.current?.scale.resize(w, h)
    })
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={setRef} style={{ flexShrink: 0, position: 'relative' }}>
      {children}
    </div>
  )
})

GameCanvas.displayName = 'GameCanvas'
