import Phaser from 'phaser'
import { Bookshelf, SLOTS_PER_ROW, SHELF_ROWS } from '../objects/Bookshelf'
import { Customer } from '../objects/Customer'
import { generateCustomer, pickWantedGenre } from '../systems/CustomerAI'
import { ASSETS } from '../assets'
import type { GenreInventory } from '../../lib/types'

const FLOOR_Y_RATIO = 0.65

export class MainScene extends Phaser.Scene {
  private wallGraphics!: Phaser.GameObjects.Graphics
  private floorGraphics!: Phaser.GameObjects.Graphics
  private bookshelves: Bookshelf[] = []
  private customers: Customer[] = []
  private currentInventory: GenreInventory = {}
  private currentReputation = 0

  constructor() { super('MainScene') }

  create() {
    this.drawBackground()
    this.registerAnimations()
    this.placeBookshelves({ '소설': 5, '철학': 3, '판타지': 2 }, 1)

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

  private registerAnimations() {
    if (!this.anims.exists('npc_walk_left')) {
      this.anims.create({
        key: 'npc_walk_left',
        frames: this.anims.generateFrameNumbers(ASSETS.NPC_01, { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1,
      })
    }
    if (!this.anims.exists('npc_walk_right')) {
      this.anims.create({
        key: 'npc_walk_right',
        frames: this.anims.generateFrameNumbers(ASSETS.NPC_01, { start: 3, end: 5 }),
        frameRate: 6,
        repeat: -1,
      })
    }
  }

  private drawBackground() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO

    this.wallGraphics?.destroy()
    this.floorGraphics?.destroy()

    this.wallGraphics = this.add.graphics()
    this.wallGraphics.fillStyle(0x2a2240)
    this.wallGraphics.fillRect(0, 0, width, floorY)

    this.floorGraphics = this.add.graphics()
    this.floorGraphics.fillStyle(0x3d2b1a)
    this.floorGraphics.fillRect(0, floorY, width, height - floorY)
    this.floorGraphics.lineStyle(2, 0x6b4f3a)
    this.floorGraphics.lineBetween(0, floorY, width, floorY)
  }

  placeBookshelves(inventory: GenreInventory, storeLevel: number) {
    this.bookshelves.forEach(b => b.destroy())
    this.bookshelves = []

    this.currentInventory = inventory
    const floorY = this.cameras.main.height * FLOOR_Y_RATIO
    const genreList = Object.entries(inventory)
      .flatMap(([genre, count]) => Array(Math.min(count, SLOTS_PER_ROW)).fill(genre))

    for (let i = 0; i < storeLevel; i++) {
      const x = 16 + i * (52 + 12)
      const slotCount = SLOTS_PER_ROW * SHELF_ROWS
      const genres = Array<string>(slotCount)
        .fill('')
        .map((_, j) => genreList[i * slotCount + j] ?? '')

      this.bookshelves.push(new Bookshelf({
        scene: this,
        x,
        y: floorY,
        level: i + 1,
        genres,
      }))
    }
  }

  private spawnCustomer() {
    const { width, height } = this.cameras.main
    const floorY = height * FLOOR_Y_RATIO - 36

    if (this.bookshelves.length === 0) return

    const profile = generateCustomer({
      storeLevel: this.bookshelves.length,
      reputation: this.currentReputation,
    })
    const wantedGenre = pickWantedGenre(profile.type, this.currentInventory)

    const targetX = 20 + Math.floor(Math.random() * this.bookshelves.length) * 64

    const customer = new Customer({
      scene: this,
      x: width + 16,
      y: floorY,
      targetX,
      onReachTarget: (c) => {
        this.time.delayedCall(2000, () => {
          this.game.events.emit('customer-resolved', {
            wantedGenre: wantedGenre ?? '',
            customerType: profile.type,
          })
          c.leave()
        })
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
