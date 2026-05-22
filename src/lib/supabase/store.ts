import { supabase } from './client'
import type { UserProfile, GenreInventory, StoreItem, BookEntry, RentalRecord } from '../types'
import { RENTAL_DUE_UNIT } from '../../game/balance'

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
  updates: Partial<Pick<UserProfile, 'gold' | 'store_level' | 'store_reputation' | 'last_online_at' | 'theme_id' | 'store_name'>>
): Promise<void> {
  await supabase.from('user_profiles').update(updates).eq('user_id', userId)
}

export async function getGenreInventory(userId: string): Promise<GenreInventory> {
  const { data } = await supabase
    .from('reading_records')
    .select('stock_count, contents(genre)')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!data) return {}

  type Row = { stock_count: number; contents: { genre: string[] } | { genre: string[] }[] | null }
  const result: GenreInventory = {}
  for (const row of data as unknown as Row[]) {
    const c = row.contents
    if (!c) continue
    const genres = Array.isArray(c) ? c.flatMap(x => x.genre) : c.genre
    const count = row.stock_count ?? 1
    for (const genre of genres) {
      result[genre] = (result[genre] ?? 0) + count
    }
  }
  return result
}

export async function getBookInventory(userId: string): Promise<BookEntry[]> {
  const { data } = await supabase
    .from('reading_records')
    .select('id, content_id, stock_count, contents(title, genre, total_pages, cover_color, deleted_at)')
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (!data) return []

  type Row = {
    id: string
    content_id: string
    stock_count: number
    contents: { title: string; genre: string[]; total_pages: number | null; cover_color: string | null; deleted_at: string | null }
              | { title: string; genre: string[]; total_pages: number | null; cover_color: string | null; deleted_at: string | null }[]
              | null
  }
  return (data as unknown as Row[]).flatMap(r => {
    const c = r.contents
    if (!c) return []
    const items = Array.isArray(c) ? c : [c]
    const stockCount = r.stock_count ?? 1
    return items.filter(item => !item.deleted_at).flatMap(item =>
      Array.from({ length: stockCount }, (_, i) => ({
        copy_id: `${r.content_id}#${i}`,
        stock_count: stockCount,
        content_id: r.content_id,
        reading_record_id: r.id,
        title: item.title,
        genre: item.genre[0] ?? '기타',
        pages: item.total_pages,
        cover_color: item.cover_color,
      }))
    )
  })
}

export async function incrementStock(recordId: string): Promise<void> {
  const { data } = await supabase
    .from('reading_records')
    .select('stock_count')
    .eq('id', recordId)
    .single()
  if (!data) return
  await supabase
    .from('reading_records')
    .update({ stock_count: (data.stock_count ?? 1) + 1 })
    .eq('id', recordId)
}

export async function getReturnedRentalCount(userId: string, contentId: string): Promise<number> {
  const { count } = await supabase
    .from('rental_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .not('returned_at', 'is', null)
  return count ?? 0
}

// 페이지 수 → 반납 기한 계산 (단위: RENTAL_DUE_UNIT)
function getDueAmount(pages: number | null): number {
  if (!pages) return 5
  if (pages <= 100) return 3
  if (pages <= 300) return 5
  if (pages <= 500) return 7
  return 10
}

function applyDue(base: Date, amount: number): Date {
  const ms = { day: 864e5, hour: 36e5, minute: 6e4, second: 1e3 }[RENTAL_DUE_UNIT]
  return new Date(base.getTime() + amount * ms)
}

export async function createRental(params: {
  userId: string
  contentId: string
  readingRecordId: string
  pages: number | null
  customerType: string
}): Promise<RentalRecord | null> {
  const rentedAt = new Date()
  const returnDueAt = applyDue(rentedAt, getDueAmount(params.pages))

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
