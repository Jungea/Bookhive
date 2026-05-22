import Phaser from 'phaser'
import { Bookshelf, calcBookWidth } from '../objects/Bookshelf'
import { Customer } from '../objects/Customer'
import type { CarriedBook } from '../objects/Customer'
import { Desk } from '../objects/Desk'
import { Librarian } from '../objects/Librarian'
import { generateCustomer, pickWantedGenre } from '../systems/CustomerAI'
import type { GenreInventory, BookEntry } from '../../lib/types'
import type { CustomerRoute } from '../objects/Customer'
import type { RentalInfo } from './UIScene'
import { CUSTOMER_PROB } from '../balance'
import { DEPTH } from '../depths'

interface ReturnCard {
  rentalId: string
  contentId: string
  container: Phaser.GameObjects.Container
}

const FLOOR_Y_RATIO = 0.75
const ZONE_COUNT    = 4
const ZONE_W_RATIO  = 1 / ZONE_COUNT   // 0.25
const SHELF_H_RATIO = 0.50
const SHELF_W_FILL  = 0.85             // 존 너비 대비 책장 너비 비율
const DESK_W_FILL   = 0.70             // 존 너비 대비 데스크 너비 비율
const DESK_H_RATIO  = 0.10


export class MainScene extends Phaser.Scene {
  private wallGraphics!: Phaser.GameObjects.Graphics
  private floorGraphics!: Phaser.GameObjects.Graphics
  private bookshelves: Bookshelf[] = []
  private customers: Customer[] = []
  private currentInventory: GenreInventory = {}
  private currentBooks: BookEntry[] = []
  private currentReputation = 0
  private rentedCopyIds: Set<string> = new Set()
  private activeRentals: RentalInfo[] = []
  private returningRentalIds: Set<string> = new Set()
  private returnCards: ReturnCard[] = []
  private deskCenterX = 0
  private deskTopY = 0

  constructor() { super('MainScene') }

  create() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.drawBackground()

    const zoneW = width * ZONE_W_RATIO
    const deskW = zoneW * DESK_W_FILL
    const deskH = height * DESK_H_RATIO
    const deskX = zoneW + (zoneW - deskW) / 2
    new Desk(this, deskX, floorY, deskW, deskH)
    new Librarian(this, deskX + deskW / 2, floorY - deskH * 0.5)

    this.deskCenterX = deskX + deskW / 2
    this.deskTopY = floorY - deskH

    this.placeBookshelves([], {}, 1)

    this.time.addEvent({
      delay: 5000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true,
    })

    this.game.events.on(
      'inventory-updated',
      ({ books, inventory, storeLevel, rentedContentIds }: {
        books: BookEntry[]
        inventory: GenreInventory
        storeLevel: number
        rentedContentIds?: string[]
      }) => {
        this.currentInventory = inventory
        this.currentBooks = books
        if (rentedContentIds) {
          // content_id 목록(중복 허용) → copy_id Set으로 변환
          const rentedCountMap = new Map<string, number>()
          for (const cid of rentedContentIds) {
            rentedCountMap.set(cid, (rentedCountMap.get(cid) ?? 0) + 1)
          }
          this.rentedCopyIds = new Set()
          const seenCopies = new Map<string, number>()
          for (const book of books) {
            const seen = seenCopies.get(book.content_id) ?? 0
            const total = rentedCountMap.get(book.content_id) ?? 0
            if (seen < total) {
              this.rentedCopyIds.add(book.copy_id)
              seenCopies.set(book.content_id, seen + 1)
            }
          }
        }
        this.placeBookshelves(books, inventory, storeLevel)
      }
    )

    this.game.events.on('reputation-updated', (rep: number) => {
      this.currentReputation = rep
    })

    this.game.events.on('book-returned', ({ contentId }: { contentId: string }) => {
      // 해당 content_id의 대여 중인 copy 하나를 반납 처리
      const copyId = [...this.rentedCopyIds].find(id => id.startsWith(contentId + '#'))
      if (copyId) {
        this.rentedCopyIds.delete(copyId)
        this.bookshelves.forEach(shelf => shelf.returnBook(copyId))
      }
    })

    this.game.events.on('rentals-updated', (rentals: RentalInfo[]) => {
      this.activeRentals = rentals
      // 이미 반납된 대여는 추적 목록에서 제거
      const activeIds = new Set(rentals.map(r => r.id))
      this.returningRentalIds.forEach(id => {
        if (!activeIds.has(id)) this.returningRentalIds.delete(id)
      })
    })

    this.game.events.on('book-arrived-at-desk', ({ rentalId, contentId }: { rentalId: string; contentId: string }) => {
      this.addReturnCard(rentalId, contentId)
    })

    this.game.events.on('manual-return-requested', ({ rentalId, customerType, contentId }: {
      rentalId: string; customerType: string; contentId: string
    }) => {
      if (this.returningRentalIds.has(rentalId)) return
      this.returningRentalIds.add(rentalId)
      const rental = this.activeRentals.find(r => r.id === rentalId)
      this.spawnReturningCustomer(rental ?? {
        id: rentalId, customerType, contentId,
        title: '', dueDateStr: '', isOverdue: false, returnDueAt: '',
      })
    })
  }

  private drawBackground() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.wallGraphics?.destroy()
    this.floorGraphics?.destroy()

    this.wallGraphics = this.add.graphics()
    this.wallGraphics.fillStyle(0xb0b0b0)
    this.wallGraphics.fillRect(0, 0, width, floorY)

    this.floorGraphics = this.add.graphics()
    this.floorGraphics.fillStyle(0x707070)
    this.floorGraphics.fillRect(0, floorY, width, height - floorY)
    // 벽-바닥 경계 몰딩 (튀어나온 효과: 위=하이라이트, 아래=그림자)
    this.floorGraphics.lineStyle(1, 0xffffff, 0.6)
    this.floorGraphics.lineBetween(0, floorY - 10, width, floorY - 10)
    this.floorGraphics.lineStyle(1, 0x000000, 0.3)
    this.floorGraphics.lineBetween(0, floorY, width, floorY)
  }

  placeBookshelves(books: BookEntry[], inventory: GenreInventory, storeLevel: number) {
    this.bookshelves.forEach(b => b.destroy())
    this.bookshelves = []

    this.currentInventory = inventory
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO
    const zoneW = width * ZONE_W_RATIO
    const shelfW = zoneW * SHELF_W_FILL
    const shelfH = height * SHELF_H_RATIO
    const shelfPadding = (zoneW - shelfW) / 2
    const BOOKS_PER_SHELF = 100

    for (let i = 0; i < storeLevel; i++) {
      // Zone 1은 데스크 전용 → 책장은 Zone 4부터 왼쪽으로 채움
      const x = zoneW * (ZONE_COUNT - 1 - i) + shelfPadding

      this.bookshelves.push(new Bookshelf({
        scene: this,
        x,
        y: floorY,
        width: shelfW,
        height: shelfH,
        level: i + 1,
        books: books.slice(i * BOOKS_PER_SHELF, (i + 1) * BOOKS_PER_SHELF),
      }))
    }

    // 새로고침 후 대여 중인 책 빈 자리 복원
    this.rentedCopyIds.forEach(copyId => {
      this.bookshelves.forEach(shelf => shelf.rentBook(copyId))
    })
  }

  private spawnCustomer() {
    const { width, height } = this.cameras.main
    const floorTop = height * FLOOR_Y_RATIO
    const floorY = floorTop + Math.random() * (height - floorTop - 40)

    if (this.bookshelves.length === 0) return

    const profile = generateCustomer({
      storeLevel: this.bookshelves.length,
      reputation: this.currentReputation,
    })
    const wantedGenre = pickWantedGenre(profile.type, this.currentInventory)

    // 대여 가능한 책 = 원하는 장르 + 현재 대여 중이 아닌 권
    const rentableBooks = wantedGenre
      ? this.currentBooks.filter(b => b.genre === wantedGenre && !this.rentedCopyIds.has(b.copy_id))
      : []
    const hasStock = rentableBooks.length > 0

    // 단계별 확률 분기
    const willVisitShelf = Math.random() < CUSTOMER_PROB.VISIT_SHELF
    const willRent = willVisitShelf && (hasStock ? Math.random() < CUSTOMER_PROB.RENT_WITH_STOCK : Math.random() < CUSTOMER_PROB.RENT_WITHOUT_STOCK)
    const route: CustomerRoute = !willVisitShelf
      ? 'exit_only'
      : willRent
        ? 'shelf_then_desk'
        : 'shelf_then_exit'

    // 1~3권 랜덤 선택 (가용 재고 내)
    let selectedBooks: BookEntry[] = []
    if (route === 'shelf_then_desk' && rentableBooks.length > 0) {
      const r = Math.random()
      const p4plus = CUSTOMER_PROB.TAKE_4_PLUS_BOOKS
      const p43    = p4plus + CUSTOMER_PROB.TAKE_3_BOOKS
      const p432   = p43   + CUSTOMER_PROB.TAKE_2_BOOKS
      const maxAvailable = Math.min(rentableBooks.length, CUSTOMER_PROB.MAX_BOOKS)
      const count = maxAvailable >= 4 && r < p4plus
        ? 4 + Math.floor(Math.random() * (maxAvailable - 4 + 1))  // 4 ~ maxAvailable 랜덤
        : rentableBooks.length >= 3 && r < p43  ? 3
        : rentableBooks.length >= 2 && r < p432 ? 2
        : 1
      // 중복 없이 count권 선택
      const shuffled = [...rentableBooks].sort(() => Math.random() - 0.5)
      selectedBooks = shuffled.slice(0, count)
    }

    // 스폰 시점에 즉시 선점
    for (const book of selectedBooks) {
      this.rentedCopyIds.add(book.copy_id)
    }

    const carriedBooks: CarriedBook[] = selectedBooks.map(b => ({
      color: parseInt(b.cover_color!.replace('#', ''), 16),
      thickness: calcBookWidth(b.pages),
    }))

    const zoneW = width * ZONE_W_RATIO
    const deskX = zoneW * 1.5
    const entryX = zoneW * 1.2

    const shelf = this.bookshelves[Math.floor(Math.random() * this.bookshelves.length)]
    const shelfX = shelf.x + Math.random() * shelf.width

    const customer = new Customer({
      scene: this,
      x: -16,
      y: floorY,
      entryX,
      shelfX,
      deskX,
      customerType: profile.type,
      route,
      carriedBooks,
      onAtShelf: () => {
        for (const book of selectedBooks) {
          shelf.rentBook(book.copy_id)
        }
      },
      onAtDesk: (c) => {
        this.game.events.emit('customer-resolved', {
          wantedGenre: wantedGenre ?? '',
          customerType: profile.type,
        })
        if (selectedBooks.length > 0) {
          this.game.events.emit('books-rented', {
            books: selectedBooks,
            customerType: profile.type,
          })
        }
        void c
      },
      onExit: (c) => {
        this.customers = this.customers.filter(x => x !== c)
        c.destroy()
      },
    })

    this.customers.push(customer)

    // 기한 지난 대여 중 아직 반납 고객이 안 온 것 1건 처리
    const now = new Date()
    const overdueRental = this.activeRentals.find(
      r => new Date(r.returnDueAt) <= now && !this.returningRentalIds.has(r.id)
    )
    if (overdueRental) {
      this.returningRentalIds.add(overdueRental.id)
      this.spawnReturningCustomer(overdueRental)
    }
  }

  private spawnReturningCustomer(rental: RentalInfo) {
    const { width, height } = this.cameras.main
    const floorTop = height * FLOOR_Y_RATIO
    const floorY = floorTop + Math.random() * (height - floorTop - 40)
    const zoneW = width * ZONE_W_RATIO
    const deskX = zoneW * 1.5

    const book = this.currentBooks.find(b => b.content_id === rental.contentId)
    const carriedBooks: CarriedBook[] = [{
      color: book?.cover_color ? parseInt(book.cover_color.replace('#', ''), 16) : 0x888888,
      thickness: calcBookWidth(book?.pages ?? null),
    }]

    const customer = new Customer({
      scene: this,
      x: -16,
      y: floorY,
      entryX: zoneW * 1.2,
      shelfX: zoneW * 2,
      deskX,
      customerType: rental.customerType,
      route: 'desk_then_exit',
      carriedBooks,
      onAtShelf: () => {},
      onAtDesk: () => {
        this.game.events.emit('book-arrived-at-desk', { rentalId: rental.id, contentId: rental.contentId })
      },
      onExit: (c) => {
        this.customers = this.customers.filter(x => x !== c)
        c.destroy()
      },
    })

    this.customers.push(customer)
  }

  private addReturnCard(rentalId: string, contentId: string) {
    const CARD_W = 22
    const CARD_H = 14
    const index = this.returnCards.length
    const x = this.deskCenterX - CARD_W / 2 + index * 10
    const y = this.deskTopY - CARD_H - 4

    const g = this.add.graphics()
    g.fillStyle(0xf5f0e0, 1)
    g.fillRect(0, 0, CARD_W, CARD_H)
    g.lineStyle(1, 0x8b7355, 0.8)
    g.strokeRect(0, 0, CARD_W, CARD_H)
    g.lineStyle(0.5, 0x8b7355, 0.4)
    g.lineBetween(3, 4, CARD_W - 3, 4)
    g.lineBetween(3, 7, CARD_W - 3, 7)
    g.lineBetween(3, 10, CARD_W - 3, 10)

    const zone = this.add.zone(0, 0, CARD_W, CARD_H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    const container = this.add.container(x, y, [g, zone])
      .setDepth(DEPTH.FURNITURE + 1)

    const card: ReturnCard = { rentalId, contentId, container }
    this.returnCards.push(card)

    zone.on('pointerdown', () => {
      this.game.events.emit('return-card-clicked', { rentalId, contentId })
      this.removeReturnCard(card)
    })
  }

  private removeReturnCard(card: ReturnCard) {
    card.container.destroy()
    this.returnCards = this.returnCards.filter(c => c !== card)
    this.returnCards.forEach((c, i) => {
      c.container.setPosition(this.deskCenterX - 11 + i * 10, this.deskTopY - 18)
    })
  }

  update() {
    this.customers.forEach(c => c.update())
  }
}
