# Bookhive

독서 이력이 도서관이 되는 타이쿤 게임 서비스.
읽은 책이 재고가 되고, 손님이 찾아오며, 도서관이 성장한다.

## 기술 스택

| 역할 | 기술 |
|------|------|
| UI / 상태 관리 | React 19 + TypeScript |
| 게임 렌더링 | Phaser 3 |
| 스타일링 | Tailwind CSS 4 |
| 백엔드 / DB | Supabase (PostgreSQL + Auth) |
| 빌드 | Vite |
| 테스트 | Vitest |
| 배포 | Vercel |

## 아키텍처

```
React (상태·UI)
  └─ StorePage: 프로필 로드, 오프라인 수익 계산, Supabase 업데이트
       └─ GameCanvas: Phaser 초기화
            └─ BootScene → PreloadScene → MainScene + UIScene
                                               │
                                         game.events (이벤트 버스)
                                               │
                                         inventory-updated / customer-resolved
```

- **React ↔ Phaser** 간 통신은 `game.events.emit/on` 이벤트 버스로만 처리
- **비즈니스 로직**은 React 중심, Phaser는 렌더링만 담당
- **게임 시스템** (`CustomerAI`, `RewardSystem`, `IdleLoop`)은 Phaser에 의존하지 않는 순수 TypeScript 모듈

## 로컬 실행

**사전 조건:** Node.js, Supabase 프로젝트

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 에 Supabase URL, anon key, Kakao API 키 입력

# 3. 개발 서버 실행
npm run dev

# API 기능(ISBN 검색 등) 테스트 시 별도 터미널에서 추가 실행 (Vercel CLI 필요: npm i -g vercel)
vercel dev
```

## Supabase 설정

Supabase 대시보드 → SQL Editor에서 `docs/migrations.md`의 SQL을 순서대로 실행한다.

필요한 테이블:

| 테이블 | 설명 |
|--------|------|
| `user_profiles` | 골드, 평판, 레벨, 테마, `last_online_at` |
| `contents` | 책/웹소설 메타데이터 (장르 포함) |
| `reading_records` | 유저별 독서 상태 (부분 읽기 포함) |
| `store_items` | 구매한 가구 (소파, 화분, 램프, 러그) |

장르 재고는 `reading_records` + `contents` 조인으로 도출한다.

## 주요 명령어

```bash
npm run dev          # 개발 서버
vercel dev           # API 라우트 서버 (ISBN 검색 등 API 테스트 시 함께 실행)
npm run build        # 타입 체크 + 프로덕션 빌드
npm run preview      # 빌드 결과 로컬 미리보기
npm test             # 테스트 1회 실행
npm run test:watch   # 테스트 watch 모드
npm run lint         # ESLint
```

단일 테스트 파일 실행:

```bash
npx vitest run tests/CustomerAI.test.ts
```

## 게임 루프

1. 로그인 → 유저 프로필 + 장르 재고 로드
2. `last_online_at` 기준 오프라인 수익 계산 후 Supabase 반영
3. MainScene에서 5초마다 손님 스폰 (`CustomerAI`)
4. 손님이 책장으로 이동 → 2초 대기 → `customer-resolved` 이벤트 발생
5. `RewardSystem`이 재고 보유 여부에 따라 골드/평판 계산
6. StorePage가 Supabase 업데이트 → UIScene HUD 갱신

## 개발 로드맵

- [x] Phaser 씬 구축 (배경, 책장, 손님)
- [x] Supabase 연동 (프로필, 재고, 오프라인 수익)
- [x] 손님 보상 시스템 (골드, 평판)
- [ ] 독서 이력 CRUD
- [ ] 대여 시스템
- [ ] 손님 퀘스트
- [ ] 반납 이벤트 (연체, 훼손, 메모)
- [ ] 웹소설 열람석
- [ ] 단골 시스템
- [ ] 도서관 확장
