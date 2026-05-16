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
