# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (일반 개발)
vercel dev           # Start API routes server on :3000 (ISBN 검색 등 API 테스트 시 npm run dev와 함께 실행)
npm run build        # Type-check + production build (output: /dist)
npm run preview      # Preview production build
npm test             # Run Vitest once
npm run test:watch   # Run Vitest in watch mode
npm run lint         # ESLint
```

To run a single test file:
```bash
npx vitest run tests/CustomerAI.test.ts
```

## Environment Variables

Create a `.env.local` file at the project root:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
KAKAO_BOOK_API_KEY=...
```

Supabase migrations are documented in `/docs/migrations.md`.

## Architecture

This is a **reading gamification web-game**: a user's reading history becomes bookstore inventory, which attracts NPC customers who pay gold and reputation.

### Layer Model

Three distinct layers communicate via Phaser's event bus (`game.events.emit/on`):

1. **React layer** (`src/pages/`, `src/components/`) — Auth, page navigation, Supabase reads/writes
2. **Phaser layer** (`src/game/`) — Visual game rendering and real-time simulation
3. **Supabase layer** (`src/lib/supabase/`) — Persistent state (profiles, inventory, store items)

### Application Flow

```
LoginPage (auth) → StorePage (mounts GameCanvas, loads profile, calculates offline earnings)
                         ↓
                   GameCanvas → Phaser: BootScene → PreloadScene → MainScene + UIScene
                                                                         ↓
                                           CustomerAI spawns every 5s → Customer walks to Bookshelf
                                           customer-resolved event → RewardSystem calculates gold/rep
                                           → StorePage updates Supabase → UIScene re-renders HUD
```

### Key Directories

| Path | Purpose |
|------|---------|
| `src/game/scenes/` | Phaser scene lifecycle (Boot → Preload → Main + UI) |
| `src/game/objects/` | Phaser `GameObject` subclasses: `Bookshelf`, `Customer` |
| `src/game/systems/` | Pure game logic: `CustomerAI`, `RewardSystem`, `IdleLoop` |
| `src/lib/supabase/` | Supabase client + query functions |
| `src/lib/types.ts` | Shared TypeScript interfaces (UserProfile, Content, ReadingRecord, etc.) |
| `tests/` | Vitest tests for game systems (jsdom environment) |
| `docs/` | Design documents and SQL migrations |

### Supabase Database Tables

- `user_profiles` — gold, reputation, level, themes, `last_online_at`
- `contents` — books/web novels with genre metadata
- `reading_records` — reading status per user per content (partial reads count)
- `store_items` — purchased decorations (sofas, plants, lamps, rugs)

Genre inventory (used to determine which bookshelves have stock) is derived by querying `reading_records` joined with `contents`.

### Game Systems

- **CustomerAI** — Generates customers with genre preferences based on type (student / worker / webnovel / collector); spawned every 5 seconds in MainScene
- **RewardSystem** — Calculates gold/reputation for a visit based on inventory availability
- **IdleLoop** — Calculates offline earnings from `last_online_at` to now, capped by stock level

### Testing

Tests cover the three game systems (`CustomerAI`, `RewardSystem`, `IdleLoop`). The test environment is `jsdom` (configured in `vite.config.ts`). Phaser is not initialized in tests — systems are tested as plain TypeScript modules.

## Documentation

### 커밋 전 문서 점검
커밋을 요청받으면 실제 커밋 전에 아래 두 파일의 갱신 필요 여부를 먼저 확인하고 사용자에게 알린다.
사용자가 반영을 요청할 경우에만 문서를 수정한 뒤 커밋을 진행한다.

- **`docs/domains/`** — DB 스키마 또는 비즈니스 규칙이 변경된 경우 (테이블 추가·컬럼 변경·규칙 변경)
- **`docs/migrations.md`** — 테이블 생성·컬럼 추가·기본값 변경 등 DDL 변경이 있는 경우

## Deployment

Deployed on Vercel. `vercel.json` rewrites all routes to `/` for SPA support. TypeScript strict mode is enabled (`tsconfig.app.json`); the build will fail on unused locals/parameters.
