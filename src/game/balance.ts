// 게임 밸런스 상수 모음
// 수치 조정이 필요할 때 이 파일만 수정하면 됩니다.

// 손님 행동 확률
export const CUSTOMER_PROB = {
  VISIT_SHELF:        0.70, // 책장 방문 확률
  RENT_WITH_STOCK:    0.70, // 재고 있을 때 대여 확률
  RENT_WITHOUT_STOCK: 0.20, // 재고 없을 때 대여 확률
  TAKE_1_BOOK:        0.50, // 1권 선택 확률
  TAKE_2_BOOKS:       0.25, // 2권 선택 확률
  TAKE_3_BOOKS:       0.15, // 3권 선택 확률
  TAKE_4_PLUS_BOOKS:  0.10, // 4권 이상 선택 확률 (실제 권수는 4~MAX_BOOKS 랜덤)
  MAX_BOOKS:          10,    // 한 번에 빌릴 수 있는 최대 권수
} as const
