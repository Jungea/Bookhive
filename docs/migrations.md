# Bookhive 마이그레이션

PageRoom 기존 스키마 위에 추가 실행. Supabase SQL Editor에서 순서대로 실행.

```sql
-- 001: user_profiles에 골드·오프라인 계산 컬럼 추가
alter table public.user_profiles
  add column if not exists gold integer not null default 0,
  add column if not exists last_online_at timestamptz not null default now(),
  add column if not exists purchased_themes text[] not null default '{}';

-- 002: store_items 테이블 생성
create table if not exists public.store_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  item_type      text not null check (item_type in ('sofa', 'plant', 'lamp', 'rug')),
  slot_position  integer not null,
  purchased_at   timestamptz not null default now(),
  unique (user_id, slot_position)
);

alter table public.store_items enable row level security;
create policy "store_items_self" on public.store_items
  for all using (auth.uid() = user_id);

-- 003: rental_records 테이블 생성 (대여 이력)
create table if not exists public.rental_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  content_id       uuid not null references public.contents(id) on delete cascade,
  reading_record_id uuid references public.reading_records(id),
  rented_at        timestamptz not null default now(),
  return_due_at    timestamptz not null,
  returned_at      timestamptz,
  customer_type    text not null
);

alter table public.rental_records enable row level security;
create policy "rental_records_self" on public.rental_records
  for all using (auth.uid() = user_id);
```
