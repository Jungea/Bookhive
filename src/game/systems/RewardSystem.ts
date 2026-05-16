import type { GenreInventory } from '../../lib/types'

export type CustomerType = 'student' | 'worker' | 'webnovel' | 'collector'

interface VisitRewardParams {
  wantedGenre: string
  inventory: GenreInventory
  customerType: CustomerType
}

interface VisitReward {
  gold: number
  reputation: number
  satisfied: boolean
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

export function calculateVisitReward(params: VisitRewardParams): VisitReward {
  const { wantedGenre, inventory, customerType } = params
  const stock = inventory[wantedGenre] ?? 0

  if (stock === 0) {
    return { gold: 0, reputation: -1, satisfied: false }
  }

  return {
    gold:       BASE_GOLD[customerType],
    reputation: REPUTATION_ON_SATISFY[customerType],
    satisfied:  true,
  }
}
