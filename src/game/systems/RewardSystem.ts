import type { GenreInventory } from '../../lib/types'
import { DAMAGE_PROB, MEMO_PROB } from '../balance'

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

export type ReturnEventType = 'normal' | 'overdue' | 'damaged' | 'memo'

export interface ReturnEvent {
  type: ReturnEventType
  goldMultiplier: number
  bonusReputation: number
  message: string
  icon: string
}

// 반납 이벤트 결정
export function getReturnEvent(isOverdue: boolean): ReturnEvent {
  if (isOverdue) {
    return { type: 'overdue',  goldMultiplier: 0.5, bonusReputation: 0,  icon: '⏰', message: '연체! 후원금이 줄었어요.' }
  }
  const r = Math.random()
  if (r < DAMAGE_PROB) {
    return { type: 'damaged',  goldMultiplier: 0.3, bonusReputation: 0,  icon: '📕', message: '책이 훼손되어 돌아왔어요.' }
  }
  if (r < DAMAGE_PROB + MEMO_PROB) {
    return { type: 'memo',     goldMultiplier: 1.5, bonusReputation: 2,  icon: '📝', message: '책갈피 메모를 발견했어요!' }
  }
  return   { type: 'normal',   goldMultiplier: 1.0, bonusReputation: 0,  icon: '📗', message: '정상 반납됐어요.' }
}

// 반납 시: 금화만 지급
export function calculateReturnReward(customerType: CustomerType): ReturnReward {
  return { gold: BASE_GOLD[customerType] }
}
