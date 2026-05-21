# Review 도메인

## 개요
사용자가 완독한 콘텐츠에 대해 작성하는 독후감 도메인.
제목·본문·별점 외에 AI가 분석한 감정·키워드·독서 깊이를 함께 저장한다.
공개 여부(`is_public`)로 타 사용자에게 노출할 수 있다.

## 비즈니스 규칙
- 독후감은 완독(`status = completed`) 여부와 무관하게 작성 가능하다.
- 한 콘텐츠에 대해 여러 독후감을 작성할 수 있다 (재독·다독 지원).
- AI 분석 필드(`ai_*`)는 독후감 저장 후 비동기로 채워지므로 NULL일 수 있다.
- `updated_at`은 수정 시 애플리케이션에서 직접 갱신한다.

## 테이블: `reviews`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 독후감 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 작성자 ID |
| `content_id` | `uuid` | NOT NULL, FK → `contents` | — | 대상 콘텐츠 ID |
| `title` | `text` | NOT NULL | `''` | 독후감 제목 |
| `body` | `text` | NOT NULL | `''` | 독후감 본문 |
| `rating` | `integer` | NOT NULL | `0` | 별점 (0~5) |
| `is_public` | `boolean` | NOT NULL | `false` | 공개 여부 |
| `ai_keywords` | `text[]` | — | NULL | AI 추출 키워드 목록 |
| `ai_emotion` | `text` | — | NULL | AI 분석 감정 |
| `ai_depth` | `text` | — | NULL | AI 분석 독서 깊이 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | 작성 시각 |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | 최종 수정 시각 |

## 관계
- `auth.users` ← N:1 (user_id)
- `contents` ← N:1 (content_id)
