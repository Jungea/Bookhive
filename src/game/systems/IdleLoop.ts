const MAX_OFFLINE_HOURS = 24
const GOLD_PER_HOUR_PER_STOCK = 5

interface OfflineEarningsParams {
  lastOnlineAt: Date
  totalStock: number
  storeLevel: number
}

export function calculateOfflineEarnings(params: OfflineEarningsParams): number {
  const { lastOnlineAt, totalStock, storeLevel } = params
  if (totalStock === 0) return 0

  const elapsedMs = Date.now() - lastOnlineAt.getTime()
  const elapsedHours = Math.min(elapsedMs / 3_600_000, MAX_OFFLINE_HOURS)
  const levelMultiplier = 1 + (storeLevel - 1) * 0.3

  return Math.floor(elapsedHours * totalStock * GOLD_PER_HOUR_PER_STOCK * levelMultiplier)
}
