export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'

export type Rank =
  | 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  rank: Rank
  suit: Suit
  /** Unique id assigned when the card is drawn — used for React keys + deal animations. */
  id: string
  /** Dealer hole card stays hidden until the dealer's turn. */
  faceDown?: boolean
}

export type HandOutcome =
  | 'blackjack'
  | 'win'
  | 'push'
  | 'lose'
  | 'bust'
  | 'surrender'

export interface PlayerHand {
  id: string
  cards: Card[]
  /** Amount the player has at risk on this hand. */
  bet: number
  /**
   * Free Bet mode only: amount the casino staked on the player's behalf (a free
   * double or the second hand of a free split). It wins like a real wager but
   * costs the player nothing if it loses.
   */
  freeAmount: number
  /** True once the hand can take no more actions (stand / bust / doubled / 21). */
  done: boolean
  doubled: boolean
  /** Hands created by splitting aces receive exactly one card and auto-stand. */
  splitAces: boolean
  fromSplit: boolean
  outcome?: HandOutcome
  /** Net change to bankroll attributable to this hand (excludes returned stake bookkeeping). */
  net?: number
}

export type SideBetKey = 'trilock' | 'fortune' | 'blazing'

export interface SideBets {
  trilock: number
  fortune: number
  blazing: number
}

export interface SideBetResult {
  key: SideBetKey
  label: string
  /** Winning combination name, or null if it lost. */
  combo: string | null
  /** Payout odds to one (e.g. 10 means 10:1). 0 when the bet loses. */
  odds: number
  bet: number
  /** Net profit (bet * odds) when winning, or -bet when losing. */
  net: number
  won: boolean
}

export type Phase =
  | 'betting'
  | 'dealing'
  | 'insurance'
  | 'playerTurn'
  | 'dealerTurn'
  | 'settle'
  | 'roundOver'

export interface Rules {
  numDecks: number
  /** Dealer hits soft 17 when true, otherwise stands on all 17s. */
  hitSoft17: boolean
  blackjackPays: number // 1.5 for 3:2, 1.2 for 6:5
  maxSplitHands: number
  doubleAfterSplit: boolean
  /**
   * Free Bet (Free Double) Blackjack: the casino pays for doubles on hard
   * 9/10/11 and splits on non-ten pairs, but a dealer total of 22 pushes
   * against any non-busted player hand.
   */
  freeBetMode: boolean
}
