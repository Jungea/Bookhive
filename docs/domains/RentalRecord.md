# RentalRecord 도메인

## 개요
NPC 손님이 도서관에서 책을 대여한 이력을 기록하는 도메인.
대여가 발생하면 골드·명성 보상이 계산되고, 반납 기한이 페이지 수에 따라 자동 설정된다.
`returned_at`이 NULL인 레코드가 현재 대여 중인 책을 의미한다.

## 비즈니스 규칙
- 대여는 NPC 손님이 도서관 방문 시 자동으로 생성된다. 사용자가 직접 생성하지 않는다.
- 대여 중인 책(`returned_at = NULL`)은 도서관 진열에서 빈 자리로 표시된다.
- 반납 기한은 콘텐츠의 페이지 수를 기준으로 자동 계산된다.
- 손님 유형(`customer_type`)에 따라 보상 금액이 달라진다.

## 반납 기한 계산 기준

| 페이지 수 | 반납 기한 |
|-----------|-----------|
| 없음 | 5일 |
| ~100p | 3일 |
| ~300p | 5일 |
| ~500p | 7일 |
| 500p 초과 | 10일 |

## 테이블: `rental_records`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 대여 이력 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 도서관 소유자 ID |
| `content_id` | `uuid` | NOT NULL, FK → `contents` | — | 대여된 콘텐츠 ID |
| `reading_record_id` | `uuid` | FK → `reading_records` | NULL | 연결된 독서 기록 ID |
| `rented_at` | `timestamptz` | NOT NULL | `now()` | 대여 시각 |
| `return_due_at` | `timestamptz` | NOT NULL | — | 반납 기한 |
| `returned_at` | `timestamptz` | — | NULL | 실제 반납 시각. NULL이면 대여 중 |
| `customer_type` | `text` | NOT NULL | — | 손님 유형 (`student` / `worker` / `webnovel` / `collector`) |

## 관계
- `auth.users` ← N:1 (user_id)
- `contents` ← N:1 (content_id)
- `reading_records` ← N:1 (reading_record_id)
