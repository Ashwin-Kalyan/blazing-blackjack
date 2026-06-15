import type { Card, Rank, Suit } from '../types'

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS: Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
]

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

/**
 * A multi-deck shoe. Cards are stored as {rank, suit} templates; unique ids are
 * minted at draw time so React keys never collide across reshuffles.
 */
export class Shoe {
  private cards: Array<{ rank: Rank; suit: Suit }> = []
  private idCounter = 0
  private dealt = 0
  readonly size: number

  constructor(private numDecks: number) {
    this.size = numDecks * 52
    this.reset()
  }

  reset(): void {
    this.cards = []
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push({ rank, suit })
        }
      }
    }
    this.shuffle()
    this.dealt = 0
  }

  /** Fisher–Yates shuffle. */
  private shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  draw(faceDown = false): Card {
    if (this.cards.length === 0) this.reset()
    const template = this.cards.pop()!
    this.dealt++
    return {
      ...template,
      id: `c${this.idCounter++}`,
      faceDown,
    }
  }

  /** Fraction of the shoe already dealt (0..1). */
  get penetration(): number {
    return this.dealt / this.size
  }

  /** True once the cut card is reached (~75% penetration). */
  get needsReshuffle(): boolean {
    return this.penetration >= 0.75
  }

  get remaining(): number {
    return this.cards.length
  }

  get decks(): number {
    return this.numDecks
  }
}
