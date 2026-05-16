import { describe, it, expect } from 'vitest'
import { generateCustomer, pickWantedGenre } from '../src/game/systems/CustomerAI'

describe('generateCustomer', () => {
  it('유효한 CustomerType 반환', () => {
    const types = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const c = generateCustomer({ storeLevel: 1, reputation: 0 })
      types.add(c.type)
    }
    expect(types.size).toBeGreaterThan(1)
  })

  it('reputation 높을수록 collector 등장 확률 증가', () => {
    let lowCount = 0
    let highCount = 0
    for (let i = 0; i < 100; i++) {
      if (generateCustomer({ storeLevel: 1, reputation: 5 }).type === 'collector') lowCount++
      if (generateCustomer({ storeLevel: 1, reputation: 100 }).type === 'collector') highCount++
    }
    expect(highCount).toBeGreaterThan(lowCount)
  })
})

describe('pickWantedGenre', () => {
  it('inventory에 있는 장르 중 하나를 선택', () => {
    const inventory = { '소설': 3, '철학': 2 }
    const genre = pickWantedGenre('student', inventory)
    expect(['소설', '철학', null]).toContain(genre)
  })

  it('inventory가 비어있으면 null 반환', () => {
    expect(pickWantedGenre('student', {})).toBeNull()
  })
})
