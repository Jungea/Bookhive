import type { GenreInventory } from '../../lib/types'
import type { CustomerType } from './RewardSystem'
import { QUEST_PROB } from '../balance'

interface CustomerProfile {
  type: CustomerType
  preferredGenres: string[]
  isQuest: boolean
}

interface GenerateParams {
  storeLevel: number
  reputation: number
}

const BASE_WEIGHTS: Record<CustomerType, number> = {
  student:   35,
  worker:    40,
  webnovel:  20,
  collector: 5,
}

const GENRE_PREFS: Record<CustomerType, string[]> = {
  student:   ['철학', '인문학', '역사', '사회학'],
  worker:    ['소설', '자기계발', '에세이'],
  webnovel:  ['판타지', '로맨스', 'SF'],
  collector: [],
}

export function generateCustomer(params: GenerateParams): CustomerProfile {
  const { reputation } = params
  const collectorBonus = Math.floor(reputation / 10)
  const weights = {
    ...BASE_WEIGHTS,
    collector: BASE_WEIGHTS.collector + collectorBonus,
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let rand = Math.random() * total

  const isQuest = Math.random() < QUEST_PROB

  for (const [type, weight] of Object.entries(weights) as [CustomerType, number][]) {
    rand -= weight
    if (rand <= 0) {
      return { type, preferredGenres: GENRE_PREFS[type], isQuest }
    }
  }
  return { type: 'worker', preferredGenres: GENRE_PREFS.worker, isQuest }
}

export function pickWantedGenre(
  type: CustomerType,
  inventory: GenreInventory
): string | null {
  const available = Object.keys(inventory).filter(g => inventory[g] > 0)
  if (available.length === 0) return null

  const prefs = GENRE_PREFS[type]
  const preferred = available.filter(g => prefs.includes(g))

  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)]
  }
  return available[Math.floor(Math.random() * available.length)]
}
