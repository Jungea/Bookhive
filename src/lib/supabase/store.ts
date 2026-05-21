import { supabase } from './client'
import type { UserProfile, GenreInventory, StoreItem, BookEntry, RentalRecord } from '../types'

export async function createProfile(userId: string, storeName: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .insert({ user_id: userId, store_name: storeName })
    .select('*')
    .single()
  return data
}

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
    .select('id, content_id, contents(title, genre, total_pages, cover_color, deleted_at)')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!data) return []

  type Row = {
    id: string
    content_id: string
    contents: { title: string; genre: string[]; total_pages: number | null; cover_color: string | null; deleted_at: string | null }
              | { title: string; genre: string[]; total_pages: number | null; cover_color: string | null; deleted_at: string | null }[]
              | null
  }
  return (data as unknown as Row[]).flatMap(r => {
    const c = r.contents
    if (!c) return []
    const items = Array.isArray(c) ? c : [c]
    return items.filter(item => !item.deleted_at).map(item => ({
      content_id: r.content_id,
      reading_record_id: r.id,
      title: item.title,
      genre: item.genre[0] ?? '기타',
      pages: item.total_pages,
      cover_color: item.cover_color,
    }))
  })
}

// 페이지 수 → 반납 기한(일) 계산
function getDueDays(pages: number | null): number {
  if (!pages) return 5
  if (pages <= 100) return 3
  if (pages <= 300) return 5
  if (pages <= 500) return 7
  return 10
}

export async function createRental(params: {
  userId: string
  contentId: string
  readingRecordId: string
  pages: number | null
  customerType: string
}): Promise<RentalRecord | null> {
  const rentedAt = new Date()
  const returnDueAt = new Date(rentedAt)
  returnDueAt.setDate(returnDueAt.getDate() + getDueDays(params.pages))

  const { data } = await supabase
    .from('rental_records')
    .insert({
      user_id: params.userId,
      content_id: params.contentId,
      reading_record_id: params.readingRecordId,
      rented_at: rentedAt.toISOString(),
      return_due_at: returnDueAt.toISOString(),
      customer_type: params.customerType,
    })
    .select('*, contents(title)')
    .single()

  if (!data) return null
  type Row = typeof data & { contents: { title: string } | null }
  const row = data as unknown as Row
  return { ...data, content_title: row.contents?.title ?? '' }
}

export async function returnRental(rentalId: string): Promise<void> {
  await supabase
    .from('rental_records')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', rentalId)
}

export async function getActiveRentals(userId: string): Promise<RentalRecord[]> {
  const { data } = await supabase
    .from('rental_records')
    .select('*, contents(title)')
    .eq('user_id', userId)
    .is('returned_at', null)
    .order('rented_at', { ascending: false })

  if (!data) return []
  type Row = typeof data[number] & { contents: { title: string } | null }
  return (data as unknown as Row[]).map(r => ({
    ...r,
    content_title: r.contents?.title ?? '',
  }))
}

export async function getStoreItems(userId: string): Promise<StoreItem[]> {
  const { data } = await supabase
    .from('store_items')
    .select('*')
    .eq('user_id', userId)
  return data ?? []
}
