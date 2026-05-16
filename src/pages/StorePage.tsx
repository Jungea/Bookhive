import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'
import { supabase } from '../lib/supabase/client'
import { getProfile, getGenreInventory, updateProfile } from '../lib/supabase/store'
import { calculateOfflineEarnings } from '../game/systems/IdleLoop'
import { calculateVisitReward } from '../game/systems/RewardSystem'
import type { CustomerType } from '../game/systems/RewardSystem'
import type { UserProfile, GenreInventory } from '../lib/types'

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inventory, setInventory] = useState<GenreInventory>({})
  const [gameReady, setGameReady] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [prof, inv] = await Promise.all([
        getProfile(user.id),
        getGenreInventory(user.id),
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
    }
    init()
  }, [])

  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !profile || !game) return

    const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0)
    game.events.emit('stats-updated', {
      gold: profile.gold,
      reputation: profile.store_reputation,
      stock: totalStock,
    })
    game.events.emit('inventory-updated', {
      inventory,
      storeLevel: profile.store_level,
    })
  }, [profile, inventory, gameReady])

  useEffect(() => {
    const game = gameRef.current
    if (!gameReady || !game) return

    const handler = async ({ wantedGenre, customerType }: { wantedGenre: string; customerType: CustomerType }) => {
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

    game.events.on('customer-resolved', handler)
    return () => { game.events.off('customer-resolved', handler) }
  }, [gameReady, profile, inventory])

  return (
    <div className="flex flex-col h-full">
      <GameCanvas onGameReady={g => { gameRef.current = g; setGameReady(true) }} />
      {!profile && (
        <p className="p-3 text-xs opacity-50" style={{ color: 'var(--color-text)' }}>
          로딩 중...
        </p>
      )}
    </div>
  )
}
