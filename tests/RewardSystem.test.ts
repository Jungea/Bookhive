import { describe, it, expect } from 'vitest'
import { calculateVisitReward } from '../src/game/systems/RewardSystem'

describe('calculateVisitReward', () => {
  it('원하는 장르 책이 있으면 골드와 평판 획득', () => {
    const result = calculateVisitReward({
      wantedGenre: '철학',
      inventory: { '철학': 3, '소설': 2 },
      customerType: 'student',
    })
    expect(result.gold).toBeGreaterThan(0)
    expect(result.reputation).toBeGreaterThan(0)
    expect(result.satisfied).toBe(true)
  })

  it('원하는 장르 책이 없으면 골드 0, 평판 감소', () => {
    const result = calculateVisitReward({
      wantedGenre: '철학',
      inventory: { '소설': 2 },
      customerType: 'student',
    })
    expect(result.gold).toBe(0)
    expect(result.reputation).toBeLessThan(0)
    expect(result.satisfied).toBe(false)
  })

  it('단골(collector) 손님은 골드 보너스', () => {
    const base = calculateVisitReward({
      wantedGenre: '소설',
      inventory: { '소설': 5 },
      customerType: 'worker',
    })
    const collector = calculateVisitReward({
      wantedGenre: '소설',
      inventory: { '소설': 5 },
      customerType: 'collector',
    })
    expect(collector.gold).toBeGreaterThan(base.gold)
  })
})
