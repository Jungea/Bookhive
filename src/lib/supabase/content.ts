import { supabase } from './client'
import type { ContentType, ProgressType, ReadingStatus } from '../types'

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
