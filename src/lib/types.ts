export type ContentType = 'book' | 'webnovel' | 'indie' | 'original'
export type ProgressType = 'page' | 'episode' | 'none'
export type ReadingStatus =
  | 'to_read' | 'reading' | 'completed' | 'dropped'
  | 'rereading' | 'waiting' | 'up_to_date'

export interface Content {
  id: string
  user_id: string
  type: ContentType
  progress_type: ProgressType
  title: string
  author: string
  cover_url: string | null
  genre: string[]
  isbn: string | null
  total_pages: number | null
  total_episodes: number | null
  is_ongoing: boolean
  created_at: string
}

export interface ReadingRecord {
  id: string
  user_id: string
  content_id: string
  status: ReadingStatus
  progress_page: number | null
  progress_episode: number | null
  started_at: string | null
  completed_at: string | null
  is_in_store: boolean
}

export interface UserProfile {
  user_id: string
  store_name: string
  theme_id: string
  store_level: number
  store_reputation: number
  gold: number
  last_online_at: string
  purchased_themes: string[]
  created_at: string
}

export interface StoreItem {
  id: string
  user_id: string
  item_type: 'sofa' | 'plant' | 'lamp' | 'rug'
  slot_position: number
  purchased_at: string
}

export type GenreInventory = Record<string, number>

export interface BookEntry {
  content_id: string
  reading_record_id: string
  title: string
  genre: string        // 첫 번째 장르 (책장 색상 기준)
  pages: number | null // 페이지 수 (책 두께 계산용)
}

export interface RentalRecord {
  id: string
  user_id: string
  content_id: string
  reading_record_id: string | null
  rented_at: string
  return_due_at: string
  returned_at: string | null
  customer_type: string
  content_title: string
}

export type ActivityAction = 'progress' | 'status_change' | 'review_written' | 'started' | 'completed'

export interface Review {
  id: string
  user_id: string
  content_id: string
  title: string
  body: string
  rating: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  content_id: string
  record_id: string
  action: ActivityAction
  note: string | null
  progress_snapshot: number | null
  status_snapshot: string | null
  logged_at: string
}

export interface ContentWithRecord extends Content {
  reading_record: ReadingRecord | null
}
