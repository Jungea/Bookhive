import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'
import { PageLoading } from '../components/PageLoading'
import { supabase } from '../lib/supabase/client'
import {
  getProfile, getGenreInventory, getBookInventory, updateProfile,
  createRental, returnRental, getActiveRentals,
  incrementStock, getReturnedRentalCount,
} from '../lib/supabase/store'
import { calculateOfflineEarnings } from '../game/systems/IdleLoop'
import { calculateVisitReward, calculateReturnReward } from '../game/systems/RewardSystem'
import type { CustomerType } from '../game/systems/RewardSystem'
import type { UserProfile, GenreInventory, BookEntry, RentalRecord } from '../lib/types'
import { RENTAL_PER_STOCK, SHELF_COSTS, SHELF_REP_REQ } from '../game/balance'

const HEARTBEAT_INTERVAL_MS = 60_000
const MAX_STORE_LEVEL = 4

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inventory, setInventory] = useState<GenreInventory>({})
  const [books, setBooks] = useState<BookEntry[]>([])
  const [gameReady, setGameReady] = useState(false)
  const [rentals, setRentals] = useState<RentalRecord[]>([])
  const [shopOpen, setShopOpen] = useState(false)
  const rentalsRef = useRef<RentalRecord[]>([])
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userIdRef.current = user.id

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

    const heartbeat = setInterval(() => {
      if (userIdRef.current) {
        updateProfile(userIdRef.current, { last_online_at: new Date().toISOString() })
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(heartbeat)
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
        dueDateStr: `${dueDate.getMonth() + 1}/${dueDate.getDate()} ${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}:${String(dueDate.getSeconds()).padStart(2, '0')}`,
        isOverdue: dueDate <= now,
        returnDueAt: r.return_due_at,
        contentId: r.content_id,
        customerType: r.customer_type,
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

    // 방문 시: 평판만 지급
    const handleResolved = async ({ wantedGenre, customerType }: { wantedGenre: string; customerType: CustomerType }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile) return

      const reward = calculateVisitReward({ wantedGenre, inventory, customerType })
      if (reward.reputation === 0) return

      const newRep = profile.store_reputation + reward.reputation
      await updateProfile(user.id, { store_reputation: newRep })
      setProfile(p => p ? { ...p, store_reputation: newRep } : p)
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
        rentalsRef.current = [...newRentals, ...rentalsRef.current]
        setRentals(prev => [...newRentals, ...prev])
      }
    }

    // 반납 시: 금화 지급 + 재고 증가 체크
    const handleReturnCardClicked = async ({ rentalId }: { rentalId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !profile) return

      const rental = rentalsRef.current.find(r => r.id === rentalId)
      await returnRental(rentalId)
      rentalsRef.current = rentalsRef.current.filter(r => r.id !== rentalId)
      setRentals(prev => prev.filter(r => r.id !== rentalId))

      if (!rental) return
      game.events.emit('book-returned', { contentId: rental.content_id })

      // 금화 지급
      const { gold: earnedGold } = calculateReturnReward(rental.customer_type as CustomerType)
      const newGold = profile.gold + earnedGold
      await updateProfile(user.id, { gold: newGold })
      setProfile(p => p ? { ...p, gold: newGold } : p)

      // 대여 완료 횟수가 임계값의 배수에 도달하면 재고 +1
      if (rental.reading_record_id) {
        const returnedCount = await getReturnedRentalCount(user.id, rental.content_id)
        if (returnedCount > 0 && returnedCount % RENTAL_PER_STOCK === 0) {
          await incrementStock(rental.reading_record_id)
          const [newInv, newBooks] = await Promise.all([
            getGenreInventory(user.id),
            getBookInventory(user.id),
          ])
          setInventory(newInv)
          setBooks(newBooks)
        }
      }
    }

    game.events.on('customer-resolved', handleResolved)
    game.events.on('books-rented', handleRented)
    game.events.on('return-card-clicked', handleReturnCardClicked)
    return () => {
      game.events.off('customer-resolved', handleResolved)
      game.events.off('books-rented', handleRented)
      game.events.off('return-card-clicked', handleReturnCardClicked)
    }
  }, [gameReady, profile, inventory])

  async function handleBuyShelf() {
    if (!profile || !userIdRef.current) return
    const nextLevel = profile.store_level + 1
    if (nextLevel > MAX_STORE_LEVEL) return

    const cost    = SHELF_COSTS[nextLevel - 2]   // index 0 = level2 비용
    const repReq  = SHELF_REP_REQ[nextLevel - 1] // index 0 = level1(기본)
    if (profile.gold < cost || profile.store_reputation < repReq) return

    const newGold  = profile.gold - cost
    const newLevel = nextLevel
    await updateProfile(userIdRef.current, { gold: newGold, store_level: newLevel })
    setProfile(p => p ? { ...p, gold: newGold, store_level: newLevel } : p)
    setShopOpen(false)
  }

  const nextLevel   = profile ? profile.store_level + 1 : 2
  const canUpgrade  = profile ? profile.store_level < MAX_STORE_LEVEL : false
  const cost        = canUpgrade ? SHELF_COSTS[nextLevel - 2] : 0
  const repReq      = canUpgrade ? SHELF_REP_REQ[nextLevel - 1] : 0
  const goldOk      = profile ? profile.gold >= cost : false
  const repOk       = profile ? profile.store_reputation >= repReq : false
  const canBuy      = goldOk && repOk

  return (
    <div className="flex flex-col h-full">
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <GameCanvas onGameReady={g => { gameRef.current = g; setGameReady(true) }} />

        {!profile && (
          <div style={{ position: 'absolute', inset: 0, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PageLoading label="도서관 불러오는 중..." />
          </div>
        )}

        {/* 상점 버튼 */}
        {profile && (
          <button
            onClick={() => setShopOpen(o => !o)}
            style={{
              position: 'absolute', bottom: 12, right: 12,
              width: 36, height: 36, borderRadius: '50%',
              background: shopOpen ? 'var(--color-accent)' : 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: '16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="도서관 확장"
          >
            +
          </button>
        )}

        {/* 상점 패널 */}
        {shopOpen && profile && (
          <div style={{
            position: 'absolute', bottom: 56, right: 12,
            background: 'rgba(10,10,10,0.93)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '12px 14px', minWidth: 200, color: '#eee',
            fontFamily: 'Courier New, monospace', fontSize: 12,
          }}>
            <p style={{ color: '#aaa', marginBottom: 10, fontSize: 11 }}>도서관 확장</p>

            {!canUpgrade ? (
              <p style={{ color: '#666', fontSize: 11 }}>최대 레벨입니다.</p>
            ) : (
              <div>
                <p style={{ marginBottom: 6 }}>
                  책장 추가 (레벨 {profile.store_level} → {nextLevel})
                </p>
                <p style={{ color: goldOk ? '#7fc97f' : '#e05050', marginBottom: 2 }}>
                  💰 {cost} G {!goldOk && `(부족: ${cost - profile.gold}G)`}
                </p>
                <p style={{ color: repOk ? '#7fc97f' : '#e05050', marginBottom: 10 }}>
                  ⭐ 평판 {repReq} 이상 {!repOk && `(현재 ${Math.floor(profile.store_reputation)})`}
                </p>
                <button
                  onClick={handleBuyShelf}
                  disabled={!canBuy}
                  style={{
                    width: '100%', padding: '6px 0', borderRadius: 4,
                    border: 'none', cursor: canBuy ? 'pointer' : 'not-allowed',
                    background: canBuy ? 'var(--color-accent)' : '#333',
                    color: canBuy ? '#fff' : '#666', fontSize: 12, fontWeight: 600,
                  }}
                >
                  {canBuy ? '구매' : '조건 미충족'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
