import { useRef } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)

  return (
    <div className="flex flex-col h-full">
      <GameCanvas onGameReady={g => { gameRef.current = g }} />
      <div className="p-3 text-xs" style={{ color: 'var(--color-text)' }}>
        <p style={{ color: 'var(--color-accent)' }}>서점을 운영하세요</p>
        <p className="opacity-60 mt-1">책을 읽으면 재고가 쌓입니다</p>
      </div>
    </div>
  )
}
