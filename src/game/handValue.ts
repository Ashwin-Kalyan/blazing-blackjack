import type { Card, Rank } from '../types'

/** Blackjack point value of a single rank (ace counted as 11 here; reduced later). */
export function baseValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10
  return parseInt(rank, 10)
}

export interface HandTotal {
  total: number
  /** True when an ace is still counted as 11 without busting. */
  soft: boolean
  blackjack: boolean
}

/**
 * Computes the best (highest non-busting) total for a hand.
 * Face-down cards are ignored so the dealer's shown value is correct mid-round.
 */
export function handValue(cards: Card[]): HandTotal {
  let total = 0
  let aces = 0
  let visible = 0

  for (const card of cards) {
    if (card.faceDown) continue
    visible++
    if (card.rank === 'A') aces++
    total += baseValue(card.rank)
  }

  // Demote aces from 11 to 1 while busting.
  let softAces = aces
  while (total > 21 && softAces > 0) {
    total -= 10
    softAces--
  }

  const soft = softAces > 0 && total <= 21
  const blackjack = visible === 2 && total === 21
  return { total, soft, blackjack }
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21
}

/** A natural blackjack: exactly two cards totalling 21, and not the product of a split. */
export function isNaturalBlackjack(cards: Card[], fromSplit = false): boolean {
  if (fromSplit) return false
  return handValue(cards).blackjack
}
