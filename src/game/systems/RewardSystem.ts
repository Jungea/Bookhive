import type { GenreInventory } from '../../lib/types'

export type CustomerType = 'student' | 'worker' | 'webnovel' | 'collector'

interface VisitRewardParams {
  wantedGenre: string
  inventory: GenreInventory
  customerType: CustomerType
  isQuest?: boolean
}

interface VisitReward {
  reputation: number
  satisfied: boolean
}

interface ReturnReward {
  gold: number
}

const BASE_GOLD: Record<CustomerType, number> = {
  student:   30,
  worker:    20,
  webnovel:  15,
  collector: 80,
}

const REPUTATION_ON_SATISFY: Record<CustomerType, number> = {
  student:   3,
  worker:    1,
  webnovel:  1,
  collector: 10,
}

const QUEST_BONUS_REP: Record<CustomerType, number> = {
  student:   5,
  worker:    3,
  webnovel:  3,
  collector: 15,
}

// 방문 시: 평판만 지급 (퀘스트 성공 시 보너스)
export function calculateVisitReward(params: VisitRewardParams): VisitReward {
  const { wantedGenre, inventory, customerType, isQuest } = params
  const stock = inventory[wantedGenre] ?? 0

  if (stock === 0) {
    return { reputation: 0, satisfied: false }
  }

  const bonus = isQuest ? QUEST_BONUS_REP[customerType] : 0
  return {
    reputation: REPUTATION_ON_SATISFY[customerType] + bonus,
    satisfied:  true,
  }
}

// 반납 시: 금화만 지급
export function calculateReturnReward(customerType: CustomerType): ReturnReward {
  return { gold: BASE_GOLD[customerType] }
}
