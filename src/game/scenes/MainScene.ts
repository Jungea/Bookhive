import Phaser from 'phaser'
import { Bookshelf } from '../objects/Bookshelf'
import { Customer } from '../objects/Customer'
import { Desk } from '../objects/Desk'
import { Librarian } from '../objects/Librarian'
import { generateCustomer, pickWantedGenre } from '../systems/CustomerAI'
import type { GenreInventory } from '../../lib/types'

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
  private currentReputation = 0

  constructor() { super('MainScene') }

  create() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.drawBackground()

    const zoneW = width * ZONE_W_RATIO
    const deskW = zoneW * DESK_W_FILL
    const deskH = height * DESK_H_RATIO
    const deskX = (zoneW - deskW) / 2
    new Desk(this, deskX, floorY, deskW, deskH)
    new Librarian(this, deskX + deskW / 2, floorY - deskH * 0.5)

    this.placeBookshelves({}, 1)

    this.time.addEvent({
      delay: 5000,
      callback: this.spawnCustomer,
      callbackScope: this,
      loop: true,
    })

    // Supabase 데이터 수신 (Task 13에서 연동)
    this.game.events.on(
      'inventory-updated',
      ({ inventory, storeLevel }: { inventory: GenreInventory; storeLevel: number }) => {
        this.currentInventory = inventory
        this.placeBookshelves(inventory, storeLevel)
      }
    )

    this.game.events.on('reputation-updated', (rep: number) => {
      this.currentReputation = rep
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

  placeBookshelves(inventory: GenreInventory, storeLevel: number) {
    this.bookshelves.forEach(b => b.destroy())
    this.bookshelves = []

    this.currentInventory = inventory
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO
    const zoneW = width * ZONE_W_RATIO
    const shelfW = zoneW * SHELF_W_FILL
    const shelfH = height * SHELF_H_RATIO
    const shelfPadding = (zoneW - shelfW) / 2
    const genreList = Object.entries(inventory)
      .flatMap(([genre, count]) => Array(count).fill(genre))

    for (let i = 0; i < storeLevel; i++) {
      // Zone 1은 데스크 전용 → 책장은 Zone 4부터 왼쪽으로 채움
      const x = zoneW * (ZONE_COUNT - 1 - i) + shelfPadding
      const genres = genreList.slice(i * 50, (i + 1) * 50)

      this.bookshelves.push(new Bookshelf({
        scene: this,
        x,
        y: floorY,
        width: shelfW,
        height: shelfH,
        level: i + 1,
        genres,
      }))
    }
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

    const zoneW = width * ZONE_W_RATIO
    const deskX = zoneW * 0.5

    const shelf = this.bookshelves[Math.floor(Math.random() * this.bookshelves.length)]
    const shelfX = shelf.x + Math.random() * shelf.width

    const customer = new Customer({
      scene: this,
      x: -16,
      y: floorY,
      shelfX,
      deskX,
      customerType: profile.type,
      onAtShelf: () => {
        // 책장 도착 — 시각 처리 예정
      },
      onAtDesk: (c) => {
        this.game.events.emit('customer-resolved', {
          wantedGenre: wantedGenre ?? '',
          customerType: profile.type,
        })
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
