import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'
import { PageLoading } from '../components/PageLoading'
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

  // 책장은 books/inventory/storeLevel이 바뀔 때만 갱신
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
    const now = new Date()
    game.events.emit('rentals-updated', rentals.map(r => {
      const dueDate = new Date(r.return_due_at)
      return {
        id: r.id,
        title: r.content_title,
        dueDateStr: `${dueDate.getMonth() + 1}/${dueDate.getDate()}`,
        isOverdue: dueDate <= now,
      }
    }))
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

    const handleReturnRequested = async ({ rentalId }: { rentalId: string }) => {
      const rental = rentalsRef.current.find(r => r.id === rentalId)
      await returnRental(rentalId)
      rentalsRef.current = rentalsRef.current.filter(r => r.id !== rentalId)
      setRentals(prev => prev.filter(r => r.id !== rentalId))
      if (rental && game) {
        game.events.emit('book-returned', { contentId: rental.content_id })
      }
    }

    game.events.on('customer-resolved', handleResolved)
    game.events.on('books-rented', handleRented)
    game.events.on('book-return-requested', handleReturnRequested)
    return () => {
      game.events.off('customer-resolved', handleResolved)
      game.events.off('books-rented', handleRented)
      game.events.off('book-return-requested', handleReturnRequested)
    }
  }, [gameReady, profile, inventory])

  return (
    <div className="flex flex-col h-full">
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <GameCanvas onGameReady={g => { gameRef.current = g; setGameReady(true) }} />
        {!profile && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PageLoading label="도서관 불러오는 중..." />
          </div>
        )}
      </div>
    </div>
  )
}
