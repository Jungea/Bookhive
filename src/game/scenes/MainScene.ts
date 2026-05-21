import Phaser from 'phaser'
import { Bookshelf, calcBookWidth } from '../objects/Bookshelf'
import { Customer } from '../objects/Customer'
import type { CarriedBook } from '../objects/Customer'
import { Desk } from '../objects/Desk'
import { Librarian } from '../objects/Librarian'
import { generateCustomer, pickWantedGenre } from '../systems/CustomerAI'
import type { GenreInventory, BookEntry } from '../../lib/types'
import type { CustomerRoute } from '../objects/Customer'
import { CUSTOMER_PROB } from '../balance'

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
  private rentedContentIds: Set<string> = new Set()

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
          this.rentedContentIds = new Set(rentedContentIds)
        }
        this.placeBookshelves(books, inventory, storeLevel)
      }
    )

    this.game.events.on('reputation-updated', (rep: number) => {
      this.currentReputation = rep
    })

    this.game.events.on('book-returned', ({ contentId }: { contentId: string }) => {
      this.rentedContentIds.delete(contentId)
      this.bookshelves.forEach(shelf => shelf.returnBook(contentId))
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
    this.rentedContentIds.forEach(id => {
      this.bookshelves.forEach(shelf => shelf.rentBook(id))
    })
  }

  private spawnCustomer() {
    const { width, height } = this.cameras.main
    const floorTop = height * FLOOR_Y_RATIO
    const floorY = floorTop + Math.random() * (height - floorTop - 20)

    if (this.bookshelves.length === 0) return

    const profile = generateCustomer({
      storeLevel: this.bookshelves.length,
      reputation: this.currentReputation,
    })
    const wantedGenre = pickWantedGenre(profile.type, this.currentInventory)

    // 대여 가능한 책 = 원하는 장르 + 현재 대여 중이 아닌 책
    const rentableBooks = wantedGenre
      ? this.currentBooks.filter(b => b.genre === wantedGenre && !this.rentedContentIds.has(b.content_id))
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
      this.rentedContentIds.add(book.content_id)
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
          shelf.rentBook(book.content_id)
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
  }

  update() {
    this.customers.forEach(c => c.update())
  }
}
