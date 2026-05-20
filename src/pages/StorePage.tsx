import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'
import { supabase } from '../lib/supabase/client'
import {
  getProfile, getGenreInventory, getBookInventory, updateProfile,
  createRental, returnRental, getActiveRentals,
} from '../lib/supabase/store'
import { calculateOfflineEarnings } from '../game/systems/IdleLoop'
import { calculateVisitReward } from '../game/systems/RewardSystem'
import type { CustomerType } from '../game/systems/RewardSystem'
import type { UserProfile, GenreInventory, BookEntry, RentalRecord } from '../lib/types'

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inventory, setInventory] = useState<GenreInventory>({})
  const [books, setBooks] = useState<BookEntry[]>([])
  const [gameReady, setGameReady] = useState(false)
  const [rentals, setRentals] = useState<RentalRecord[]>([])
  const rentalsRef = useRef<RentalRecord[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [prof, inv, bookList, activeRentals] = await Promise.all([
        getProfile(user.id),
        getGenreInventory(user.id),
        getBookInventory(user.id),
        getActiveRentals(user.id),
      ])
      if (!prof) return

      const totalStock = Object.values(inv).reduce((a, b) => a + b, 0)
      const earned = calculateOfflineEarnings({
        lastOnlineAt: new Date(prof.last_online_at),
        totalStock,
        storeLevel: prof.store_level,
      })

      const newGold = prof.gold + earned
      await updateProfile(user.id, {
        gold: newGold,
        last_online_at: new Date().toISOString(),
      })

      setProfile({ ...prof, gold: newGold })
      setInventory(inv)
      setBooks(bookList)
      rentalsRef.current = activeRentals
      setRentals(activeRentals)
    }
    init()
  }, [])

  // 책장은 books/inventory/storeLevel이 바뀔 때만 갱신 (profile 변경 시 재렌더 방지)
  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !profile || !game) return

    game.events.emit('inventory-updated', {
      books,
      inventory,
      storeLevel: profile.store_level,
      rentedContentIds: rentalsRef.current.map(r => r.content_id),
    })
  }, [books, inventory, gameReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // HUD 수치는 profile이 바뀔 때마다 갱신
  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !profile || !game) return

    const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0)
    game.events.emit('stats-updated', {
      gold: profile.gold,
      reputation: profile.store_reputation,
      stock: totalStock,
    })
  }, [profile, gameReady]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !game) return

    const handleResolved = async ({ wantedGenre, customerType }: { wantedGenre: string; customerType: CustomerType }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile) return

      const reward = calculateVisitReward({ wantedGenre, inventory, customerType })
      const newGold = profile.gold + reward.gold
      const newRep  = profile.store_reputation + reward.reputation

      await updateProfile(user.id, { gold: newGold, store_reputation: newRep })
      setProfile(p => p ? { ...p, gold: newGold, store_reputation: newRep } : p)

      const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0)
      game.events.emit('stats-updated', { gold: newGold, reputation: newRep, stock: totalStock })
    }

    const handleRented = async ({ books, customerType }: { books: BookEntry[]; customerType: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const created = await Promise.all(books.map(book =>
        createRental({
          userId: user.id,
          contentId: book.content_id,
          readingRecordId: book.reading_record_id,
          pages: book.pages,
          customerType,
        })
      ))
      const newRentals = created.filter((r): r is RentalRecord => r !== null)
      if (newRentals.length > 0) {
        setRentals(prev => [...newRentals, ...prev])
      }
    }

    game.events.on('customer-resolved', handleResolved)
    game.events.on('books-rented', handleRented)
    return () => {
      game.events.off('customer-resolved', handleResolved)
      game.events.off('books-rented', handleRented)
    }
  }, [gameReady, profile, inventory])

  async function handleReturn(rentalId: string) {
    const rental = rentals.find(r => r.id === rentalId)
    await returnRental(rentalId)
    setRentals(prev => prev.filter(r => r.id !== rentalId))
    if (rental && gameRef.current) {
      gameRef.current.events.emit('book-returned', { contentId: rental.content_id })
    }
  }

  const now = new Date()
  const overdueRentals = rentals.filter(r => new Date(r.return_due_at) <= now)
  const onTimeRentals  = rentals.filter(r => new Date(r.return_due_at) > now)

  return (
    <div className="flex flex-col h-full">
      <GameCanvas onGameReady={g => { gameRef.current = g; setGameReady(true) }} />

      {rentals.length > 0 && (
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold opacity-60" style={{ color: 'var(--color-text)' }}>
            반납 대기 {rentals.length}권
          </p>

          {/* 연체 */}
          {overdueRentals.map(r => (
            <RentalCard key={r.id} rental={r} overdue onReturn={handleReturn} />
          ))}

          {/* 정상 */}
          {onTimeRentals.map(r => (
            <RentalCard key={r.id} rental={r} overdue={false} onReturn={handleReturn} />
          ))}
        </div>
      )}

      {!profile && (
        <p className="p-3 text-xs opacity-50" style={{ color: 'var(--color-text)' }}>
          로딩 중...
        </p>
      )}
    </div>
  )
}

function RentalCard({
  rental,
  overdue,
  onReturn,
}: {
  rental: RentalRecord
  overdue: boolean
  onReturn: (id: string) => void
}) {
  const dueDate = new Date(rental.return_due_at)
  const dueDateStr = `${dueDate.getMonth() + 1}/${dueDate.getDate()}`

  return (
    <div
      className="flex items-center justify-between rounded px-3 py-2 text-xs"
      style={{
        background: overdue ? 'rgba(220,80,80,0.12)' : 'var(--color-surface)',
        border: `1px solid ${overdue ? 'rgba(220,80,80,0.4)' : 'var(--color-border)'}`,
        color: 'var(--color-text)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{rental.content_title}</span>
        <span className="opacity-50">
          {overdue ? '연체 — ' : '반납일 '}
          {dueDateStr}
        </span>
      </div>
      <button
        onClick={() => onReturn(rental.id)}
        className="px-2 py-1 rounded text-xs"
        style={{
          background: overdue ? 'rgba(220,80,80,0.7)' : 'var(--color-primary)',
          color: '#fff',
        }}
      >
        반납 처리
      </button>
    </div>
  )
}
