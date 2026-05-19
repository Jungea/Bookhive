import { supabase } from './client'
import type { UserProfile, GenreInventory, StoreItem, BookEntry } from '../types'

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'gold' | 'store_level' | 'store_reputation' | 'last_online_at' | 'theme_id'>>
): Promise<void> {
  await supabase.from('user_profiles').update(updates).eq('user_id', userId)
}

export async function getGenreInventory(userId: string): Promise<GenreInventory> {
  const { data } = await supabase
    .from('reading_records')
    .select('contents(genre)')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!data) return {}

  type Row = { contents: { genre: string[] } | { genre: string[] }[] | null }
  return (data as unknown as Row[])
    .flatMap(r => {
      const c = r.contents
      if (!c) return []
      return Array.isArray(c) ? c.flatMap(x => x.genre) : c.genre
    })
    .reduce<GenreInventory>((acc, genre) => {
      acc[genre] = (acc[genre] ?? 0) + 1
      return acc
    }, {})
}

export async function getBookInventory(userId: string): Promise<BookEntry[]> {
  const { data } = await supabase
    .from('reading_records')
    .select('contents(genre, total_pages)')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!data) return []

  type Row = { contents: { genre: string[]; total_pages: number | null } | { genre: string[]; total_pages: number | null }[] | null }
  return (data as unknown as Row[]).flatMap(r => {
    const c = r.contents
    if (!c) return []
    const items = Array.isArray(c) ? c : [c]
    return items.map(item => ({
      genre: item.genre[0] ?? '기타',
      pages: item.total_pages,
    }))
  })
}

export async function getStoreItems(userId: string): Promise<StoreItem[]> {
  const { data } = await supabase
    .from('store_items')
    .select('*')
    .eq('user_id', userId)
  return data ?? []
}
