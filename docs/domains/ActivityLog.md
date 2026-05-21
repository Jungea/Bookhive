# ActivityLog 도메인

## 개요
독서 기록(`ReadingRecord`)에서 발생하는 모든 변경 이력을 시계열로 저장하는 도메인.
상태 변경, 진행도 업데이트 등의 활동을 추적하며, 사용자의 독서 패턴 분석에 활용될 수 있다.

## 비즈니스 규칙
- 로그는 생성 후 수정·삭제하지 않는다. 이력 추적이 목적이므로 불변(Immutable)으로 다룬다.
- 상태·진행도 변경 시점의 스냅샷(`status_snapshot`, `progress_snapshot`)을 함께 저장한다.
- 애플리케이션 레이어에서 직접 insert하며, DB 트리거로 자동 생성되지 않는다.

## 테이블: `activity_logs`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 로그 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 사용자 ID |
| `content_id` | `uuid` | NOT NULL, FK → `contents` | — | 대상 콘텐츠 ID |
| `record_id` | `uuid` | NOT NULL | — | 연관 reading_record ID |
| `action` | `text` | NOT NULL | — | 액션 유형 (예: `status_change`, `progress_update`) |
| `note` | `text` | — | NULL | 부가 메모 |
| `progress_snapshot` | `integer` | — | NULL | 액션 시점의 진행도 스냅샷 |
| `status_snapshot` | `text` | — | NULL | 액션 시점의 상태 스냅샷 |
| `logged_at` | `timestamptz` | NOT NULL | `now()` | 로그 기록 시각 |

## 관계
- `auth.users` ← N:1 (user_id)
- `contents` ← N:1 (content_id)
