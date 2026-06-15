import type { Card, Rank, SideBetResult, SideBets } from '../types'
import { isRed } from './deck'

/**
 * Every side bet in Blazing Blackjack is evaluated on three cards:
 * the player's first two cards plus the dealer's upcard. They are graded
 * independently of the main blackjack hand and of each other.
 */
type ThreeCards = [Card, Card, Card]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function allSameSuit(cards: Card[]): boolean {
  return cards.every((c) => c.suit === cards[0].suit)
}

function allSameColor(cards: Card[]): boolean {
  const red = isRed(cards[0].suit)
  return cards.every((c) => isRed(c.suit) === red)
}

function allSameRank(cards: Card[]): boolean {
  return cards.every((c) => c.rank === cards[0].rank)
}

/** Numeric rank for straight detection (ace handled separately as high/low). */
function straightRank(rank: Rank, aceHigh: boolean): number {
  if (rank === 'A') return aceHigh ? 14 : 1
  if (rank === 'K') return 13
  if (rank === 'Q') return 12
  if (rank === 'J') return 11
  return parseInt(rank, 10)
}

function isThreeConsecutive(values: number[]): boolean {
  const unique = [...new Set(values)].sort((a, b) => a - b)
  return unique.length === 3 && unique[2] - unique[0] === 2
}

/** A 3-card straight, allowing the ace to be low (A-2-3) or high (Q-K-A). */
function isStraight3(cards: Card[]): boolean {
  const high = cards.map((c) => straightRank(c.rank, true))
  const low = cards.map((c) => straightRank(c.rank, false))
  return isThreeConsecutive(high) || isThreeConsecutive(low)
}

/** All non-busting totals reachable by counting each ace as 1 or 11. */
function reachableTotals(cards: Card[]): Set<number> {
  let totals = [0]
  for (const card of cards) {
    if (card.rank === 'A') {
      totals = totals.flatMap((t) => [t + 1, t + 11])
    } else {
      const v = card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10'
        ? 10
        : parseInt(card.rank, 10)
      totals = totals.map((t) => t + v)
    }
  }
  return new Set(totals)
}

function isRankSet(cards: Card[], ranks: Rank[]): boolean {
  const want = [...ranks].sort()
  const got = cards.map((c) => c.rank).sort()
  return want.length === got.length && want.every((r, i) => r === got[i])
}

function countSevens(cards: Card[]): Card[] {
  return cards.filter((c) => c.rank === '7')
}

// ---------------------------------------------------------------------------
// Individual paytables — return [comboName | null, odds]
// ---------------------------------------------------------------------------

export function evaluateTrilock(cards: ThreeCards): [string | null, number] {
  const flush = allSameSuit(cards)
  const trips = allSameRank(cards)
  const straight = isStraight3(cards)

  if (trips && flush) return ['Suited Trips', 100]
  if (straight && flush) return ['Straight Flush', 40]
  if (trips) return ['Three of a Kind', 30]
  if (straight) return ['Straight', 10]
  if (flush) return ['Flush', 5]
  return [null, 0]
}

export function evaluateFortune(cards: ThreeCards): [string | null, number] {
  const flush = allSameSuit(cards)
  const sevens = isRankSet(cards, ['7', '7', '7'])
  const six78 = isRankSet(cards, ['6', '7', '8'])
  const totals = reachableTotals(cards)

  if (sevens && flush) return ['Suited 7-7-7', 200]
  if (six78 && flush) return ['Suited 6-7-8', 100]
  if (sevens) return ['7-7-7', 50]
  if (six78) return ['6-7-8', 20]
  if (totals.has(21) && flush) return ['Suited 21', 10]
  if (totals.has(21)) return ['Any 21', 3]
  if (totals.has(20)) return ['Any 20', 2]
  if (totals.has(19)) return ['Any 19', 2]
  return [null, 0]
}

export function evaluateBlazing(cards: ThreeCards): [string | null, number] {
  const sevens = countSevens(cards)
  if (sevens.length === 3) {
    if (allSameSuit(sevens)) return ['Three Suited 7s', 1000]
    if (allSameColor(sevens)) return ['Three Same-Color 7s', 500]
    return ['Three 7s', 200]
  }
  if (sevens.length === 2) return ['Two 7s', 25]
  if (sevens.length === 1) return ['One 7', 2]
  return [null, 0]
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const LABELS: Record<keyof SideBets, string> = {
  trilock: 'TriLux',
  fortune: 'Fortune',
  blazing: 'Blazing 7s',
}

const EVALUATORS: Record<keyof SideBets, (c: ThreeCards) => [string | null, number]> = {
  trilock: evaluateTrilock,
  fortune: evaluateFortune,
  blazing: evaluateBlazing,
}

/**
 * Grade every funded side bet against the player's first two cards and the
 * dealer's upcard.
 */
export function evaluateSideBets(
  playerCards: Card[],
  dealerUpcard: Card,
  sideBets: SideBets,
): SideBetResult[] {
  const three: ThreeCards = [playerCards[0], playerCards[1], dealerUpcard]
  const results: SideBetResult[] = []

  ;(Object.keys(EVALUATORS) as Array<keyof SideBets>).forEach((key) => {
    const bet = sideBets[key]
    if (bet <= 0) return
    const [combo, odds] = EVALUATORS[key](three)
    const won = combo !== null
    results.push({
      key,
      label: LABELS[key],
      combo,
      odds,
      bet,
      net: won ? bet * odds : -bet,
      won,
    })
  })

  return results
}
