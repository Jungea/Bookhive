import { describe, it, expect } from 'vitest'
import { calculateOfflineEarnings } from '../src/game/systems/IdleLoop'

describe('calculateOfflineEarnings', () => {
  it('재고 0이면 수익 0', () => {
    const result = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 3600_000),
      totalStock: 0,
      storeLevel: 1,
    })
    expect(result).toBe(0)
  })

  it('1시간, 재고 10권, 레벨 1 → 골드 50', () => {
    const result = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 3600_000),
      totalStock: 10,
      storeLevel: 1,
    })
    expect(result).toBe(50)
  })

  it('최대 24시간까지만 계산', () => {
    const over24h = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 30 * 3600_000),
      totalStock: 10,
      storeLevel: 1,
    })
    const exactly24h = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 24 * 3600_000),
      totalStock: 10,
      storeLevel: 1,
    })
    expect(over24h).toBe(exactly24h)
  })

  it('레벨이 높을수록 시간당 수익 증가', () => {
    const base = { lastOnlineAt: new Date(Date.now() - 3600_000), totalStock: 10 }
    const lv1 = calculateOfflineEarnings({ ...base, storeLevel: 1 })
    const lv2 = calculateOfflineEarnings({ ...base, storeLevel: 2 })
    expect(lv2).toBeGreaterThan(lv1)
  })
})
