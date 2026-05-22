import { supabase } from './client'
import type { ActivityLog, ReadingStatus } from '../types'

export async function getActivityLogs(userId: string, contentId: string): Promise<ActivityLog[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .order('logged_at', { ascending: false })
  return data ?? []
}

export async function updateProgress(data: {
  recordId: string
  contentId: string
  status: ReadingStatus
  progressPage: number | null
  progressEpisode: number | null
  note: string | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 재독 완료 시 재고 +1 감지
  let newStockCount: number | undefined
  if (data.status === 'completed') {
    const { data: current } = await supabase
      .from('reading_records')
      .select('status, stock_count')
      .eq('id', data.recordId)
      .single()
    if (current?.status === 'rereading') {
      newStockCount = (current.stock_count ?? 1) + 1
    }
  }

  await supabase
    .from('reading_records')
    .update({
      status: data.status,
      progress_page: data.progressPage,
      progress_episode: data.progressEpisode,
      ...(data.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      ...(newStockCount !== undefined ? { stock_count: newStockCount } : {}),
    })
    .eq('id', data.recordId)
    .eq('user_id', user.id)

  await supabase.from('activity_logs').insert({
    user_id:           user.id,
    content_id:        data.contentId,
    record_id:         data.recordId,
    action:            data.status === 'completed' ? 'completed' : 'progress',
    note:              data.note || null,
    progress_snapshot: data.progressPage ?? data.progressEpisode,
    status_snapshot:   data.status,
  })
}
