import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Card,
  Phase,
  PlayerHand,
  Rules,
  SideBetKey,
  SideBetResult,
  SideBets,
} from '../types'
import { Shoe } from '../game/deck'
import { handValue, isBust, isNaturalBlackjack } from '../game/handValue'
import { evaluateSideBets } from '../game/sideBets'
import { isFreeDoubleEligible, isFreeSplitEligible } from '../game/freeBet'
import { basicStrategy, type Advice } from '../game/strategy'
import {
  DEFAULT_RULES,
  STARTING_BANKROLL,
  TABLE_MIN,
} from '../game/payouts'

// Animation cadence (ms).
const DEAL_GAP = 360
const DEALER_GAP = 620
const REVEAL_GAP = 480

// Loan feature: a typical U.S. personal-loan APR. Interest compounds once a
// year; in casino time a year passes every 5 minutes, so the balance steps up
// quietly rather than ticking live.
export const LOAN_APR = 0.125 // 12.5%
const COMPOUND_INTERVAL_MS = 5 * 60 * 1000 // one yearly compounding every 5 minutes

const EMPTY_SIDE_BETS: SideBets = { trilock: 0, fortune: 0, blazing: 0 }

export interface GameState {
  phase: Phase
  bankroll: number
  mainBet: number
  sideBets: SideBets
  dealer: { cards: Card[] }
  hands: PlayerHand[]
  activeHandIndex: number
  insuranceBet: number
  insuranceOffered: boolean
  sideResults: SideBetResult[]
  message: string
  /** Net bankroll change accumulated across the current round (for the result banner). */
  roundNet: number
  /** Realized session profit/loss, updated once per round at settlement. */
  sessionNet: number
  /** Outstanding loan balance (principal + accrued interest). */
  debt: number
  /** Cumulative interest charged this session — subtracted from net proceeds. */
  interestCost: number
  showResult: boolean
  penetration: number
  shuffling: boolean
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function makeInitialState(): GameState {
  return {
    phase: 'betting',
    bankroll: STARTING_BANKROLL,
    mainBet: 0,
    sideBets: { ...EMPTY_SIDE_BETS },
    dealer: { cards: [] },
    hands: [],
    activeHandIndex: 0,
    insuranceBet: 0,
    insuranceOffered: false,
    sideResults: [],
    message: 'Place your bets',
    roundNet: 0,
    sessionNet: 0,
    debt: 0,
    interestCost: 0,
    showResult: false,
    penetration: 0,
    shuffling: false,
  }
}

function dealerNatural(cards: Card[]): boolean {
  if (cards.length < 2) return false
  const faceUp = cards.map((c) => ({ ...c, faceDown: false }))
  return handValue(faceUp).blackjack
}

function dealerShouldHit(cards: Card[], rules: Rules): boolean {
  const faceUp = cards.map((c) => ({ ...c, faceDown: false }))
  const { total, soft } = handValue(faceUp)
  if (total < 17) return true
  if (total === 17 && soft && rules.hitSoft17) return true
  return false
}

export function useBlackjack(rules: Rules = DEFAULT_RULES) {
  const [state, setStateRaw] = useState<GameState>(makeInitialState)
  const stateRef = useRef<GameState>(state)
  const shoeRef = useRef<Shoe | undefined>(undefined)
  const handIdRef = useRef(0)
  const busyRef = useRef(false)
  const lastBetsRef = useRef<{ main: number; side: SideBets } | null>(null)

  if (!shoeRef.current) shoeRef.current = new Shoe(rules.numDecks)

  const commit = useCallback((next: GameState) => {
    stateRef.current = next
    setStateRaw(next)
  }, [])

  const update = useCallback(
    (fn: (s: GameState) => GameState) => {
      commit(fn(stateRef.current))
    },
    [commit],
  )

  const newHand = useCallback((bet: number, fromSplit = false): PlayerHand => {
    return {
      id: `h${handIdRef.current++}`,
      cards: [],
      bet,
      freeAmount: 0,
      done: false,
      doubled: false,
      splitAces: false,
      fromSplit,
    }
  }, [])

  // ---- Card drawing helpers ----------------------------------------------

  const drawToPlayer = useCallback(
    (handIndex: number, faceDown = false) => {
      const card = shoeRef.current!.draw(faceDown)
      update((s) => {
        const hands = s.hands.map((h, i) =>
          i === handIndex ? { ...h, cards: [...h.cards, card] } : h,
        )
        return { ...s, hands, penetration: shoeRef.current!.penetration }
      })
      return card
    },
    [update],
  )

  const drawToDealer = useCallback(
    (faceDown = false) => {
      const card = shoeRef.current!.draw(faceDown)
      update((s) => ({
        ...s,
        dealer: { cards: [...s.dealer.cards, card] },
        penetration: shoeRef.current!.penetration,
      }))
      return card
    },
    [update],
  )

  const revealHole = useCallback(() => {
    update((s) => ({
      ...s,
      dealer: { cards: s.dealer.cards.map((c) => ({ ...c, faceDown: false })) },
    }))
  }, [update])

  // ---- Settlement ---------------------------------------------------------

  const settle = useCallback(async () => {
    revealHole()
    await sleep(REVEAL_GAP)

    const s = stateRef.current
    const dealerFaceUp = s.dealer.cards.map((c) => ({ ...c, faceDown: false }))
    const dealerTotal = handValue(dealerFaceUp).total
    const dealerBust = dealerTotal > 21
    // Free Bet: a dealer total of exactly 22 pushes against any non-busted hand.
    const dealer22Push = rules.freeBetMode && dealerTotal === 22

    let payouts = 0
    let net = 0
    const hands = s.hands.map((h) => {
      const playerTotal = handValue(h.cards).total
      // A winning hand returns the player's stake plus even money on the full
      // wager (player stake + casino free amount).
      const winReturn = 2 * h.bet + h.freeAmount
      const winNet = h.bet + h.freeAmount
      if (playerTotal > 21) {
        net -= h.bet // free amount costs nothing when it loses
        return { ...h, outcome: 'bust' as const, net: -h.bet, done: true }
      }
      if (dealer22Push) {
        payouts += h.bet // push: return the player's stake only
        return { ...h, outcome: 'push' as const, net: 0, done: true }
      }
      if (dealerBust || playerTotal > dealerTotal) {
        payouts += winReturn
        net += winNet
        return { ...h, outcome: 'win' as const, net: winNet, done: true }
      }
      if (playerTotal < dealerTotal) {
        net -= h.bet
        return { ...h, outcome: 'lose' as const, net: -h.bet, done: true }
      }
      payouts += h.bet // push: return stake
      return { ...h, outcome: 'push' as const, net: 0, done: true }
    })

    update((st) => ({
      ...st,
      hands,
      bankroll: st.bankroll + payouts,
      roundNet: st.roundNet + net,
      sessionNet: st.sessionNet + st.roundNet + net,
      phase: 'roundOver',
      showResult: true,
      message: net > 0 ? 'You win!' : net < 0 ? 'Dealer wins' : 'Push',
    }))
  }, [revealHole, rules.freeBetMode, update])

  // ---- Dealer turn --------------------------------------------------------

  const dealerTurn = useCallback(async () => {
    update((s) => ({ ...s, phase: 'dealerTurn', message: "Dealer's turn" }))
    revealHole()
    await sleep(REVEAL_GAP)

    const everyoneBusted = stateRef.current.hands.every((h) => isBust(h.cards))
    if (!everyoneBusted) {
      while (dealerShouldHit(stateRef.current.dealer.cards, rules)) {
        await sleep(DEALER_GAP)
        drawToDealer(false)
      }
      await sleep(DEALER_GAP)
    }
    await settle()
  }, [drawToDealer, revealHole, rules, settle, update])

  // ---- Advancing through player hands -------------------------------------

  const advanceHand = useCallback(async () => {
    // Find the next playable hand.
    let idx = stateRef.current.hands.findIndex((h) => !h.done)
    while (idx !== -1) {
      // A freshly created split hand has a single card; deal its second card.
      if (stateRef.current.hands[idx].cards.length === 1) {
        update((s) => ({ ...s, activeHandIndex: idx }))
        await sleep(DEAL_GAP)
        drawToPlayer(idx)
        await sleep(DEAL_GAP)
        const hand = stateRef.current.hands[idx]
        const total = handValue(hand.cards).total
        if (hand.splitAces || total >= 21) {
          update((s) => ({
            ...s,
            hands: s.hands.map((h, i) => (i === idx ? { ...h, done: true } : h)),
          }))
          idx = stateRef.current.hands.findIndex((h) => !h.done)
          continue
        }
      }
      update((s) => ({
        ...s,
        phase: 'playerTurn',
        activeHandIndex: idx,
        message:
          s.hands.length > 1 ? `Playing hand ${idx + 1}` : 'Your move',
      }))
      return
    }
    // No playable hands remain.
    await dealerTurn()
  }, [dealerTurn, drawToPlayer, update])

  // ---- Opening resolution (peek, naturals) --------------------------------

  const finishOpening = useCallback(async () => {
    const s = stateRef.current
    const dealerUp = s.dealer.cards[0]
    const peekable = dealerUp.rank === 'A' || handValue([dealerUp]).total === 10

    if (peekable && dealerNatural(s.dealer.cards)) {
      revealHole()
      await sleep(REVEAL_GAP)
      const cur = stateRef.current
      let payouts = 0
      let net = 0
      const hands = cur.hands.map((h) => {
        if (isNaturalBlackjack(h.cards, h.fromSplit)) {
          payouts += h.bet // push, return stake
          return { ...h, outcome: 'push' as const, net: 0, done: true }
        }
        net -= h.bet
        return { ...h, outcome: 'lose' as const, net: -h.bet, done: true }
      })
      // Insurance pays 2:1 (returns stake + 2x).
      if (cur.insuranceBet > 0) {
        payouts += cur.insuranceBet * 3
        net += cur.insuranceBet * 2
      }
      update((st) => ({
        ...st,
        hands,
        bankroll: st.bankroll + payouts,
        roundNet: st.roundNet + net,
        sessionNet: st.sessionNet + st.roundNet + net,
        phase: 'roundOver',
        showResult: true,
        message: 'Dealer has Blackjack',
      }))
      return
    }

    // No dealer blackjack. A funded insurance bet (if any) is already lost.
    if (s.insuranceBet > 0) {
      update((st) => ({ ...st, roundNet: st.roundNet - st.insuranceBet }))
    }

    // Player natural blackjack pays immediately (single, unsplit hand).
    const onlyHand = stateRef.current.hands[0]
    if (
      stateRef.current.hands.length === 1 &&
      isNaturalBlackjack(onlyHand.cards, onlyHand.fromSplit)
    ) {
      // Show the dealer's hand so the resolved round is unambiguous.
      revealHole()
      await sleep(REVEAL_GAP)
      const win = onlyHand.bet * rules.blackjackPays
      update((st) => ({
        ...st,
        hands: st.hands.map((h, i) =>
          i === 0 ? { ...h, outcome: 'blackjack' as const, net: win, done: true } : h,
        ),
        bankroll: st.bankroll + onlyHand.bet + win,
        roundNet: st.roundNet + win,
        sessionNet: st.sessionNet + st.roundNet + win,
        phase: 'roundOver',
        showResult: true,
        message: 'Blackjack! Pays 3:2',
      }))
      return
    }

    await advanceHand()
  }, [advanceHand, revealHole, rules.blackjackPays, update])

  // ---- Insurance ----------------------------------------------------------

  const takeInsurance = useCallback(
    async (amount?: number) => {
      const s = stateRef.current
      if (s.phase !== 'insurance') return
      const max = Math.min(Math.floor(s.mainBet / 2), s.bankroll)
      const bet = Math.max(0, Math.min(amount ?? max, max))
      update((st) => ({
        ...st,
        bankroll: st.bankroll - bet,
        insuranceBet: bet,
        phase: 'dealing',
        message: bet > 0 ? `Insurance: $${bet}` : 'Insurance declined',
      }))
      await sleep(REVEAL_GAP)
      await finishOpening()
    },
    [finishOpening, update],
  )

  const declineInsurance = useCallback(async () => {
    const s = stateRef.current
    if (s.phase !== 'insurance') return
    update((st) => ({ ...st, phase: 'dealing', message: 'Insurance declined' }))
    await sleep(200)
    await finishOpening()
  }, [finishOpening, update])

  // ---- Deal ---------------------------------------------------------------

  const deal = useCallback(async () => {
    const s = stateRef.current
    if (s.phase !== 'betting') return

    const sideTotal = s.sideBets.trilock + s.sideBets.fortune + s.sideBets.blazing
    const stake = s.mainBet + sideTotal
    if (s.mainBet < TABLE_MIN) {
      update((st) => ({ ...st, message: `Minimum main bet is $${TABLE_MIN}` }))
      return
    }
    if (stake > s.bankroll) {
      update((st) => ({ ...st, message: 'Not enough chips for that wager' }))
      return
    }

    lastBetsRef.current = { main: s.mainBet, side: { ...s.sideBets } }

    // Rebuild the shoe if the deck count changed, or reshuffle behind the cut card.
    let shuffling = false
    if (shoeRef.current!.decks !== rules.numDecks) {
      shoeRef.current = new Shoe(rules.numDecks)
      shuffling = true
    } else if (shoeRef.current!.needsReshuffle) {
      shoeRef.current!.reset()
      shuffling = true
    }

    commit({
      ...s,
      phase: 'dealing',
      dealer: { cards: [] },
      hands: [newHand(s.mainBet)],
      activeHandIndex: 0,
      insuranceBet: 0,
      insuranceOffered: false,
      sideResults: [],
      roundNet: 0,
      showResult: false,
      shuffling,
      bankroll: s.bankroll - stake,
      message: shuffling ? 'Shuffling…' : 'Dealing…',
      penetration: shoeRef.current!.penetration,
    })

    if (shuffling) await sleep(500)
    await sleep(DEAL_GAP)
    drawToPlayer(0)
    await sleep(DEAL_GAP)
    drawToDealer(false)
    await sleep(DEAL_GAP)
    drawToPlayer(0)
    await sleep(DEAL_GAP)
    drawToDealer(true)
    await sleep(DEAL_GAP)

    // Grade side bets on the player's two cards + dealer upcard.
    const cur = stateRef.current
    const sideResults = evaluateSideBets(
      cur.hands[0].cards,
      cur.dealer.cards[0],
      cur.sideBets,
    )
    const sideReturn = sideResults.reduce(
      (acc, r) => acc + (r.won ? r.bet * (r.odds + 1) : 0),
      0,
    )
    const sideNet = sideResults.reduce((acc, r) => acc + r.net, 0)
    update((st) => ({
      ...st,
      sideResults,
      bankroll: st.bankroll + sideReturn,
      roundNet: st.roundNet + sideNet,
    }))
    if (sideResults.length > 0) await sleep(REVEAL_GAP)

    // Insurance offer when the dealer shows an Ace.
    if (stateRef.current.dealer.cards[0].rank === 'A') {
      const max = Math.min(
        Math.floor(stateRef.current.mainBet / 2),
        stateRef.current.bankroll,
      )
      if (max > 0) {
        update((st) => ({
          ...st,
          phase: 'insurance',
          insuranceOffered: true,
          message: 'Insurance? Dealer shows an Ace',
        }))
        return // wait for the player's insurance decision
      }
    }

    await finishOpening()
  }, [commit, drawToDealer, drawToPlayer, finishOpening, newHand, rules.numDecks, update])

  // ---- Player actions -----------------------------------------------------

  const hit = useCallback(async () => {
    if (stateRef.current.phase !== 'playerTurn') return
    const idx = stateRef.current.activeHandIndex
    drawToPlayer(idx)
    await sleep(DEAL_GAP)
    const hand = stateRef.current.hands[idx]
    const total = handValue(hand.cards).total
    if (total >= 21) {
      update((s) => ({
        ...s,
        hands: s.hands.map((h, i) => (i === idx ? { ...h, done: true } : h)),
      }))
      await advanceHand()
    }
  }, [advanceHand, drawToPlayer, update])

  const stand = useCallback(async () => {
    if (stateRef.current.phase !== 'playerTurn') return
    const idx = stateRef.current.activeHandIndex
    update((s) => ({
      ...s,
      hands: s.hands.map((h, i) => (i === idx ? { ...h, done: true } : h)),
    }))
    await advanceHand()
  }, [advanceHand, update])

  const double = useCallback(async () => {
    if (stateRef.current.phase !== 'playerTurn') return
    const s = stateRef.current
    const idx = s.activeHandIndex
    const hand = s.hands[idx]
    if (hand.cards.length !== 2 || hand.splitAces) return
    if (hand.fromSplit && !rules.doubleAfterSplit) return

    const wager = hand.bet > 0 ? hand.bet : hand.freeAmount
    const free = rules.freeBetMode && isFreeDoubleEligible(hand.cards)

    update((st) => ({
      ...st,
      // A free double costs nothing; a paid double matches the wager.
      bankroll: st.bankroll - (free ? 0 : wager),
      hands: st.hands.map((h, i) =>
        i === idx
          ? free
            ? { ...h, freeAmount: h.freeAmount + wager, doubled: true }
            : { ...h, bet: h.bet + wager, doubled: true }
          : h,
      ),
    }))
    drawToPlayer(idx)
    await sleep(DEAL_GAP)
    update((st) => ({
      ...st,
      hands: st.hands.map((h, i) => (i === idx ? { ...h, done: true } : h)),
    }))
    await advanceHand()
  }, [advanceHand, drawToPlayer, rules.doubleAfterSplit, rules.freeBetMode, update])

  const split = useCallback(async () => {
    if (stateRef.current.phase !== 'playerTurn') return
    const s = stateRef.current
    const idx = s.activeHandIndex
    const hand = s.hands[idx]
    const wager = hand.bet > 0 ? hand.bet : hand.freeAmount
    const freeSplit = rules.freeBetMode && isFreeSplitEligible(hand.cards[0].rank)
    if (
      hand.cards.length !== 2 ||
      hand.cards[0].rank !== hand.cards[1].rank ||
      s.hands.length >= rules.maxSplitHands
    ) {
      return
    }
    const isAces = hand.cards[0].rank === 'A'
    // Reuse the original hand's id for the first split hand so its React subtree
    // is preserved and its existing card doesn't replay the deal animation.
    const handA: PlayerHand = {
      ...hand,
      cards: [hand.cards[0]],
      splitAces: isAces,
      fromSplit: true,
      done: false,
      doubled: false,
    }
    // Free split: the casino funds the new hand. Paid split: the player matches.
    const handB = newHand(0, true)
    handB.cards = [hand.cards[1]]
    handB.splitAces = isAces
    handB.bet = freeSplit ? 0 : wager
    handB.freeAmount = freeSplit ? wager : 0

    update((st) => {
      const hands = [...st.hands]
      hands.splice(idx, 1, handA, handB)
      return {
        ...st,
        hands,
        bankroll: st.bankroll - (freeSplit ? 0 : wager),
        message: freeSplit ? 'Free Split!' : 'Split!',
      }
    })

    // Deal the second card to the first split hand.
    await sleep(DEAL_GAP)
    drawToPlayer(idx)
    await sleep(DEAL_GAP)
    const dealt = stateRef.current.hands[idx]
    const total = handValue(dealt.cards).total
    if (dealt.splitAces || total >= 21) {
      update((st) => ({
        ...st,
        hands: st.hands.map((h, i) => (i === idx ? { ...h, done: true } : h)),
      }))
      await advanceHand()
    } else {
      update((st) => ({ ...st, activeHandIndex: idx, phase: 'playerTurn' }))
    }
  }, [
    advanceHand,
    drawToPlayer,
    newHand,
    rules.freeBetMode,
    rules.maxSplitHands,
    update,
  ])

  // ---- Betting (only in the betting phase) --------------------------------

  const addToMain = useCallback(
    (amount: number) => {
      update((s) => {
        if (s.phase !== 'betting') return s
        const committed = s.mainBet + s.sideBets.trilock + s.sideBets.fortune + s.sideBets.blazing
        // No table maximum — the only cap is your available bankroll.
        const room = Math.min(amount, s.bankroll - committed)
        if (room <= 0) return s
        return { ...s, mainBet: s.mainBet + room, showResult: false }
      })
    },
    [update],
  )

  const addToSide = useCallback(
    (key: SideBetKey, amount: number) => {
      update((s) => {
        if (s.phase !== 'betting') return s
        const committed = s.mainBet + s.sideBets.trilock + s.sideBets.fortune + s.sideBets.blazing
        const room = Math.min(amount, s.bankroll - committed)
        if (room <= 0) return s
        return {
          ...s,
          sideBets: { ...s.sideBets, [key]: s.sideBets[key] + room },
          showResult: false,
        }
      })
    },
    [update],
  )

  const allIn = useCallback(() => {
    update((s) => {
      if (s.phase !== 'betting') return s
      const committed = s.mainBet + s.sideBets.trilock + s.sideBets.fortune + s.sideBets.blazing
      const room = s.bankroll - committed
      if (room <= 0) return s
      return { ...s, mainBet: s.mainBet + room, showResult: false }
    })
  }, [update])

  const clearBets = useCallback(() => {
    update((s) =>
      s.phase === 'betting'
        ? { ...s, mainBet: 0, sideBets: { ...EMPTY_SIDE_BETS } }
        : s,
    )
  }, [update])

  const repeatBet = useCallback(() => {
    update((s) => {
      if (s.phase !== 'betting' || !lastBetsRef.current) return s
      const { main, side } = lastBetsRef.current
      const stake = main + side.trilock + side.fortune + side.blazing
      if (stake > s.bankroll) return s
      return { ...s, mainBet: main, sideBets: { ...side }, showResult: false }
    })
  }, [update])

  const nextRound = useCallback(() => {
    update((s) => {
      if (s.phase !== 'roundOver') return s
      return {
        ...makeInitialState(),
        bankroll: s.bankroll,
        sessionNet: s.sessionNet,
        debt: s.debt,
        interestCost: s.interestCost,
        penetration: s.penetration,
        mainBet: 0,
        sideBets: { ...EMPTY_SIDE_BETS },
        message: 'Place your bets',
      }
    })
  }, [update])

  const dismissResult = useCallback(() => {
    update((s) => ({ ...s, showResult: false }))
  }, [update])

  // Wipe everything — balances, debt, session net — and deal from a fresh shoe.
  const resetGame = useCallback(() => {
    busyRef.current = false
    lastBetsRef.current = null
    shoeRef.current = new Shoe(rules.numDecks)
    commit(makeInitialState())
  }, [commit, rules.numDecks])

  const addFunds = useCallback(
    (amount: number) => {
      update((s) => ({ ...s, bankroll: s.bankroll + amount }))
    },
    [update],
  )

  // ---- Loans --------------------------------------------------------------

  const takeLoan = useCallback(
    (amount: number) => {
      update((s) => {
        if (s.phase !== 'betting' && s.phase !== 'roundOver') return s
        if (amount <= 0) return s
        return {
          ...s,
          bankroll: s.bankroll + amount,
          debt: s.debt + amount,
          message: `Borrowed $${amount.toLocaleString()} — interest is ticking`,
        }
      })
    },
    [update],
  )

  const repayLoan = useCallback(() => {
    update((s) => {
      if (s.phase !== 'betting' && s.phase !== 'roundOver') return s
      const pay = Math.min(s.bankroll, s.debt)
      if (pay <= 0) return s
      const debt = s.debt - pay < 0.01 ? 0 : s.debt - pay
      return {
        ...s,
        bankroll: s.bankroll - pay,
        debt,
        message: debt <= 0 ? 'Loan repaid in full' : `Repaid $${Math.round(pay).toLocaleString()}`,
      }
    })
  }, [update])

  // Compound one year of interest every 5 real minutes while a balance is owed.
  useEffect(() => {
    const id = setInterval(() => {
      update((s) => {
        if (s.debt <= 0) return s
        const interest = s.debt * LOAN_APR
        return {
          ...s,
          debt: s.debt + interest,
          interestCost: s.interestCost + interest,
        }
      })
    }, COMPOUND_INTERVAL_MS)
    return () => clearInterval(id)
  }, [update])

  // ---- Re-entrancy lock ---------------------------------------------------
  // One in-flight action holds the lock for its entire promise chain (including
  // the dealer's turn and settlement), so rapid clicks during animations can't
  // double-act. The lock releases exactly when control returns to the player.
  const locked = useMemo(() => {
    const withLock =
      <A extends unknown[]>(fn: (...a: A) => Promise<void>) =>
      async (...a: A) => {
        if (busyRef.current) return
        busyRef.current = true
        try {
          await fn(...a)
        } finally {
          busyRef.current = false
        }
      }
    return {
      deal: withLock(deal),
      hit: withLock(hit),
      stand: withLock(stand),
      double: withLock(double),
      split: withLock(split),
      takeInsurance: withLock(takeInsurance),
      declineInsurance: withLock(declineInsurance),
    }
  }, [deal, hit, stand, double, split, takeInsurance, declineInsurance])

  // ---- Derived helpers ----------------------------------------------------

  const activeHand = state.hands[state.activeHandIndex]
  const dealerUp = state.dealer.cards[0]

  const doubleIsFree = useMemo(() => {
    if (state.phase !== 'playerTurn' || !activeHand) return false
    return (
      rules.freeBetMode &&
      activeHand.cards.length === 2 &&
      !activeHand.splitAces &&
      (!activeHand.fromSplit || rules.doubleAfterSplit) &&
      isFreeDoubleEligible(activeHand.cards)
    )
  }, [activeHand, rules.doubleAfterSplit, rules.freeBetMode, state.phase])

  const canDouble = useMemo(() => {
    if (state.phase !== 'playerTurn' || !activeHand) return false
    if (activeHand.cards.length !== 2 || activeHand.splitAces) return false
    if (activeHand.fromSplit && !rules.doubleAfterSplit) return false
    // No-limit sandbox: doubling is always allowed (bankroll may go negative).
    return true
  }, [activeHand, rules.doubleAfterSplit, state.phase])

  const splitIsFree = useMemo(() => {
    if (state.phase !== 'playerTurn' || !activeHand) return false
    return (
      rules.freeBetMode &&
      activeHand.cards.length === 2 &&
      activeHand.cards[0].rank === activeHand.cards[1].rank &&
      state.hands.length < rules.maxSplitHands &&
      isFreeSplitEligible(activeHand.cards[0].rank)
    )
  }, [activeHand, rules.freeBetMode, rules.maxSplitHands, state.hands.length, state.phase])

  const canSplit = useMemo(() => {
    if (state.phase !== 'playerTurn' || !activeHand) return false
    if (
      activeHand.cards.length !== 2 ||
      activeHand.cards[0].rank !== activeHand.cards[1].rank ||
      state.hands.length >= rules.maxSplitHands
    ) {
      return false
    }
    // No-limit sandbox: splitting a pair is always allowed (bankroll may go negative).
    return true
  }, [activeHand, rules.maxSplitHands, state.hands.length, state.phase])

  const advice = useMemo<Advice | null>(() => {
    if (state.phase !== 'playerTurn' || !activeHand || !dealerUp) return null
    return basicStrategy(activeHand.cards, dealerUp, {
      canDouble,
      canSplit,
      hitSoft17: rules.hitSoft17,
    })
  }, [activeHand, canDouble, canSplit, dealerUp, rules.hitSoft17, state.phase])

  return {
    state,
    rules,
    // lifecycle
    deal: locked.deal,
    nextRound,
    dismissResult,
    resetGame,
    // player actions
    hit: locked.hit,
    stand: locked.stand,
    double: locked.double,
    split: locked.split,
    takeInsurance: locked.takeInsurance,
    declineInsurance: locked.declineInsurance,
    // betting
    addToMain,
    addToSide,
    allIn,
    clearBets,
    repeatBet,
    addFunds,
    // loans
    takeLoan,
    repayLoan,
    // derived
    canDouble,
    canSplit,
    doubleIsFree,
    splitIsFree,
    advice,
  }
}

export type BlackjackApi = ReturnType<typeof useBlackjack>
