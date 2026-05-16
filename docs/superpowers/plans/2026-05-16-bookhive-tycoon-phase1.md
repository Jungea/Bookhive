# Bookhive 서점 타이쿤 Phase 1 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite + React + Phaser.js로 사이드뷰 픽셀아트 서점 타이쿤 게임을 구현하고 Vercel에 배포한다.

**Architecture:** Phaser.js가 게임 캔버스를 담당하고, React가 탭 네비게이션·테마·인증 UI를 감싼다. Supabase는 PageRoom 기존 스키마를 그대로 사용하며 `user_profiles`에 골드·오프라인 계산용 컬럼만 추가한다. 비즈니스 로직(IdleLoop, RewardSystem, CustomerAI)은 Phaser와 분리된 순수 TS 클래스로 작성해 Vitest로 단위 테스트한다.

**Tech Stack:** Vite 5, React 19, TypeScript 5, Phaser 3.80, Supabase JS v2, Tailwind CSS v4, Vitest, React Router v6, Capacitor 6

---

## 파일 구조

```
src/
├── game/
│   ├── config.ts              # Phaser 게임 설정
│   ├── scenes/
│   │   ├── BootScene.ts       # 초기 로딩
│   │   ├── PreloadScene.ts    # 에셋 로드
│   │   ├── MainScene.ts       # 메인 게임 씬 (사이드뷰)
│   │   └── UIScene.ts         # HUD 오버레이
│   ├── objects/
│   │   ├── Bookshelf.ts       # 책장 게임 오브젝트
│   │   └── Customer.ts        # 손님 캐릭터 오브젝트
│   └── systems/
│       ├── CustomerAI.ts      # 손님 행동 결정 (순수 로직, 테스트 가능)
│       ├── RewardSystem.ts    # 골드·평판 계산 (순수 로직, 테스트 가능)
│       └── IdleLoop.ts        # 오프라인 수익 계산 (순수 로직, 테스트 가능)
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Supabase 싱글턴 클라이언트
│   │   └── store.ts           # 서점 관련 Supabase 쿼리
│   ├── theme/
│   │   ├── tokens.ts          # 테마 정의 (이름, CSS 변수값)
│   │   └── apply.ts           # 테마 적용 + Phaser 팔레트 브릿지
│   └── types.ts               # 공용 타입 (PageRoom에서 포팅)
├── components/
│   └── GameCanvas.tsx         # Phaser 인스턴스를 마운트하는 React 컴포넌트
├── pages/
│   ├── StorePage.tsx          # 게임 탭 (GameCanvas 포함)
│   └── SettingsPage.tsx       # 테마 변경, 프로필
├── App.tsx                    # 탭 네비게이션 + React Router
├── index.css                  # Tailwind + CSS 변수 테마
└── main.tsx                   # Vite 엔트리

public/assets/                 # PageRoom에서 복사한 픽셀아트 에셋

tests/
├── CustomerAI.test.ts
├── RewardSystem.test.ts
└── IdleLoop.test.ts
```

---

## Task 1: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.env.local`, `.gitignore`

- [ ] **Step 1: Vite + React + TypeScript 프로젝트 생성**

```bash
cd /home/ejung/projects/Bookhive
npm create vite@latest . -- --template react-ts
```

프롬프트에서 "현재 디렉토리에 파일이 있습니다" 경고 → `y` 선택, `react-ts` 템플릿 선택

- [ ] **Step 2: 의존성 설치**

```bash
npm install
npm install phaser@3.80.1
npm install @supabase/supabase-js
npm install react-router-dom
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: vite.config.ts 작성**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  build: {
    outDir: 'dist',
  },
})
```

- [ ] **Step 4: tests/setup.ts 생성**

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: .env.local 생성**

```
VITE_SUPABASE_URL=https://hbsunejenfjgiwfokena.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_cd9v7fJ5G-HCqwPndilvJw_NFpUDzNo
```

- [ ] **Step 6: .gitignore에 .env.local 확인 (Vite 템플릿에 이미 포함됨)**

```bash
grep ".env.local" .gitignore
```

출력: `.env.local` 라인이 있어야 함

- [ ] **Step 7: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: `http://localhost:5173` 에서 Vite 기본 화면 확인

- [ ] **Step 8: 커밋**

```bash
git init
git add vite.config.ts package.json tsconfig.json index.html src/ tests/ .gitignore
git commit -m "프로젝트 초기 설정: Vite + React + TypeScript + Phaser + Supabase"
```

---

## Task 2: 에셋 파이프라인

**Files:**
- Create: `public/assets/` (PageRoom에서 복사)
- Create: `public/assets/asset-manifest.ts`

- [ ] **Step 1: PageRoom 에셋 복사**

```bash
cp "/home/ejung/projects/PageRoom/public/assets/book_shop_floor_walls_32x32.png" public/assets/
cp "/home/ejung/projects/PageRoom/public/assets/book_shop_props_32x32.png" public/assets/
cp "/home/ejung/projects/PageRoom/public/assets/npc01_spritesheet.png" public/assets/
cp "/home/ejung/projects/PageRoom/public/assets/48x48 Base Spritesheet.png" "public/assets/character_48x48.png"
```

- [ ] **Step 2: 에셋 키 상수 파일 생성**

```ts
// src/game/assets.ts
export const ASSETS = {
  TILESET_WALLS: 'tileset_walls',
  TILESET_PROPS: 'tileset_props',
  NPC_01: 'npc_01',
  CHARACTER: 'character',
} as const
```

- [ ] **Step 3: 커밋**

```bash
git add public/assets/ src/game/assets.ts
git commit -m "게임 에셋 추가: 서점 타일셋, NPC 스프라이트"
```

---

## Task 3: Supabase 마이그레이션

**Files:**
- Create: `docs/migrations.md` (Bookhive 전용)

- [ ] **Step 1: Bookhive migrations.md 생성**

```markdown
<!-- docs/migrations.md -->
# Bookhive 마이그레이션

PageRoom 기존 스키마 위에 추가 실행. Supabase SQL Editor에서 순서대로 실행.

\`\`\`sql
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
\`\`\`
```

- [ ] **Step 2: Supabase SQL Editor에서 위 SQL 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

- [ ] **Step 3: 실행 확인**

```bash
# Supabase 대시보드 Table Editor에서 확인:
# user_profiles에 gold, last_online_at, purchased_themes 컬럼 존재
# store_items 테이블 존재
```

- [ ] **Step 4: 커밋**

```bash
git add docs/migrations.md
git commit -m "DB 마이그레이션: gold, last_online_at, store_items 추가"
```

---

## Task 4: Supabase 클라이언트 & 타입

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase/store.ts`

- [ ] **Step 1: Supabase 클라이언트 작성**

```ts
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)
```

- [ ] **Step 2: 공용 타입 작성 (PageRoom 포팅)**

```ts
// src/lib/types.ts
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

// 장르별 완독 권수 (게임 재고)
export type GenreInventory = Record<string, number>
```

- [ ] **Step 3: 서점 Supabase 쿼리 작성**

```ts
// src/lib/supabase/store.ts
import { supabase } from './client'
import type { UserProfile, GenreInventory, StoreItem } from '../types'

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

  return (data as { contents: { genre: string[] } | null }[])
    .flatMap(r => r.contents?.genre ?? [])
    .reduce<GenreInventory>((acc, genre) => {
      acc[genre] = (acc[genre] ?? 0) + 1
      return acc
    }, {})
}

export async function getStoreItems(userId: string): Promise<StoreItem[]> {
  const { data } = await supabase
    .from('store_items')
    .select('*')
    .eq('user_id', userId)
  return data ?? []
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/
git commit -m "Supabase 클라이언트, 타입, 서점 쿼리 추가"
```

---

## Task 5: 테마 시스템

**Files:**
- Create: `src/lib/theme/tokens.ts`
- Create: `src/lib/theme/apply.ts`
- Modify: `src/index.css`

- [ ] **Step 1: 테마 토큰 정의**

```ts
// src/lib/theme/tokens.ts
export interface ThemePalette {
  bg: string
  wall: string
  floor: string
  shelf: string
  accent: string
  text: string
}

export interface Theme {
  id: string
  name: string
  isPremium: boolean
  palette: ThemePalette
}

export const THEMES: Record<string, Theme> = {
  'dark-library': {
    id: 'dark-library',
    name: '다크 라이브러리',
    isPremium: false,
    palette: {
      bg:     '#0f0f1a',
      wall:   '#2a2240',
      floor:  '#3d2b1a',
      shelf:  '#5c3d1e',
      accent: '#FFD700',
      text:   '#e0d8c8',
    },
  },
  'cozy-cafe': {
    id: 'cozy-cafe',
    name: '코지 카페',
    isPremium: true,
    palette: {
      bg:     '#fdf6ec',
      wall:   '#d4a373',
      floor:  '#8d6e63',
      shelf:  '#5d4037',
      accent: '#ff8f00',
      text:   '#3e2723',
    },
  },
  'midnight-noir': {
    id: 'midnight-noir',
    name: '미드나잇 느와르',
    isPremium: true,
    palette: {
      bg:     '#0a0a0f',
      wall:   '#1a1a2e',
      floor:  '#16213e',
      shelf:  '#0f3460',
      accent: '#e94560',
      text:   '#f0f0f0',
    },
  },
}
```

- [ ] **Step 2: 테마 적용 함수 작성**

```ts
// src/lib/theme/apply.ts
import { THEMES, type ThemePalette } from './tokens'
import type Phaser from 'phaser'

export function applyTheme(themeId: string): ThemePalette {
  const theme = THEMES[themeId] ?? THEMES['dark-library']
  const { palette } = theme
  const root = document.documentElement

  root.setAttribute('data-theme', themeId)
  root.style.setProperty('--color-bg',     palette.bg)
  root.style.setProperty('--color-wall',   palette.wall)
  root.style.setProperty('--color-floor',  palette.floor)
  root.style.setProperty('--color-shelf',  palette.shelf)
  root.style.setProperty('--color-accent', palette.accent)
  root.style.setProperty('--color-text',   palette.text)

  return palette
}

export function notifyPhaserTheme(game: Phaser.Game, palette: ThemePalette): void {
  game.events.emit('theme-changed', palette)
}
```

- [ ] **Step 3: CSS 기본 변수 설정**

```css
/* src/index.css */
@import "tailwindcss";

:root {
  --color-bg:     #0f0f1a;
  --color-wall:   #2a2240;
  --color-floor:  #3d2b1a;
  --color-shelf:  #5c3d1e;
  --color-accent: #FFD700;
  --color-text:   #e0d8c8;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Courier New', monospace;
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/theme/ src/index.css
git commit -m "테마 시스템: CSS 변수 + Phaser 팔레트 브릿지"
```

---

## Task 6: 비즈니스 로직 시스템 (TDD)

**Files:**
- Create: `src/game/systems/IdleLoop.ts`
- Create: `src/game/systems/RewardSystem.ts`
- Create: `src/game/systems/CustomerAI.ts`
- Create: `tests/IdleLoop.test.ts`
- Create: `tests/RewardSystem.test.ts`
- Create: `tests/CustomerAI.test.ts`

### 6-A: IdleLoop

- [ ] **Step 1: IdleLoop 실패 테스트 작성**

```ts
// tests/IdleLoop.test.ts
import { describe, it, expect } from 'vitest'
import { calculateOfflineEarnings } from '../src/game/systems/IdleLoop'

describe('calculateOfflineEarnings', () => {
  it('재고 0이면 수익 0', () => {
    const result = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 3600_000), // 1시간 전
      totalStock: 0,
      storeLevel: 1,
    })
    expect(result).toBe(0)
  })

  it('1시간, 재고 10권, 레벨 1 → 골드 50', () => {
    const result = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 3600_000),
      totalStock: 10,
      storeLevel: 1,
    })
    expect(result).toBe(50)
  })

  it('최대 24시간까지만 계산', () => {
    const over24h = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 30 * 3600_000), // 30시간 전
      totalStock: 10,
      storeLevel: 1,
    })
    const exactly24h = calculateOfflineEarnings({
      lastOnlineAt: new Date(Date.now() - 24 * 3600_000),
      totalStock: 10,
      storeLevel: 1,
    })
    expect(over24h).toBe(exactly24h)
  })

  it('레벨이 높을수록 시간당 수익 증가', () => {
    const base = { lastOnlineAt: new Date(Date.now() - 3600_000), totalStock: 10 }
    const lv1 = calculateOfflineEarnings({ ...base, storeLevel: 1 })
    const lv2 = calculateOfflineEarnings({ ...base, storeLevel: 2 })
    expect(lv2).toBeGreaterThan(lv1)
  })
})
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
npx vitest run tests/IdleLoop.test.ts
```

Expected: FAIL (calculateOfflineEarnings not found)

- [ ] **Step 3: IdleLoop 구현**

```ts
// src/game/systems/IdleLoop.ts
const MAX_OFFLINE_HOURS = 24
const GOLD_PER_HOUR_PER_STOCK = 5  // 재고 1권당 시간당 골드

interface OfflineEarningsParams {
  lastOnlineAt: Date
  totalStock: number
  storeLevel: number
}

export function calculateOfflineEarnings(params: OfflineEarningsParams): number {
  const { lastOnlineAt, totalStock, storeLevel } = params
  if (totalStock === 0) return 0

  const elapsedMs = Date.now() - lastOnlineAt.getTime()
  const elapsedHours = Math.min(elapsedMs / 3_600_000, MAX_OFFLINE_HOURS)
  const levelMultiplier = 1 + (storeLevel - 1) * 0.3

  return Math.floor(elapsedHours * totalStock * GOLD_PER_HOUR_PER_STOCK * levelMultiplier)
}
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
npx vitest run tests/IdleLoop.test.ts
```

Expected: PASS (4 tests)

### 6-B: RewardSystem

- [ ] **Step 5: RewardSystem 실패 테스트 작성**

```ts
// tests/RewardSystem.test.ts
import { describe, it, expect } from 'vitest'
import { calculateVisitReward } from '../src/game/systems/RewardSystem'

describe('calculateVisitReward', () => {
  it('원하는 장르 책이 있으면 골드와 평판 획득', () => {
    const result = calculateVisitReward({
      wantedGenre: '철학',
      inventory: { '철학': 3, '소설': 2 },
      customerType: 'student',
    })
    expect(result.gold).toBeGreaterThan(0)
    expect(result.reputation).toBeGreaterThan(0)
    expect(result.satisfied).toBe(true)
  })

  it('원하는 장르 책이 없으면 골드 0, 평판 감소', () => {
    const result = calculateVisitReward({
      wantedGenre: '철학',
      inventory: { '소설': 2 },
      customerType: 'student',
    })
    expect(result.gold).toBe(0)
    expect(result.reputation).toBeLessThan(0)
    expect(result.satisfied).toBe(false)
  })

  it('단골(collector) 손님은 골드 보너스', () => {
    const base = calculateVisitReward({
      wantedGenre: '소설',
      inventory: { '소설': 5 },
      customerType: 'worker',
    })
    const collector = calculateVisitReward({
      wantedGenre: '소설',
      inventory: { '소설': 5 },
      customerType: 'collector',
    })
    expect(collector.gold).toBeGreaterThan(base.gold)
  })
})
```

- [ ] **Step 6: 테스트 실행 → FAIL 확인**

```bash
npx vitest run tests/RewardSystem.test.ts
```

- [ ] **Step 7: RewardSystem 구현**

```ts
// src/game/systems/RewardSystem.ts
import type { GenreInventory } from '../../lib/types'

export type CustomerType = 'student' | 'worker' | 'webnovel' | 'collector'

interface VisitRewardParams {
  wantedGenre: string
  inventory: GenreInventory
  customerType: CustomerType
}

interface VisitReward {
  gold: number
  reputation: number
  satisfied: boolean
}

const BASE_GOLD: Record<CustomerType, number> = {
  student:   30,
  worker:    20,
  webnovel:  15,
  collector: 80,
}

const REPUTATION_ON_SATISFY: Record<CustomerType, number> = {
  student:   3,
  worker:    1,
  webnovel:  1,
  collector: 10,
}

export function calculateVisitReward(params: VisitRewardParams): VisitReward {
  const { wantedGenre, inventory, customerType } = params
  const stock = inventory[wantedGenre] ?? 0

  if (stock === 0) {
    return { gold: 0, reputation: -1, satisfied: false }
  }

  return {
    gold: BASE_GOLD[customerType],
    reputation: REPUTATION_ON_SATISFY[customerType],
    satisfied: true,
  }
}
```

- [ ] **Step 8: 테스트 실행 → PASS 확인**

```bash
npx vitest run tests/RewardSystem.test.ts
```

### 6-C: CustomerAI

- [ ] **Step 9: CustomerAI 실패 테스트 작성**

```ts
// tests/CustomerAI.test.ts
import { describe, it, expect } from 'vitest'
import { generateCustomer, pickWantedGenre } from '../src/game/systems/CustomerAI'

describe('generateCustomer', () => {
  it('유효한 CustomerType 반환', () => {
    const types = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const c = generateCustomer({ storeLevel: 1, reputation: 0 })
      types.add(c.type)
    }
    expect(types.size).toBeGreaterThan(1)
  })

  it('reputation 높을수록 collector 등장 확률 증가', () => {
    let lowCount = 0
    let highCount = 0
    for (let i = 0; i < 100; i++) {
      if (generateCustomer({ storeLevel: 1, reputation: 5 }).type === 'collector') lowCount++
      if (generateCustomer({ storeLevel: 1, reputation: 100 }).type === 'collector') highCount++
    }
    expect(highCount).toBeGreaterThan(lowCount)
  })
})

describe('pickWantedGenre', () => {
  it('inventory에 있는 장르 중 하나를 선택', () => {
    const inventory = { '소설': 3, '철학': 2 }
    const genre = pickWantedGenre('student', inventory)
    expect(['소설', '철학', null]).toContain(genre)
  })

  it('inventory가 비어있으면 null 반환', () => {
    expect(pickWantedGenre('student', {})).toBeNull()
  })
})
```

- [ ] **Step 10: 테스트 실행 → FAIL 확인**

```bash
npx vitest run tests/CustomerAI.test.ts
```

- [ ] **Step 11: CustomerAI 구현**

```ts
// src/game/systems/CustomerAI.ts
import type { GenreInventory } from '../../lib/types'
import type { CustomerType } from './RewardSystem'

interface CustomerProfile {
  type: CustomerType
  preferredGenres: string[]
}

interface GenerateParams {
  storeLevel: number
  reputation: number
}

// 기본 등장 가중치
const BASE_WEIGHTS: Record<CustomerType, number> = {
  student:   35,
  worker:    40,
  webnovel:  20,
  collector: 5,
}

export function generateCustomer(params: GenerateParams): CustomerProfile {
  const { reputation } = params
  const collectorBonus = Math.floor(reputation / 10)
  const weights = {
    ...BASE_WEIGHTS,
    collector: BASE_WEIGHTS.collector + collectorBonus,
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let rand = Math.random() * total

  for (const [type, weight] of Object.entries(weights) as [CustomerType, number][]) {
    rand -= weight
    if (rand <= 0) {
      return { type, preferredGenres: GENRE_PREFS[type] }
    }
  }
  return { type: 'worker', preferredGenres: GENRE_PREFS.worker }
}

const GENRE_PREFS: Record<CustomerType, string[]> = {
  student:   ['철학', '인문학', '역사', '사회학'],
  worker:    ['소설', '자기계발', '에세이'],
  webnovel:  ['판타지', '로맨스', 'SF'],
  collector: [], // pickWantedGenre에서 전체 장르 중 선택
}

export function pickWantedGenre(
  type: CustomerType,
  inventory: GenreInventory
): string | null {
  const available = Object.keys(inventory).filter(g => inventory[g] > 0)
  if (available.length === 0) return null

  const prefs = GENRE_PREFS[type]
  const preferred = available.filter(g => prefs.includes(g))

  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)]
  }
  // 선호 장르 없으면 전체 중 랜덤
  return available[Math.floor(Math.random() * available.length)]
}
```

- [ ] **Step 12: 테스트 전체 실행 → PASS 확인**

```bash
npx vitest run
```

Expected: 전체 테스트 PASS

- [ ] **Step 13: 커밋**

```bash
git add src/game/systems/ tests/
git commit -m "비즈니스 로직: IdleLoop, RewardSystem, CustomerAI (TDD)"
```

---

## Task 7: Phaser 씬 — PreloadScene & BootScene

**Files:**
- Create: `src/game/config.ts`
- Create: `src/game/scenes/BootScene.ts`
- Create: `src/game/scenes/PreloadScene.ts`

- [ ] **Step 1: Phaser 게임 설정 작성**

```ts
// src/game/config.ts
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { PreloadScene } from './scenes/PreloadScene'
import { MainScene } from './scenes/MainScene'
import { UIScene } from './scenes/UIScene'

export function createPhaserConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 480,
    height: 300,
    backgroundColor: '#0f0f1a',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PreloadScene, MainScene, UIScene],
  }
}
```

- [ ] **Step 2: BootScene 작성**

```ts
// src/game/scenes/BootScene.ts
import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene') }

  create() {
    this.scene.start('PreloadScene')
  }
}
```

- [ ] **Step 3: PreloadScene 작성**

```ts
// src/game/scenes/PreloadScene.ts
import Phaser from 'phaser'
import { ASSETS } from '../assets'

export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene') }

  preload() {
    // 로딩 바
    const bar = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      0, 8, 0xFFD700
    )
    this.load.on('progress', (v: number) => {
      bar.width = this.cameras.main.width * v
    })

    // 에셋 로드
    this.load.image(ASSETS.TILESET_WALLS, 'assets/book_shop_floor_walls_32x32.png')
    this.load.spritesheet(ASSETS.TILESET_PROPS, 'assets/book_shop_props_32x32.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet(ASSETS.NPC_01, 'assets/npc01_spritesheet.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
  }

  create() {
    this.scene.start('MainScene')
    this.scene.launch('UIScene')
  }
}
```

- [ ] **Step 4: 임시 MainScene, UIScene 스텁 생성 (컴파일 오류 방지)**

```ts
// src/game/scenes/MainScene.ts
import Phaser from 'phaser'
export class MainScene extends Phaser.Scene {
  constructor() { super('MainScene') }
  create() {}
}
```

```ts
// src/game/scenes/UIScene.ts
import Phaser from 'phaser'
export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene') }
  create() {}
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/game/
git commit -m "Phaser 씬 스캐폴딩: Boot, Preload, MainScene 스텁"
```

---

## Task 8: React GameCanvas 컴포넌트

**Files:**
- Create: `src/components/GameCanvas.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/StorePage.tsx`
- Create: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: GameCanvas 컴포넌트 작성**

```tsx
// src/components/GameCanvas.tsx
import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createPhaserConfig } from '../game/config'

interface Props {
  onGameReady?: (game: Phaser.Game) => void
}

export function GameCanvas({ onGameReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game(createPhaserConfig(containerRef.current))
    gameRef.current = game
    onGameReady?.(game)

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="w-full" style={{ height: 300 }} />
}
```

- [ ] **Step 2: StorePage 작성**

```tsx
// src/pages/StorePage.tsx
import { useRef } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)

  return (
    <div className="flex flex-col h-full">
      <GameCanvas onGameReady={g => { gameRef.current = g }} />
      <div className="p-3 text-xs" style={{ color: 'var(--color-text)' }}>
        <p style={{ color: 'var(--color-accent)' }}>서점을 운영하세요</p>
        <p className="opacity-60 mt-1">책을 읽으면 재고가 쌓입니다</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: SettingsPage 작성**

```tsx
// src/pages/SettingsPage.tsx
import { THEMES } from '../lib/theme/tokens'
import { applyTheme } from '../lib/theme/apply'

export function SettingsPage() {
  return (
    <div className="p-4">
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-accent)' }}>
        테마 설정
      </h2>
      <div className="flex flex-col gap-2">
        {Object.values(THEMES).map(theme => (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className="flex items-center gap-3 p-3 rounded border text-left text-sm"
            style={{ borderColor: 'var(--color-accent)', color: 'var(--color-text)' }}
          >
            <span
              className="w-5 h-5 rounded-full border"
              style={{ background: theme.palette.accent }}
            />
            <span>{theme.name}</span>
            {theme.isPremium && (
              <span className="ml-auto text-xs opacity-50">프리미엄</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App.tsx — 탭 네비게이션**

```tsx
// src/App.tsx
import { useState } from 'react'
import { StorePage } from './pages/StorePage'
import { SettingsPage } from './pages/SettingsPage'
import './index.css'

type Tab = 'store' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('store')

  return (
    <div
      className="flex flex-col h-screen max-w-lg mx-auto"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      {/* 콘텐츠 */}
      <div className="flex-1 overflow-auto">
        {tab === 'store'    && <StorePage />}
        {tab === 'settings' && <SettingsPage />}
      </div>

      {/* 하단 탭바 */}
      <nav
        className="flex border-t text-xs"
        style={{ borderColor: 'var(--color-shelf)' }}
      >
        {([['store', '🏪', '서점'], ['settings', '⚙️', '설정']] as const).map(
          ([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-3 flex flex-col items-center gap-1"
              style={{ color: tab === id ? 'var(--color-accent)' : 'var(--color-text)', opacity: tab === id ? 1 : 0.5 }}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </button>
          )
        )}
      </nav>
    </div>
  )
}
```

- [ ] **Step 5: main.tsx 확인 (Vite 기본값 유지)**

```ts
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: 브라우저에서 확인**

```bash
npm run dev
```

- 하단에 🏪서점 / ⚙️설정 탭 확인
- 서점 탭: 검은 Phaser 캔버스 표시
- 설정 탭: 테마 목록 표시, 클릭 시 배경색 변경 확인

- [ ] **Step 7: 커밋**

```bash
git add src/
git commit -m "React 앱 구조: GameCanvas, StorePage, SettingsPage, 탭 네비게이션"
```

---

## Task 9: MainScene — 사이드뷰 서점 배경

**Files:**
- Modify: `src/game/scenes/MainScene.ts`

- [ ] **Step 1: MainScene 배경 구현**

```ts
// src/game/scenes/MainScene.ts
import Phaser from 'phaser'
import type { ThemePalette } from '../../lib/theme/tokens'
import { ASSETS } from '../assets'

const FLOOR_Y_RATIO = 0.65  // 화면 높이의 65% 지점이 바닥

export class MainScene extends Phaser.Scene {
  private wallGraphics!: Phaser.GameObjects.Graphics
  private floorGraphics!: Phaser.GameObjects.Graphics
  private palette!: ThemePalette

  constructor() { super('MainScene') }

  create() {
    this.palette = this.getCurrentPalette()
    this.drawBackground()

    // 테마 변경 이벤트 수신
    this.game.events.on('theme-changed', (palette: ThemePalette) => {
      this.palette = palette
      this.drawBackground()
    })
  }

  private getCurrentPalette(): ThemePalette {
    const style = getComputedStyle(document.documentElement)
    const get = (v: string) => style.getPropertyValue(v).trim()
    return {
      bg:     get('--color-bg'),
      wall:   get('--color-wall'),
      floor:  get('--color-floor'),
      shelf:  get('--color-shelf'),
      accent: get('--color-accent'),
      text:   get('--color-text'),
    }
  }

  private drawBackground() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.wallGraphics?.destroy()
    this.floorGraphics?.destroy()

    // 벽 (바닥 위)
    this.wallGraphics = this.add.graphics()
    this.wallGraphics.fillStyle(
      Phaser.Display.Color.HexStringToColor(this.palette.wall).color
    )
    this.wallGraphics.fillRect(0, 0, width, floorY)

    // 바닥
    this.floorGraphics = this.add.graphics()
    this.floorGraphics.fillStyle(
      Phaser.Display.Color.HexStringToColor(this.palette.floor).color
    )
    this.floorGraphics.fillRect(0, floorY, width, height - floorY)

    // 바닥선
    this.floorGraphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.palette.shelf).color)
    this.floorGraphics.lineBetween(0, floorY, width, floorY)
  }
}
```

- [ ] **Step 2: 브라우저에서 확인**

```bash
npm run dev
```

- 서점 탭에서 Phaser 캔버스에 벽(어두운 보라) + 바닥(갈색) 배경 확인
- 설정에서 테마 변경 시 배경색이 바뀌는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/game/scenes/MainScene.ts
git commit -m "MainScene: 사이드뷰 배경 (벽, 바닥) + 테마 연동"
```

---

## Task 10: Bookshelf 게임 오브젝트

**Files:**
- Create: `src/game/objects/Bookshelf.ts`
- Modify: `src/game/scenes/MainScene.ts`

- [ ] **Step 1: Bookshelf 클래스 작성**

```ts
// src/game/objects/Bookshelf.ts
import Phaser from 'phaser'
import type { GenreInventory } from '../../lib/types'

// 장르별 색상 (hex number)
const GENRE_COLORS: Record<string, number> = {
  '소설':   0xe74c3c,
  '철학':   0x3498db,
  '경제':   0x2ecc71,
  '판타지': 0x9b59b6,
  '인문학': 0xe67e22,
  'SF':     0x1abc9c,
  '역사':   0xf39c12,
  '에세이': 0xec407a,
  '자기계발': 0x26c6da,
  '로맨스': 0xff80ab,
}
const DEFAULT_BOOK_COLOR = 0x95a5a6

export const SHELF_WIDTH   = 52
export const SHELF_HEIGHT  = 90
export const SLOTS_PER_ROW = 5
export const SHELF_ROWS    = 3

interface BookshelfConfig {
  scene: Phaser.Scene
  x: number
  y: number         // 바닥 기준 y (아래에서 위로 그림)
  level: number
  genres: string[]  // 이 책장에 진열된 장르 순서대로
}

export class Bookshelf {
  private container: Phaser.GameObjects.Container
  private scene: Phaser.Scene
  public readonly level: number

  constructor(config: BookshelfConfig) {
    const { scene, x, y, level, genres } = config
    this.scene = scene
    this.level = level

    const graphics = scene.add.graphics()
    // 책장 외곽
    graphics.fillStyle(0x3d2b1a)
    graphics.fillRect(0, -SHELF_HEIGHT, SHELF_WIDTH, SHELF_HEIGHT)
    graphics.lineStyle(2, 0x6b4f3a)
    graphics.strokeRect(0, -SHELF_HEIGHT, SHELF_WIDTH, SHELF_HEIGHT)

    // 책 슬롯
    this.drawBooks(graphics, genres)

    this.container = scene.add.container(x, y, [graphics])
  }

  private drawBooks(graphics: Phaser.GameObjects.Graphics, genres: string[]) {
    const slotW = (SHELF_WIDTH - 6) / SLOTS_PER_ROW
    const rowH  = (SHELF_HEIGHT - 6) / ROWS

    genres.slice(0, SLOTS_PER_ROW * ROWS).forEach((genre, i) => {
      const row = Math.floor(i / SLOTS_PER_ROW)
      const col = i % SLOTS_PER_ROW
      const bx = 3 + col * slotW
      const by = -SHELF_HEIGHT + 3 + row * rowH

      const color = genre
        ? (GENRE_COLORS[genre] ?? DEFAULT_BOOK_COLOR)
        : 0x1a1a2e

      graphics.fillStyle(color, genre ? 1 : 0.3)
      graphics.fillRect(bx, by, slotW - 1, rowH - 2)
    })
  }

  destroy() {
    this.container.destroy()
  }
}
```

- [ ] **Step 2: MainScene에 Bookshelf 통합**

```ts
// src/game/scenes/MainScene.ts 상단에 추가
import { Bookshelf, SLOTS_PER_ROW, SHELF_ROWS } from '../objects/Bookshelf'
import { generateCustomer, pickWantedGenre } from '../systems/CustomerAI'
import type { GenreInventory } from '../../lib/types'
```

`create()` 안에 추가:

```ts
// MainScene.create() 내부에 추가
private bookshelves: Bookshelf[] = []

// create() 마지막에 추가:
this.placeBookshelves({ '소설': 5, '철학': 3, '판타지': 2 }, 1)
```

`create()` 아래 메서드 추가:

```ts
placeBookshelves(inventory: GenreInventory, storeLevel: number) {
  this.bookshelves.forEach(b => b.destroy())
  this.bookshelves = []

  const floorY = this.cameras.main.height * FLOOR_Y_RATIO
  const genreList = Object.entries(inventory)
    .flatMap(([genre, count]) => Array(Math.min(count, 5)).fill(genre))

  for (let i = 0; i < storeLevel; i++) {
    const x = 16 + i * 64
    const genres = genreList.slice(i * SLOTS_PER_ROW * SHELF_ROWS, (i + 1) * SLOTS_PER_ROW * SHELF_ROWS)
    this.bookshelves.push(new Bookshelf({
      scene: this,
      x,
      y: floorY,
      level: i + 1,
      genres: Array(SLOTS_PER_ROW * SHELF_ROWS).fill(null).map((_, j) => genres[j] ?? ''),
    }))
  }
}
```

- [ ] **Step 3: 브라우저에서 확인**

```bash
npm run dev
```

- 서점 씬에 책장 1개 표시
- 장르별로 다른 색상의 책이 꽂혀있는지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/game/objects/Bookshelf.ts src/game/scenes/MainScene.ts
git commit -m "Bookshelf 오브젝트: 장르별 색상 책, 레벨별 배치"
```

---

## Task 11: Customer 게임 오브젝트

**Files:**
- Create: `src/game/objects/Customer.ts`
- Modify: `src/game/scenes/MainScene.ts`

- [ ] **Step 1: NPC 애니메이션 등록 (PreloadScene에 추가)**

```ts
// src/game/scenes/PreloadScene.ts create() 안에 추가
// (MainScene.create()에서 호출하기 전에 애니메이션 등록)
```

애니메이션은 MainScene.create()에서 등록:

```ts
// MainScene.create() 안에 추가
this.anims.create({
  key: 'npc_walk_right',
  frames: this.anims.generateFrameNumbers(ASSETS.NPC_01, { start: 0, end: 2 }),
  frameRate: 6,
  repeat: -1,
})
this.anims.create({
  key: 'npc_walk_left',
  frames: this.anims.generateFrameNumbers(ASSETS.NPC_01, { start: 3, end: 5 }),
  frameRate: 6,
  repeat: -1,
})
```

- [ ] **Step 2: Customer 클래스 작성**

```ts
// src/game/objects/Customer.ts
import Phaser from 'phaser'
import { ASSETS } from '../assets'

export type CustomerState = 'entering' | 'browsing' | 'leaving'

interface CustomerConfig {
  scene: Phaser.Scene
  x: number
  y: number
  targetX: number   // 탐색할 책장 x
  onReachTarget: (customer: Customer) => void
  onExit: (customer: Customer) => void
}

export class Customer {
  private sprite: Phaser.Physics.Arcade.Sprite
  private state: CustomerState = 'entering'
  private config: CustomerConfig
  private speed = 60

  constructor(config: CustomerConfig) {
    this.config = config
    const { scene, x, y } = config

    this.sprite = scene.physics.add.sprite(x, y, ASSETS.NPC_01)
    this.sprite.setScale(1.5)
    this.sprite.play('npc_walk_left')

    scene.physics.moveTo(this.sprite, config.targetX, y, this.speed)
  }

  update() {
    const { sprite, config, state } = this

    if (state === 'entering') {
      if (Math.abs(sprite.x - config.targetX) < 8) {
        (sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0)
        sprite.anims.stop()
        this.state = 'browsing'
        config.onReachTarget(this)
      }
    }

    if (state === 'leaving') {
      if (sprite.x > this.config.scene.cameras.main.width + 32) {
        config.onExit(this)
      }
    }
  }

  leave() {
    this.state = 'leaving'
    this.sprite.play('npc_walk_right');
    (this.sprite.body as Phaser.Physics.Arcade.Body).setVelocityX(this.speed)
  }

  destroy() {
    this.sprite.destroy()
  }
}
```

- [ ] **Step 3: MainScene에 물리 엔진 활성화**

```ts
// src/game/config.ts에 physics 추가
physics: {
  default: 'arcade',
  arcade: { debug: false },
},
```

- [ ] **Step 4: MainScene에 Customer 스폰 로직 추가**

```ts
// MainScene 클래스 내부에 추가
private customers: Customer[] = []
private spawnTimer!: Phaser.Time.TimerEvent
private currentReputation = 0

// create() 안에 추가
this.spawnTimer = this.time.addEvent({
  delay: 5000,
  callback: this.spawnCustomer,
  callbackScope: this,
  loop: true,
})
```

메서드 추가:

```ts
private spawnCustomer() {
  const { width, height } = this.cameras.main
  const floorY = height * FLOOR_Y_RATIO - 24
  const targetX = 20 + Math.floor(Math.random() * this.bookshelves.length) * 64

  // CustomerAI로 손님 유형과 원하는 장르 결정
  const profile = generateCustomer({
    storeLevel: this.bookshelves.length,
    reputation: this.currentReputation,
  })
  const wantedGenre = pickWantedGenre(profile.type, this.currentInventory)

  const customer = new Customer({
    scene: this,
    x: width + 16,
    y: floorY,
    targetX,
    onReachTarget: (c) => {
      this.time.delayedCall(2000, () => {
        this.game.events.emit('customer-resolved', {
          wantedGenre: wantedGenre ?? '',
          customerType: profile.type,
        })
        c.leave()
      })
    },
    onExit: (c) => {
      this.customers = this.customers.filter(x => x !== c)
      c.destroy()
    },
  })
  this.customers.push(customer)
}

update() {
  this.customers.forEach(c => c.update())
}
```

- [ ] **Step 5: 브라우저에서 확인**

```bash
npm run dev
```

- 5초마다 오른쪽에서 NPC 등장, 책장 앞까지 걷다가 멈춘 뒤 퇴장 확인

- [ ] **Step 6: 커밋**

```bash
git add src/game/objects/Customer.ts src/game/scenes/MainScene.ts src/game/config.ts
git commit -m "Customer 오브젝트: NPC 스폰, 걷기 애니메이션, 책장 탐색 후 퇴장"
```

---

## Task 12: UIScene (HUD)

**Files:**
- Modify: `src/game/scenes/UIScene.ts`

- [ ] **Step 1: UIScene 구현**

```ts
// src/game/scenes/UIScene.ts
import Phaser from 'phaser'

interface StoreStats {
  gold: number
  reputation: number
  stock: number
}

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text
  private repText!: Phaser.GameObjects.Text
  private stockText!: Phaser.GameObjects.Text

  constructor() { super({ key: 'UIScene', active: false }) }

  create() {
    const style = { fontSize: '11px', color: '#FFD700', fontFamily: 'Courier New' }

    this.goldText  = this.add.text(8,  6, '💰 0 G', style)
    this.repText   = this.add.text(100, 6, '⭐ 0',  style)
    this.stockText = this.add.text(170, 6, '📚 0',  style)

    // 배경 바
    const bg = this.add.rectangle(0, 0, this.cameras.main.width, 22, 0x000000, 0.6)
    bg.setOrigin(0, 0)
    this.children.sendToBack(bg)

    // MainScene에서 stats 업데이트 이벤트 수신
    this.game.events.on('stats-updated', (stats: StoreStats) => {
      this.goldText.setText(`💰 ${stats.gold} G`)
      this.repText.setText(`⭐ ${stats.reputation}`)
      this.stockText.setText(`📚 ${stats.stock}`)
    })
  }
}
```

- [ ] **Step 2: MainScene에서 stats 이벤트 발행**

`MainScene.create()` 안에 추가:

```ts
// 초기 stats 표시 (임시 값, Task 13에서 Supabase 연동)
this.game.events.emit('stats-updated', { gold: 0, reputation: 0, stock: 0 })
```

- [ ] **Step 3: 브라우저에서 확인**

- 게임 화면 상단에 💰 ⭐ 📚 HUD 표시 확인

- [ ] **Step 4: 커밋**

```bash
git add src/game/scenes/UIScene.ts src/game/scenes/MainScene.ts
git commit -m "UIScene: HUD (골드, 평판, 재고) 표시"
```

---

## Task 13: Supabase 연동 (게임 데이터 로드)

**Files:**
- Modify: `src/pages/StorePage.tsx`
- Modify: `src/game/scenes/MainScene.ts`

- [ ] **Step 1: 인증 상태 확인 (StorePage)**

```tsx
// src/pages/StorePage.tsx
import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { GameCanvas } from '../components/GameCanvas'
import { supabase } from '../lib/supabase/client'
import { getProfile, getGenreInventory, updateProfile } from '../lib/supabase/store'
import { calculateOfflineEarnings } from '../game/systems/IdleLoop'
import type { UserProfile, GenreInventory } from '../lib/types'

export function StorePage() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [inventory, setInventory] = useState<GenreInventory>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [prof, inv] = await Promise.all([
        getProfile(user.id),
        getGenreInventory(user.id),
      ])
      if (!prof) return

      // 오프라인 수익 계산
      const totalStock = Object.values(inv).reduce((a, b) => a + b, 0)
      const earned = calculateOfflineEarnings({
        lastOnlineAt: new Date(prof.last_online_at),
        totalStock,
        storeLevel: prof.store_level,
      })

      const newGold = prof.gold + earned
      await updateProfile(user.id, {
        gold: newGold,
        last_online_at: new Date().toISOString(),
      })

      setProfile({ ...prof, gold: newGold })
      setInventory(inv)
    }
    init()
  }, [])

  // 게임 준비 후 데이터 전달
  useEffect(() => {
    if (!gameRef.current || !profile) return
    const game = gameRef.current
    const totalStock = Object.values(inventory).reduce((a, b) => a + b, 0)

    game.events.emit('stats-updated', {
      gold: profile.gold,
      reputation: profile.store_reputation,
      stock: totalStock,
    })
    game.events.emit('inventory-updated', { inventory, storeLevel: profile.store_level })
  }, [profile, inventory, gameRef.current])

  return (
    <div className="flex flex-col h-full">
      <GameCanvas onGameReady={g => { gameRef.current = g }} />
      {!profile && (
        <p className="p-3 text-xs opacity-50" style={{ color: 'var(--color-text)' }}>
          로그인이 필요합니다
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: MainScene에서 inventory-updated 이벤트 수신**

`MainScene.create()` 안에 추가:

```ts
this.game.events.on(
  'inventory-updated',
  ({ inventory, storeLevel }: { inventory: GenreInventory; storeLevel: number }) => {
    this.placeBookshelves(inventory, storeLevel)
  }
)
```

- [ ] **Step 3: 브라우저에서 확인**

```bash
npm run dev
```

- Supabase에 로그인된 유저가 있으면 HUD에 실제 골드·평판 표시 확인
- 로그인 없으면 "로그인이 필요합니다" 메시지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/pages/StorePage.tsx src/game/scenes/MainScene.ts
git commit -m "Supabase 연동: 프로필 로드, 오프라인 수익 계산, 인벤토리 반영"
```

---

## Task 14: 손님 보상 연동

**Files:**
- Modify: `src/game/scenes/MainScene.ts`
- Modify: `src/pages/StorePage.tsx`

- [ ] **Step 1: MainScene에 보상 이벤트 발행 추가**

`spawnCustomer()` 내 `onReachTarget` 수정:

```ts
onReachTarget: (c) => {
  // 이 손님의 원하는 장르 계산 (임시: 랜덤 장르)
  const genres = Object.keys(this.currentInventory ?? {})
  const wantedGenre = genres[Math.floor(Math.random() * genres.length)] ?? ''

  this.time.delayedCall(2000, () => {
    // 보상 계산 후 이벤트 발행
    this.game.events.emit('customer-resolved', { wantedGenre })
    c.leave()
  })
},
```

`MainScene`에 필드 추가:
```ts
private currentInventory: GenreInventory = {}
```

`create()` 안에 추가:
```ts
this.game.events.on(
  'inventory-updated',
  ({ inventory, storeLevel }: { inventory: GenreInventory; storeLevel: number }) => {
    this.currentInventory = inventory
    this.placeBookshelves(inventory, storeLevel)
  }
)
```

- [ ] **Step 2: StorePage에서 customer-resolved 처리**

`StorePage` `useEffect` 안에 추가 (게임 준비 후):

```ts
game.events.on('customer-resolved', async ({ wantedGenre, customerType }: { wantedGenre: string; customerType: CustomerType }) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !profile) return

  const { calculateVisitReward } = await import('../game/systems/RewardSystem')
  const reward = calculateVisitReward({
    wantedGenre,
    inventory,
    customerType,
  })

  const newGold = profile.gold + reward.gold
  const newRep  = profile.store_reputation + reward.reputation
  await updateProfile(user.id, { gold: newGold, store_reputation: newRep })

  setProfile(p => p ? { ...p, gold: newGold, store_reputation: newRep } : p)
  game.events.emit('stats-updated', {
    gold: newGold,
    reputation: newRep,
    stock: Object.values(inventory).reduce((a, b) => a + b, 0),
  })
})
```

- [ ] **Step 3: 브라우저에서 확인**

- 손님이 책장에 도달하면 HUD 골드가 증가하는지 확인

- [ ] **Step 4: 커밋**

```bash
git add src/game/scenes/MainScene.ts src/pages/StorePage.tsx
git commit -m "손님 보상 연동: 방문 시 골드·평판 Supabase 반영"
```

---

## Task 15: 로그인 페이지

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: LoginPage 작성**

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react'
import { supabase } from '../lib/supabase/client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })

    const { error } = await fn
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <h1 className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
        📚 BOOKHIVE
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="p-2 rounded text-sm"
          style={{ background: 'var(--color-wall)', color: 'var(--color-text)', border: '1px solid var(--color-shelf)' }}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="p-2 rounded text-sm"
          style={{ background: 'var(--color-wall)', color: 'var(--color-text)', border: '1px solid var(--color-shelf)' }}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="p-2 rounded text-sm font-bold"
          style={{ background: 'var(--color-accent)', color: '#000' }}
        >
          {loading ? '...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      <button
        onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
        className="text-xs opacity-50"
        style={{ color: 'var(--color-text)' }}
      >
        {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: App.tsx에 인증 상태 확인 추가**

```tsx
// src/App.tsx
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase/client'
import { StorePage } from './pages/StorePage'
import { SettingsPage } from './pages/SettingsPage'
import { LoginPage } from './pages/LoginPage'
import type { User } from '@supabase/supabase-js'
import './index.css'

type Tab = 'store' | 'settings'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<Tab>('store')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (!user) return <LoginPage />

  return (
    <div
      className="flex flex-col h-screen max-w-lg mx-auto"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="flex-1 overflow-auto">
        {tab === 'store'    && <StorePage />}
        {tab === 'settings' && <SettingsPage />}
      </div>
      <nav
        className="flex border-t text-xs"
        style={{ borderColor: 'var(--color-shelf)' }}
      >
        {([['store', '🏪', '서점'], ['settings', '⚙️', '설정']] as const).map(
          ([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-3 flex flex-col items-center gap-1"
              style={{ color: tab === id ? 'var(--color-accent)' : 'var(--color-text)', opacity: tab === id ? 1 : 0.5 }}
            >
              <span className="text-lg">{icon}</span>
              <span>{label}</span>
            </button>
          )
        )}
      </nav>
    </div>
  )
}
```

- [ ] **Step 3: 브라우저에서 확인**

```bash
npm run dev
```

- 미로그인 시 로그인/회원가입 화면 표시
- 로그인 성공 시 서점 화면으로 전환 확인

- [ ] **Step 4: 커밋**

```bash
git add src/pages/LoginPage.tsx src/App.tsx
git commit -m "로그인/회원가입 페이지 추가"
```

---

## Task 17: Vercel 배포

**Files:**
- Create: `vercel.json`
- Create: `.env.local` (Vercel 환경 변수 설정)

- [ ] **Step 1: vercel.json 생성**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 2: 프로덕션 빌드 확인**

```bash
npm run build
```

Expected: `dist/` 폴더 생성, 오류 없음

- [ ] **Step 3: Vercel CLI로 배포**

```bash
npx vercel --prod
```

프롬프트:
- Set up and deploy: `Y`
- Which scope: 본인 계정 선택
- Link to existing project: `N` (신규)
- Project name: `bookhive`
- Directory: `./` (기본값)
- Override settings: `N`

- [ ] **Step 4: Vercel 대시보드에서 환경 변수 추가**

Vercel 대시보드 → bookhive 프로젝트 → Settings → Environment Variables:

```
VITE_SUPABASE_URL     = https://hbsunejenfjgiwfokena.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_cd9v7fJ5G-HCqwPndilvJw_NFpUDzNo
```

- [ ] **Step 5: 재배포**

```bash
npx vercel --prod
```

- [ ] **Step 6: 배포 URL에서 동작 확인**

- 게임 화면 정상 표시
- 테마 변경 동작
- 손님 등장 및 HUD 업데이트

- [ ] **Step 7: .superpowers/ gitignore 추가**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 8: 최종 커밋**

```bash
git add vercel.json .gitignore
git commit -m "Vercel 배포 설정"
```

---

## 완료 체크리스트

- [ ] `npx vitest run` — 전체 단위 테스트 통과
- [ ] `npm run build` — 빌드 오류 없음
- [ ] 브라우저에서 손님 등장 → 책장 탐색 → 골드 증가 확인
- [ ] 테마 변경 시 게임 화면 + UI 색상 동시 변경 확인
- [ ] Vercel 배포 URL에서 전체 동작 확인
