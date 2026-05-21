# UserProfile 도메인

## 개요
도서관 운영자(사용자)의 정체성과 성장 상태를 나타내는 도메인.
회원가입 시 생성되며, 게임 내 모든 경제 활동(골드·명성)과 레벨 성장의 중심이 된다.
`last_online_at`을 기준으로 오프라인 상태에서도 수익을 계산한다.

## 비즈니스 규칙
- 사용자 1명당 프로필은 반드시 1개만 존재한다.
- 골드는 손님이 책을 대여할 때 획득하며, 상점 아이템 구매에 사용된다.
- 명성은 도서관의 서비스 품질을 나타내며, 레벨 업 조건에 영향을 준다.
- 오프라인 수익은 `last_online_at`과 현재 시각의 차이를 기반으로 계산된다.

## 테이블: `user_profiles`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `user_id` | `uuid` | PK, FK → `auth.users` | — | Supabase Auth 사용자 ID |
| `store_name` | `text` | NOT NULL | `'나의 도서관'` | 도서관 이름 (사용자 지정) |
| `theme_id` | `text` | NOT NULL | `'default'` | 적용 중인 테마 ID |
| `store_level` | `integer` | NOT NULL | `1` | 도서관 레벨 |
| `store_reputation` | `numeric` | NOT NULL | `0` | 명성 수치 |
| `gold` | `integer` | NOT NULL | `0` | 보유 골드 |
| `custom_genres` | `text[]` | NOT NULL | `{}` | 사용자 정의 장르 목록 |
| `purchased_themes` | `text[]` | NOT NULL | `{}` | 구매한 테마 ID 목록 |
| `last_online_at` | `timestamptz` | NOT NULL | `now()` | 마지막 접속 시각 (오프라인 수익 계산용) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 계정 생성 시각 |

## 관계
- `auth.users` ← 1:1 (user_id)
