import { supabase } from './client'
import type { Review } from '../types'

export interface ReviewWithContent extends Review {
  contents: { title: string } | null
}

export async function getReviews(userId: string): Promise<ReviewWithContent[]> {
  const { data } = await supabase
    .from('reviews')
    .select('*, contents(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ReviewWithContent[]
}

export async function upsertReview(data: {
  reviewId?: string
  contentId: string
  title: string
  body: string
  rating: number
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (data.reviewId) {
    await supabase
      .from('reviews')
      .update({ title: data.title, body: data.body, rating: data.rating, updated_at: new Date().toISOString() })
      .eq('id', data.reviewId)
      .eq('user_id', user.id)
    return
  }

  // 최초 작성 여부 확인 (첫 번째 독후감에만 재고 +1)
  const { count: existingCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', data.contentId)
    .eq('user_id', user.id)
  const isFirstReview = (existingCount ?? 0) === 0

  const { data: review, error } = await supabase
    .from('reviews')
    .insert({ user_id: user.id, content_id: data.contentId, title: data.title, body: data.body, rating: data.rating, is_public: false })
    .select()
    .single()
  if (error || !review) throw new Error(error?.message)

  const { data: record } = await supabase
    .from('reading_records')
    .select('id, stock_count')
    .eq('content_id', data.contentId)
    .eq('user_id', user.id)
    .single()

  if (record) {
    await supabase.from('activity_logs').insert({
      user_id:    user.id,
      content_id: data.contentId,
      record_id:  record.id,
      action:     'review_written',
      note:       '독후감 작성',
    })

    if (isFirstReview) {
      await supabase
        .from('reading_records')
        .update({ stock_count: (record.stock_count ?? 1) + 1 })
        .eq('id', record.id)
    }
  }
}

export async function deleteReview(reviewId: string, userId: string) {
  await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId)
}
