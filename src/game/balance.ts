// 게임 밸런스 상수 모음
// 운영 값: balance.prod.ts / 개발·테스트 값: balance.dev.ts
// import 경로는 항상 이 파일(balance.ts)을 사용할 것

import * as prod from './balance.prod'
import * as dev from './balance.dev'

const b = import.meta.env.DEV ? dev : prod

export const RENTAL_DUE_UNIT  = b.RENTAL_DUE_UNIT
export const CUSTOMER_PROB    = b.CUSTOMER_PROB
export const RENTAL_PER_STOCK = b.RENTAL_PER_STOCK
export const SHELF_COSTS      = b.SHELF_COSTS
export const SHELF_REP_REQ    = b.SHELF_REP_REQ
