# 미구현 설계 항목

## 책장

### 가로 슬롯 — 페이지 수 기반 가변 너비

현재는 `SLOTS_PER_ROW = 20` 고정값으로 임시 구현되어 있음.
추후 책의 페이지 수에 따라 책 너비를 가변으로 전환 예정.

- 얇은 책(페이지 수 적음) → 좁은 너비
- 두꺼운 책(페이지 수 많음) → 넓은 너비
- 한 행이 꽉 차면 다음 행으로 이어짐

**데이터 구조 변경 계획**
```typescript
// 현재
genres: string[]

// 예정
books: { genre: string; pages: number }[]
```

**기준 두께 (수치는 추후 조정)**
- 기준 페이지: 300p → 기본 너비 1단위
- 100p 이하: 0.5단위
- 600p 이상: 2단위

### 세로 슬롯

- 고정 10행 (`SHELF_ROWS = 10`)
- 행 높이 = 책장 높이 / 10

---

## 손님 행동 AI

입장 후 1회 wandering 이후 4가지 분기:

```
entering → wandering
  ├→ wandering (반복)
  ├→ 퇴장
  ├→ going_to_shelf → at_shelf → 퇴장
  └→ going_to_shelf → at_shelf → going_to_desk → at_desk(보상) → 퇴장
```

- 보상(`customer-resolved`)은 데스크 도착 시에만 발생
- 책장 방문 후 대여 없이 퇴장 가능
