import type { Rules } from '../types'

export const DEFAULT_RULES: Rules = {
  numDecks: 6,
  hitSoft17: false, // dealer stands on all 17s (player-friendly default)
  blackjackPays: 1.5, // 3:2
  maxSplitHands: 4,
  doubleAfterSplit: true,
  freeBetMode: false,
}

/** Side-bet stake limits as a multiple of the table minimum (purely cosmetic guidance). */
export const STARTING_BANKROLL = 1000
export const TABLE_MIN = 5
export const TABLE_MAX = 500

export const CHIP_DENOMINATIONS = [1, 5, 25, 50, 100, 500] as const

export interface PayoutRow {
  combo: string
  odds: number
  note?: string
}

/** Fortune Blackjack (Lucky Lucky) — player's two cards + dealer upcard. */
export const FORTUNE_PAYTABLE: PayoutRow[] = [
  { combo: 'Suited 7-7-7', odds: 200 },
  { combo: 'Suited 6-7-8', odds: 100 },
  { combo: '7-7-7', odds: 50 },
  { combo: '6-7-8', odds: 20 },
  { combo: 'Suited 21', odds: 10 },
  { combo: 'Any 21', odds: 3 },
  { combo: 'Any 20', odds: 2 },
  { combo: 'Any 19', odds: 2 },
]

/** TriLux (21+3 style) — player's two cards + dealer upcard. */
export const TRILOCK_PAYTABLE: PayoutRow[] = [
  { combo: 'Suited Trips', odds: 100 },
  { combo: 'Straight Flush', odds: 40 },
  { combo: 'Three of a Kind', odds: 30 },
  { combo: 'Straight', odds: 10 },
  { combo: 'Flush', odds: 5 },
]

/** Blazing 7s — count of 7s across player's two cards + dealer upcard. */
export const BLAZING_PAYTABLE: PayoutRow[] = [
  { combo: 'Three Suited 7s', odds: 1000, note: 'JACKPOT' },
  { combo: 'Three Same-Color 7s', odds: 500 },
  { combo: 'Three 7s', odds: 200 },
  { combo: 'Two 7s', odds: 25 },
  { combo: 'One 7', odds: 2 },
]
