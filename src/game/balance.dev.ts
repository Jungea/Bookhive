export const RENTAL_DUE_UNIT  = 'second' as const
export const RENTAL_PER_STOCK = 3  // 대여 완료 N회마다 재고 +1

// 책장 추가 비용 [레벨2, 레벨3, 레벨4] (개발용: 낮은 비용)
export const SHELF_COSTS:   readonly number[] = [50, 150, 300]
// 책장 해금 최소 평판 [레벨1(기본), 레벨2, 레벨3, 레벨4] (개발용: 낮은 기준)
export const SHELF_REP_REQ: readonly number[] = [0, 5, 10, 20]

export const CUSTOMER_PROB = {
  VISIT_SHELF:        1.00, // 책장 방문 확률
  RENT_WITH_STOCK:    1.00, // 재고 있을 때 대여 확률
  RENT_WITHOUT_STOCK: 0.50, // 재고 없을 때 대여 확률
  TAKE_1_BOOK:        0.50, // 1권 선택 확률
  TAKE_2_BOOKS:       0.25, // 2권 선택 확률
  TAKE_3_BOOKS:       0.15, // 3권 선택 확률
  TAKE_4_PLUS_BOOKS:  0.10, // 4권 이상 선택 확률 (실제 권수는 4~MAX_BOOKS 랜덤)
  MAX_BOOKS:          10,   // 한 번에 빌릴 수 있는 최대 권수
} as const
