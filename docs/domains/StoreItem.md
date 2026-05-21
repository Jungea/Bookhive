# StoreItem 도메인

## 개요
사용자가 골드로 구매해 도서관에 배치한 인테리어 아이템 도메인.
슬롯 기반으로 배치되며, 슬롯당 하나의 아이템만 존재할 수 있다.
아이템은 도서관의 시각적 분위기를 꾸미는 역할을 한다.

## 비즈니스 규칙
- 아이템 구매는 골드를 소비한다. 구매 후 환불은 없다.
- 같은 슬롯에 새 아이템을 배치하면 기존 아이템이 교체된다.
- 아이템 종류는 `sofa`, `plant`, `lamp`, `rug` 네 가지로 고정된다.
- 아이템 배치가 손님 방문 빈도나 보상에 영향을 줄 수 있다 (추후 확장 예정).

## 테이블: `store_items`

| 필드명 | 타입 | 제약 | 기본값 | 설명 |
|--------|------|------|--------|------|
| `id` | `uuid` | PK | `gen_random_uuid()` | 아이템 고유 ID |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users` | — | 소유자 ID |
| `item_type` | `text` | NOT NULL, CHECK | — | 아이템 종류 (`sofa` / `plant` / `lamp` / `rug`) |
| `slot_position` | `integer` | NOT NULL | — | 배치 슬롯 번호 |
| `purchased_at` | `timestamptz` | NOT NULL | `now()` | 구매 시각 |

**제약:** `(user_id, slot_position)` UNIQUE — 같은 슬롯에 두 아이템 배치 불가

## 관계
- `auth.users` ← N:1 (user_id)
