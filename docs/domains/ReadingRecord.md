# ReadingRecord 도메인

## 개요
사용자와 콘텐츠 사이의 독서 관계를 나타내는 도메인.
"읽고 싶다 → 읽는 중 → 완독"의 상태 흐름을 추적하며,
완독된 책이 도서관에 진열될 수 있는지 여부(`is_in_store`)도 관리한다.

## 비즈니스 규칙
- 한 사용자가 동일 콘텐츠에 대해 복수의 독서 기록을 가질 수 있다 (재독 허용).
- `status`가 `completed`인 경우에만 도서관 진열(`is_in_store = true`) 가능하다.
- 진열 중인 책(`is_in_store = true`)은 NPC 손님이 대여할 수 있는 재고가 된다.
- `progress_page` / `progress_episode`는 `progress_type`에 따라 둘 중 하나만 사용된다.

## 상태 흐름
```
to_read → reading → completed
```

## 테이블: `reading_records`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 기록 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 사용자 ID |
| `content_id` | `uuid` | NOT NULL, FK → `contents` | — | 콘텐츠 ID |
| `status` | `text` | NOT NULL | `'to_read'` | 읽기 상태 (`to_read` / `reading` / `completed`) |
| `progress_page` | `integer` | — | NULL | 현재 읽은 페이지 수 |
| `progress_episode` | `integer` | — | NULL | 현재 읽은 화수 |
| `started_at` | `timestamptz` | — | NULL | 읽기 시작 시각 |
| `completed_at` | `timestamptz` | — | NULL | 완독 시각 |
| `is_in_store` | `boolean` | NOT NULL | `false` | 도서관에 진열 중 여부 |

## 관계
- `auth.users` ← N:1 (user_id)
- `contents` ← N:1 (content_id)
- `rental_records` ← 1:N
