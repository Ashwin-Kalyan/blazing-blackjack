import type { Card, Rank } from '../types'
import { handValue } from './handValue'

/** Free Bet doubles are offered on a two-card hard 9, 10, or 11. */
export function isFreeDoubleEligible(cards: Card[]): boolean {
  if (cards.length !== 2) return false
  const { total, soft } = handValue(cards)
  return !soft && (total === 9 || total === 10 || total === 11)
}

const TEN_VALUE = new Set<Rank>(['10', 'J', 'Q', 'K'])

/** Free Bet splits are offered on any pair except ten-value pairs. */
export function isFreeSplitEligible(rank: Rank): boolean {
  return !TEN_VALUE.has(rank)
}
