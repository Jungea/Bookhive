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
  const [showRentalPanel, setShowRentalPanel] = useState(false)

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
      rentedCount: rentalsRef.current.length,
    })
  }, [profile, gameReady]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !game) return
    const handlePanelClick = () => setShowRentalPanel(p => !p)
    game.events.on('rental-panel-clicked', handlePanelClick)
    return () => { game.events.off('rental-panel-clicked', handlePanelClick) }
  }, [gameReady])

  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !game) return
    const now = new Date()
    game.events.emit('rentals-updated', rentals.map(r => ({
      id: r.id,
      isOverdue: new Date(r.return_due_at) <= now,
    })))
    if (profile) {
      const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0)
      game.events.emit('stats-updated', {
        gold: profile.gold,
        reputation: profile.store_reputation,
        stock: totalStock,
        rentedCount: rentals.length,
      })
    }
  }, [rentals, gameReady]) // eslint-disable-line react-hooks/exhaustive-deps

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
      game.events.emit('stats-updated', { gold: newGold, reputation: newRep, stock: totalStock, rentedCount: rentalsRef.current.length })
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

  return (
    <div className="flex flex-col h-full">
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GameCanvas onGameReady={g => { gameRef.current = g; setGameReady(true) }} />
        {showRentalPanel && (
          <RentalOverlay
            rentals={rentals}
            onReturn={async (id) => { await handleReturn(id) }}
            onClose={() => setShowRentalPanel(false)}
          />
        )}
      </div>

      {!profile && (
        <p className="p-3 text-xs opacity-50" style={{ color: 'var(--color-text)' }}>
          로딩 중...
        </p>
      )}
    </div>
  )
}

function RentalOverlay({
  rentals,
  onReturn,
  onClose,
}: {
  rentals: RentalRecord[]
  onReturn: (id: string) => void
  onClose: () => void
}) {
  const now = new Date()
  const sorted = [...rentals].sort((a, b) =>
    (new Date(a.return_due_at) <= now ? 0 : 1) - (new Date(b.return_due_at) <= now ? 0 : 1)
  )

  return (
    <div style={{
      position: 'absolute', top: 28, right: 0,
      background: 'rgba(10,10,10,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px',
      padding: '10px',
      minWidth: '200px',
      maxWidth: '260px',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#aaa' }}>반납 대기 {rentals.length}권</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '0.75rem', padding: 0, lineHeight: 1 }}
        >✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {sorted.map(r => {
          const overdue = new Date(r.return_due_at) <= now
          const dueDate = new Date(r.return_due_at)
          const dueDateStr = `${dueDate.getMonth() + 1}/${dueDate.getDate()}`
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: '4px',
              background: overdue ? 'rgba(220,80,80,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${overdue ? 'rgba(220,80,80,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontSize: '0.7rem', color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                  {r.content_title}
                </span>
                <span style={{ fontSize: '0.65rem', color: overdue ? '#e05050' : '#888' }}>
                  {overdue ? '연체 — ' : '반납일 '}{dueDateStr}
                </span>
              </div>
              <button
                onClick={() => onReturn(r.id)}
                style={{
                  padding: '3px 8px', borderRadius: '4px', border: 'none',
                  background: overdue ? 'rgba(220,80,80,0.7)' : 'rgba(100,140,180,0.6)',
                  color: '#fff', fontSize: '0.65rem', cursor: 'pointer', flexShrink: 0, marginLeft: '8px',
                }}
              >
                반납
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
