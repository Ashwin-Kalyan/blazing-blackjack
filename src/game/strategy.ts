import type { Card } from '../types'
import { baseValue, handValue } from './handValue'

export type Action = 'H' | 'S' | 'D' | 'P'

export interface Advice {
  action: Action
  /** Short human label, e.g. "Double (else Hit)". */
  label: string
}

const ACTION_WORD: Record<Action, string> = {
  H: 'Hit',
  S: 'Stand',
  D: 'Double',
  P: 'Split',
}

/** Dealer upcard value with ace high (2..11). */
function dealerValue(card: Card): number {
  return baseValue(card.rank) // ace -> 11, tens -> 10
}

function inRange(n: number, lo: number, hi: number): boolean {
  return n >= lo && n <= hi
}

/** Recommendation for a pair, or null if this pair should be played as a total. */
function pairAdvice(rank: string, up: number): Action | null {
  switch (rank) {
    case 'A':
      return 'P'
    case '10':
    case 'J':
    case 'Q':
    case 'K':
      return null // never split tens
    case '9':
      return up === 7 || up === 10 || up === 11 ? null : 'P' // stand vs 7,10,A
    case '8':
      return 'P'
    case '7':
      return inRange(up, 2, 7) ? 'P' : null
    case '6':
      return inRange(up, 2, 6) ? 'P' : null
    case '5':
      return null // play as hard 10
    case '4':
      return up === 5 || up === 6 ? 'P' : null // DAS
    case '3':
    case '2':
      return inRange(up, 2, 7) ? 'P' : null
    default:
      return null
  }
}

/** Soft-total recommendation (hand contains an ace counted as 11). */
function softAdvice(total: number, up: number, h17: boolean): Action {
  switch (total) {
    case 20:
      return 'S' // A,9
    case 19:
      // A,8 doubles vs 6 only when the dealer hits soft 17.
      return h17 && up === 6 ? 'D' : 'S'
    case 18:
      if (inRange(up, 3, 6)) return 'D'
      if (h17 && up === 2) return 'D' // A,7 doubles vs 2 under H17
      if (up === 2 || up === 7 || up === 8) return 'S'
      return 'H' // vs 9,10,A
    case 17:
      return inRange(up, 3, 6) ? 'D' : 'H'
    case 16:
    case 15:
      return inRange(up, 4, 6) ? 'D' : 'H'
    case 14:
    case 13:
      return inRange(up, 5, 6) ? 'D' : 'H'
    default:
      return 'S' // soft 21 etc.
  }
}

/** Hard-total recommendation. */
function hardAdvice(total: number, up: number): Action {
  if (total >= 17) return 'S'
  if (inRange(total, 13, 16)) return inRange(up, 2, 6) ? 'S' : 'H'
  if (total === 12) return inRange(up, 4, 6) ? 'S' : 'H'
  if (total === 11) return 'D' // S17: double 11 against every upcard, incl. Ace
  if (total === 10) return inRange(up, 2, 9) ? 'D' : 'H'
  if (total === 9) return inRange(up, 3, 6) ? 'D' : 'H'
  return 'H' // 8 or less
}

export interface StrategyOptions {
  canDouble: boolean
  canSplit: boolean
  /** Dealer hits soft 17 (shifts a couple of soft-double cells). */
  hitSoft17: boolean
}

/**
 * Multi-deck basic strategy, double-after-split allowed. Adapts the handful of
 * cells that differ between dealer-stands-on-17 (S17) and dealer-hits-soft-17
 * (H17). Mirrors the rule set used by the engine.
 */
export function basicStrategy(
  cards: Card[],
  dealerUp: Card,
  opts: StrategyOptions,
): Advice {
  const up = dealerValue(dealerUp)
  const { total, soft } = handValue(cards)

  // Pairs
  if (cards.length === 2 && cards[0].rank === cards[1].rank && opts.canSplit) {
    const p = pairAdvice(cards[0].rank, up)
    if (p === 'P') return { action: 'P', label: ACTION_WORD.P }
  }

  let action: Action = soft
    ? softAdvice(total, up, opts.hitSoft17)
    : hardAdvice(total, up)

  // Apply double-availability fallback.
  if (action === 'D' && !opts.canDouble) {
    if (soft) {
      action = total >= 18 ? 'S' : 'H'
    } else {
      action = 'H'
    }
    return { action, label: ACTION_WORD[action] }
  }

  if (action === 'D') {
    const fallback = soft ? (total >= 18 ? 'Stand' : 'Hit') : 'Hit'
    return { action, label: `Double (else ${fallback})` }
  }

  return { action, label: ACTION_WORD[action] }
}

/** Basic strategy never takes insurance (it's a –EV bet without card counting). */
export const INSURANCE_ADVICE = 'Decline — insurance is a losing bet for basic strategy.'
