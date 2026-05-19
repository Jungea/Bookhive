import { supabase } from './client'
import type { ContentType, ContentWithRecord, ProgressType, ReadingStatus } from '../types'

export async function createContent(data: {
  type: ContentType
  progressType: ProgressType
  title: string
  author: string
  genre: string[]
  totalPages: number | null
  totalEpisodes: number | null
  isOngoing: boolean
  initialStatus: ReadingStatus
}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: content, error: contentError } = await supabase
    .from('contents')
    .insert({
      user_id:        user.id,
      type:           data.type,
      progress_type:  data.progressType,
      title:          data.title,
      author:         data.author,
      genre:          data.genre,
      total_pages:    data.totalPages,
      total_episodes: data.totalEpisodes,
      is_ongoing:     data.isOngoing,
    })
    .select()
    .single()

  if (contentError || !content) throw new Error(contentError?.message)

  const { data: record, error: recordError } = await supabase
    .from('reading_records')
    .insert({ user_id: user.id, content_id: content.id, status: data.initialStatus })
    .select()
    .single()

  if (recordError || !record) throw new Error(recordError?.message)

  await supabase.from('activity_logs').insert({
    user_id:    user.id,
    content_id: content.id,
    record_id:  record.id,
    action:     'started',
    note:       `${data.title} 등록`,
  })

  return content
}

export async function getContentsWithRecords(userId: string): Promise<ContentWithRecord[]> {
  const { data } = await supabase
    .from('contents')
    .select('*, reading_record:reading_records!inner(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!data) return []

  return data.map((row) => {
    const { reading_record, ...content } = row as ContentWithRecord & { reading_record: ContentWithRecord['reading_record'] | ContentWithRecord['reading_record'][] }
    return {
      ...content,
      reading_record: Array.isArray(reading_record) ? reading_record[0] ?? null : reading_record,
    }
  })
}
