# Bookhive 서점 타이쿤 설계 문서

**날짜:** 2026-05-16  
**범위:** MVP — 서점 타이쿤 게임 (독서기록·창작 기능은 이후 단계)

---

## 1. 서비스 개요

> "읽고, 기록하고, 운영하는 나만의 서점"

사용자가 읽은 책이 서점 재고가 되고, 손님을 맞이하며 서점을 키우는 타이쿤 게임.  
독서 기록 관리 + 서점 타이쿤 + 창작 공간이 하나의 앱에 통합된다.

---

## 2. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Vite + React + TypeScript |
| 게임 엔진 | Phaser.js 3 |
| 모바일 배포 | Capacitor (Android/iOS) |
| 백엔드 | Supabase (PostgreSQL + Auth + Storage) |
| 웹 배포 | Vercel (정적 SPA) |
| 스타일 | Tailwind CSS + CSS Custom Properties |
| UI 컴포넌트 | shadcn/ui (@base-ui/react 기반, PageRoom에서 포팅) |

**선택 이유:**
- Phaser.js: 픽셀아트 2D 타이쿤에 검증된 엔진, 아이들+액티브 하이브리드 게임 루프 지원
- Vite: SSR 불필요한 게임 앱에 최적, Next.js 대비 가볍고 Phaser와 궁합이 좋음
- Capacitor: 동일 코드베이스로 웹(Vercel) + 모바일(Play Store) 동시 배포
- Supabase: PageRoom 기존 스키마·인증 재사용, 무료 티어로 서비스 운영

---

## 3. 프로젝트 구조

```
Bookhive/
├── src/
│   ├── game/                  # Phaser.js 타이쿤 게임
│   │   ├── scenes/
│   │   │   ├── BootScene.ts   # 에셋 초기 로딩
│   │   │   ├── PreloadScene.ts
│   │   │   ├── MainScene.ts   # 메인 게임 화면 (사이드뷰 서점)
│   │   │   └── UIScene.ts     # HUD 오버레이 (골드, 평판, 재고)
│   │   ├── objects/
│   │   │   ├── Bookshelf.ts   # 책장 오브젝트 (레벨, 책 슬롯)
│   │   │   ├── Customer.ts    # 손님 캐릭터 (AI, 애니메이션)
│   │   │   └── Counter.ts     # 카운터 오브젝트
│   │   └── systems/
│   │       ├── IdleLoop.ts    # 오프라인 수익 계산
│   │       ├── CustomerAI.ts  # 손님 행동 패턴
│   │       └── RewardSystem.ts # 골드·평판 지급
│   ├── app/                   # React 앱 (게임 외 화면)
│   │   ├── library/           # 독서 기록 (PageRoom 포팅)
│   │   ├── reviews/           # 독후감 (PageRoom 포팅)
│   │   └── settings/          # 테마 변경, 프로필
│   ├── components/            # 공용 UI 컴포넌트 (PageRoom shadcn 포팅)
│   ├── lib/
│   │   ├── supabase/          # Supabase 클라이언트 + 쿼리 함수
│   │   └── theme/             # 테마 토큰 정의 및 적용 로직
│   └── main.tsx
├── public/
│   └── assets/                # PageRoom에서 가져온 픽셀아트 에셋
│       ├── book_shop_floor_walls_32x32.png
│       ├── book_shop_props_32x32.png
│       ├── npc01_spritesheet.png
│       └── 48x48 Base Spritesheet.png
├── capacitor.config.ts
└── vite.config.ts
```

---

## 4. 화면 구성

```
하단 탭 네비게이션
├── 🏪 서점      → Phaser.js 게임 캔버스 (MVP 핵심)
├── 📚 독서기록  → React 페이지 (Phase 2)
└── ⚙️ 설정      → 테마 변경, 프로필
```

게임 캔버스는 React 컴포넌트(`<GameCanvas />`) 안에서 Phaser 인스턴스를 마운트한다.  
독서기록 데이터는 Supabase에서 직접 조회하여 게임 재고에 반영된다.

---

## 5. 게임 메커니즘

### 5.1 핵심 루프

```
책 읽기 (독서기록 입력)
  → 장르별 서점 재고 증가
    → 원하는 장르의 손님 방문
      → 만족한 손님 → 골드 + 평판 획득
        → 골드로 책장 확장 / 인테리어 구매
          → 더 많은 손님 방문
```

### 5.2 게임 뷰

- **사이드뷰:** 한쪽 방향을 바라보는 2D 픽셀아트
- 배경에 책장이 늘어서 있고, 손님 캐릭터가 좌우로 이동
- 아쿠아리움 타이쿤과 동일한 구도

### 5.3 책장 시스템

| 레벨 | 해제 조건 | 책장 수 | 추가 슬롯 |
|---|---|---|---|
| Lv1 | 시작 | 1개 (5칸) | — |
| Lv2 | 1,000G | 2개 | — |
| Lv3 | 5,000G | 3개 | 소파 슬롯 |
| Lv4 | 15,000G | 4개 | 조명 슬롯 |

- 책장 칸은 `reading_records (status = 'completed')`를 장르별로 집계하여 자동으로 채운다
- 장르별 색상 구분: 소설=빨강, 철학=파랑, 경제=초록, 판타지=보라 등
- 빈 칸은 점선으로 표시, 재고 부족 시 손님 실망 이벤트 발생

### 5.4 손님 시스템

| 손님 유형 | 원하는 장르 | 특이사항 |
|---|---|---|
| 대학생 | 철학/인문학 | 오래 머뭄, 독후감 남길 확률 높음 |
| 직장인 | 가벼운 소설 | 빠른 구매, 단골 전환 쉬움 |
| 웹소설 독자 | 연재 최신화 | 매일 접속 유도 |
| 희귀 수집가 | 특정 작가 전집 | 등장 시 평판 대폭 상승 |

손님 흐름: 입장 → 원하는 장르 탐색 → 있으면 구매(골드 지급) / 없으면 실망 퇴장

### 5.5 아이들 + 액티브 하이브리드

- **접속 중:** 손님 실시간 이동, 재고 직접 배치 가능
- **오프라인:** `last_online_at` 기준으로 경과 시간 × 시간당 수익 계산 (재고 없으면 0)
- **매일 접속 보너스:** 웹소설 독자 특별 등장, 골드 보너스

---

## 6. 데이터 모델

### 6.1 기존 테이블 (PageRoom에서 재사용)

```sql
reading_records  -- 읽은 책, 진행 상태 (완독 여부 → 재고 계산에 사용)
activity_logs    -- 독서 활동 로그
reviews          -- 독후감
profiles         -- 유저 프로필 (theme 컬럼 포함)
```

### 6.2 신규 추가 테이블

```sql
-- 서점 상태
CREATE TABLE store_state (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id),
  gold             integer NOT NULL DEFAULT 0,
  reputation       integer NOT NULL DEFAULT 0,
  bookshelf_count  integer NOT NULL DEFAULT 1,
  last_online_at   timestamptz NOT NULL DEFAULT now()
);

-- 해제된 인테리어 아이템
CREATE TABLE store_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id),
  item_type      text NOT NULL, -- 'sofa' | 'plant' | 'lamp' | ...
  slot_position  integer NOT NULL,
  purchased_at   timestamptz NOT NULL DEFAULT now()
);
```

### 6.3 재고 계산 방식

별도 재고 테이블 없이, 게임 실행 시 `reading_records`를 장르별로 집계하여 실시간 계산한다.

```ts
// contents.genre는 text[] 배열이므로 완독 목록을 가져와서 클라이언트에서 집계
const { data } = await supabase
  .from('reading_records')
  .select('contents(genre)')
  .eq('status', 'completed')
  .eq('user_id', userId)

// genre 배열을 펼쳐서 장르별 카운트 계산
const inventory = data
  .flatMap(r => r.contents.genre)
  .reduce((acc, genre) => {
    acc[genre] = (acc[genre] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
```

독서 이력과 게임 재고가 항상 동기화되며, 별도 동기화 로직 불필요.

---

## 7. 테마 시스템

### 7.1 구조

CSS 커스텀 프로퍼티로 전체 앱과 게임 팔레트를 관리한다.

```css
[data-theme="dark-library"] {   /* 기본, 무료 */
  --color-bg:      #0f0f1a;
  --color-wall:    #2a2240;
  --color-floor:   #3d2b1a;
  --color-shelf:   #5c3d1e;
  --color-accent:  #FFD700;
}

[data-theme="cozy-cafe"] {      /* 프리미엄 */
  --color-bg:      #fdf6ec;
  --color-wall:    #d4a373;
  --color-floor:   #8d6e63;
  --color-shelf:   #5d4037;
  --color-accent:  #ff8f00;
}
```

### 7.2 Phaser 연동

Phaser는 CSS 변수를 직접 읽지 못하므로, 테마 변경 시 팔레트를 읽어서 이벤트로 전달한다.

```ts
function applyTheme(themeName: string) {
  document.documentElement.setAttribute('data-theme', themeName)
  const style = getComputedStyle(document.documentElement)
  const palette = {
    wall:  style.getPropertyValue('--color-wall').trim(),
    floor: style.getPropertyValue('--color-floor').trim(),
    shelf: style.getPropertyValue('--color-shelf').trim(),
  }
  phaserGame.events.emit('theme-changed', palette)
}
```

### 7.3 비즈니스 모델

| 티어 | 내용 | 가격 |
|---|---|---|
| 무료 | Dark Library 테마 1개 | 무료 |
| 단품 | 테마 1개 | ₩1,900 |
| 연간 패스 | 전체 테마 무제한 | ₩9,900/년 |

테마 구매 여부는 `profiles` 테이블에 `purchased_themes text[] DEFAULT '{}'` 컬럼을 추가하여 관리.  
결제 시스템은 MVP 이후 단계에서 연동. MVP에서는 컬럼만 준비해두고 수동 지급으로 테스트.

---

## 8. PageRoom 마이그레이션

| 항목 | 처리 방식 |
|---|---|
| Supabase DB 스키마 | 그대로 재사용 |
| React UI 컴포넌트 (shadcn) | `src/components/`로 복사 |
| TypeScript 타입 정의 | `src/lib/types.ts`로 복사 |
| Supabase 인증 흐름 | 클라이언트 코드 그대로 포팅 |
| Server Actions | Supabase 클라이언트 직접 호출로 전환 |
| Next.js 라우팅 | React Router로 대체 |
| 테마 시스템 로직 | `src/lib/theme/`으로 이동 |

---

## 9. 에셋 목록

PageRoom `/public/assets/`에서 그대로 사용:

| 파일 | 용도 |
|---|---|
| `book_shop_floor_walls_32x32.png` | 바닥·벽 타일맵 |
| `book_shop_props_32x32.png` | 책장·소파·식물·카운터 스프라이트 |
| `npc01_spritesheet.png` | 손님 캐릭터 걷기 애니메이션 |
| `48x48 Base Spritesheet.png` | 추가 캐릭터 스프라이트 |

추가로 필요한 에셋 (MVP 이후):
- 손님 유형별 캐릭터 (대학생, 직장인, 수집가)
- 책장 업그레이드 단계별 스프라이트
- 테마별 배경·바닥 타일 변형

---

## 10. MVP 범위 및 단계

### Phase 1 — 타이쿤 MVP
- [ ] Vite + React + Phaser.js + Capacitor 프로젝트 셋업
- [ ] Supabase 연결 (PageRoom 스키마 재사용)
- [ ] 사이드뷰 서점 씬 구현 (에셋 적용)
- [ ] 책장 레벨 시스템
- [ ] 손님 AI (기본 4종)
- [ ] 아이들 수익 계산
- [ ] 테마 시스템 (다크 라이브러리 기본 테마)
- [ ] Vercel 웹 배포

### Phase 2 — 독서기록 연동
- [ ] 독서기록 React 화면 (PageRoom 포팅)
- [ ] 독서기록 → 서점 재고 자동 반영
- [ ] Capacitor Play Store 배포

### Phase 3 — 수익화
- [ ] 프리미엄 테마 추가
- [ ] 인앱 결제 연동
- [ ] 창작 공간 기능
