import { supabase } from './client'

export interface AchievementDef {
  key: string
  label: string
  desc: string
  rep: number
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_book',   label: '첫 개관',     desc: '첫 완독 도서 등록', rep: 5  },
  { key: 'books_5',      label: '장서 시작',   desc: '도서 5권 보유',     rep: 10 },
  { key: 'books_20',     label: '장서가',      desc: '도서 20권 보유',    rep: 20 },
  { key: 'first_rental', label: '첫 대여',     desc: '첫 반납 완료',      rep: 5  },
  { key: 'rentals_10',   label: '인기 도서관', desc: '누적 반납 10회',    rep: 10 },
  { key: 'rentals_30',   label: '명성 도서관', desc: '누적 반납 30회',    rep: 20 },
  { key: 'reviews_1',    label: '첫 독후감',   desc: '독후감 1편 작성',   rep: 5  },
  { key: 'reviews_3',    label: '열혈 독자',   desc: '독후감 3편 작성',   rep: 10 },
]

export async function checkAndGrantAchievements(userId: string): Promise<{
  newAchievements: AchievementDef[]
  repAdded: number
}> {
  const [booksRes, rentalsRes, reviewsRes, achievedRes] = await Promise.all([
    supabase.from('reading_records').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'completed'),
    supabase.from('rental_records').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).not('returned_at', 'is', null),
    supabase.from('reviews').select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('achievements').select('key').eq('user_id', userId),
  ])

  const totalBooks    = booksRes.count   ?? 0
  const returnedCount = rentalsRes.count ?? 0
  const reviewCount   = reviewsRes.count ?? 0
  const achieved      = new Set((achievedRes.data ?? []).map(r => r.key))

  const checks: Record<string, boolean> = {
    first_book:   totalBooks    >= 1,
    books_5:      totalBooks    >= 5,
    books_20:     totalBooks    >= 20,
    first_rental: returnedCount >= 1,
    rentals_10:   returnedCount >= 10,
    rentals_30:   returnedCount >= 30,
    reviews_1:    reviewCount   >= 1,
    reviews_3:    reviewCount   >= 3,
  }

  const newOnes = ACHIEVEMENT_DEFS.filter(d => !achieved.has(d.key) && checks[d.key])
  if (newOnes.length === 0) return { newAchievements: [], repAdded: 0 }

  await supabase.from('achievements').insert(
    newOnes.map(a => ({ user_id: userId, key: a.key }))
  )

  const repAdded = newOnes.reduce((sum, a) => sum + a.rep, 0)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('store_reputation')
    .eq('user_id', userId)
    .single()
  if (profile) {
    await supabase
      .from('user_profiles')
      .update({ store_reputation: profile.store_reputation + repAdded })
      .eq('user_id', userId)
  }

  return { newAchievements: newOnes, repAdded }
}
