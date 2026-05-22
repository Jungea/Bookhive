# Bookhive 마이그레이션

Supabase SQL Editor에서 실행. 전체 스키마를 처음부터 구성할 때 사용.

```sql
-- activity_logs
create table if not exists public.activity_logs (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  content_id        uuid        not null references public.contents(id) on delete cascade,
  record_id         uuid        not null,
  action            text        not null,
  note              text,
  progress_snapshot integer,
  status_snapshot   text,
  logged_at         timestamptz not null default now()
);

alter table public.activity_logs enable row level security;
create policy "activity_logs_self" on public.activity_logs
  for all using (auth.uid() = user_id);

-- contents
create table if not exists public.contents (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  type            text        not null,
  title           text        not null,
  author          text        not null default '',
  cover_url       text,
  cover_color     text,
  genre           text[]      not null default '{}',
  isbn            text,
  external_id     text,
  total_pages     integer,
  total_episodes  integer,
  is_ongoing      boolean     not null default false,
  progress_type   text        not null default 'none',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.contents enable row level security;
create policy "contents_self" on public.contents
  for all using (auth.uid() = user_id);

-- reading_records.stock_count 추가 (2026-05-22)
alter table public.reading_records
  add column if not exists stock_count integer not null default 1;

-- reading_records
create table if not exists public.reading_records (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  content_id        uuid        not null references public.contents(id) on delete cascade,
  status            text        not null default 'to_read',
  progress_page     integer,
  progress_episode  integer,
  started_at        timestamptz,
  completed_at      timestamptz,
  is_in_store       boolean     not null default false
);

alter table public.reading_records enable row level security;
create policy "reading_records_self" on public.reading_records
  for all using (auth.uid() = user_id);

-- reviews
create table if not exists public.reviews (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  content_id  uuid        not null references public.contents(id) on delete cascade,
  title       text        not null default '',
  body        text        not null default '',
  rating      integer     not null default 0,
  is_public   boolean     not null default false,
  ai_keywords text[],
  ai_emotion  text,
  ai_depth    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;
create policy "reviews_self" on public.reviews
  for all using (auth.uid() = user_id);

-- store_items
create table if not exists public.store_items (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  item_type      text        not null check (item_type in ('sofa', 'plant', 'lamp', 'rug')),
  slot_position  integer     not null,
  purchased_at   timestamptz not null default now(),
  unique (user_id, slot_position)
);

alter table public.store_items enable row level security;
create policy "store_items_self" on public.store_items
  for all using (auth.uid() = user_id);

-- rental_records
create table if not exists public.rental_records (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  content_id        uuid        not null references public.contents(id) on delete cascade,
  reading_record_id uuid        references public.reading_records(id),
  rented_at         timestamptz not null default now(),
  return_due_at     timestamptz not null,
  returned_at       timestamptz,
  customer_type     text        not null
);

alter table public.rental_records enable row level security;
create policy "rental_records_self" on public.rental_records
  for all using (auth.uid() = user_id);

-- user_profiles
create table if not exists public.user_profiles (
  user_id           uuid        primary key references auth.users(id) on delete cascade,
  store_name        text        not null default '나의 도서관',
  theme_id          text        not null default 'default',
  store_level       integer     not null default 1,
  store_reputation  numeric     not null default 0,
  gold              integer     not null default 0,
  custom_genres     text[]      not null default '{}',
  purchased_themes  text[]      not null default '{}',
  last_online_at    timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
create policy "user_profiles_self" on public.user_profiles
  for all using (auth.uid() = user_id);
```
