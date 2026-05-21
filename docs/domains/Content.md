# Content 도메인

## 개요
사용자가 직접 등록한 책 또는 웹소설. 독서 활동의 기본 단위이자 도서관 진열의 대상.
책(`book`)과 웹소설(`webnovel`) 두 타입을 하나의 테이블로 관리하며, 타입에 따라 사용하는 필드가 다르다.
삭제 시 독후감·이력 보존을 위해 소프트 삭제(`deleted_at`)를 사용한다.

## 비즈니스 규칙
- 콘텐츠는 사용자별로 독립 관리된다. 같은 책이라도 사용자마다 별도 레코드다.
- `cover_color`는 필수 입력값으로, 도서관 게임 화면의 책 색상 렌더링에 사용된다.
- 책은 `total_pages`·`isbn`, 웹소설은 `total_episodes`·`is_ongoing`을 주로 사용한다.
- `progress_type`은 진행도 추적 방식을 결정한다 (`pages` / `episodes` / `none`).
- `deleted_at`이 NULL이 아닌 콘텐츠는 목록·게임에서 노출되지 않지만 대여 이력은 유지된다.

## 테이블: `contents`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 콘텐츠 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 등록한 사용자 ID |
| `type` | `text` | NOT NULL | — | 콘텐츠 종류 (`book` / `webnovel`) |
| `title` | `text` | NOT NULL | — | 제목 |
| `author` | `text` | NOT NULL | `''` | 저자 |
| `cover_url` | `text` | — | NULL | 표지 이미지 URL |
| `cover_color` | `text` | — | NULL | 표지 대표 색상 (HEX, 도서관 렌더링용) |
| `genre` | `text[]` | NOT NULL | `{}` | 장르 태그 목록 |
| `isbn` | `text` | — | NULL | ISBN (책 전용) |
| `external_id` | `text` | — | NULL | 외부 API 연동 ID |
| `total_pages` | `integer` | — | NULL | 총 페이지 수 (책 전용) |
| `total_episodes` | `integer` | — | NULL | 총 화수 (웹소설 전용) |
| `is_ongoing` | `boolean` | NOT NULL | `false` | 연재 중 여부 (웹소설 전용) |
| `progress_type` | `text` | NOT NULL | `'none'` | 진행 방식 (`none` / `pages` / `episodes`) |
| `deleted_at` | `timestamptz` | — | NULL | 소프트 삭제 시각. NULL이면 정상, 값이 있으면 삭제 상태 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 등록 시각 |

## 관계
- `auth.users` ← N:1 (user_id)
- `reading_records` ← 1:N
- `reviews` ← 1:N
- `activity_logs` ← 1:N
- `rental_records` ← 1:N
