import { useMemo } from 'react'
import type { Card, Rank, Rules } from '../types'
import type { BlackjackApi } from '../hooks/useBlackjack'
import { basicStrategy, type Action } from '../game/strategy'
import { handValue } from '../game/handValue'
import './CheatSheet.css'

interface CheatSheetProps {
  open: boolean
  onClose: () => void
  api: BlackjackApi
  rules: Rules
}

const ACTION_INFO: Record<Action, { label: string; cls: string }> = {
  H: { label: 'Hit', cls: 'a-hit' },
  S: { label: 'Stand', cls: 'a-stand' },
  D: { label: 'Double', cls: 'a-double' },
  P: { label: 'Split', cls: 'a-split' },
}

const DEALER_COLS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'A']

function mk(rank: Rank): Card {
  return { rank, suit: 'spades', id: `cs-${rank}` }
}

/** Two cards summing to a hard total (no ace, not a pair). */
function hardCards(total: number): [Card, Card] {
  const a = Math.min(10, total - 2)
  return [mk(String(a) as Rank), mk(String(total - a) as Rank)]
}

function cell(cards: [Card, Card], up: Rank, h17: boolean) {
  const action = basicStrategy(cards, mk(up), {
    canDouble: true,
    canSplit: true,
    hitSoft17: h17,
  }).action
  return { letter: action, ...ACTION_INFO[action] }
}

function StrategyGrid({ h17 }: { h17: boolean }) {
  const hard = useMemo(
    () => [16, 15, 14, 13, 12, 11, 10, 9, 8].map((t) => ({ t, cards: hardCards(t) })),
    [],
  )
  const soft = useMemo(
    () =>
      [9, 8, 7, 6, 5, 4, 3, 2].map((x) => ({
        label: `A,${x}`,
        cards: [mk('A'), mk(String(x) as Rank)] as [Card, Card],
      })),
    [],
  )
  const pairs = useMemo(
    () =>
      (['A', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as Rank[]).map((r) => ({
        label: `${r},${r}`,
        cards: [mk(r), mk(r)] as [Card, Card],
      })),
    [],
  )

  const Head = () => (
    <tr>
      <th className="cs-corner">vs →</th>
      {DEALER_COLS.map((c) => (
        <th key={c}>{c}</th>
      ))}
    </tr>
  )

  return (
    <div className="cs-grid-wrap">
      <table className="cs-grid">
        <thead>
          <Head />
        </thead>
        <tbody>
          <tr className="cs-section-row">
            <td colSpan={11}>Hard totals · 17+ always stand</td>
          </tr>
          {hard.map(({ t, cards }) => (
            <tr key={`h${t}`}>
              <th>{t}</th>
              {DEALER_COLS.map((up) => {
                const c = cell(cards, up, h17)
                return (
                  <td key={up} className={c.cls} title={c.label}>
                    {/* letter */}
                    {c.letter}
                  </td>
                )
              })}
            </tr>
          ))}

          <tr className="cs-section-row">
            <td colSpan={11}>Soft totals (with an Ace)</td>
          </tr>
          {soft.map(({ label, cards }) => (
            <tr key={label}>
              <th>{label}</th>
              {DEALER_COLS.map((up) => {
                const c = cell(cards, up, h17)
                return (
                  <td key={up} className={c.cls} title={c.label}>
                    {c.letter}
                  </td>
                )
              })}
            </tr>
          ))}

          <tr className="cs-section-row">
            <td colSpan={11}>Pairs</td>
          </tr>
          {pairs.map(({ label, cards }) => (
            <tr key={label}>
              <th>{label}</th>
              {DEALER_COLS.map((up) => {
                const c = cell(cards, up, h17)
                return (
                  <td key={up} className={c.cls} title={c.label}>
                    {c.letter}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cs-legend">
        <span className="a-hit">H Hit</span>
        <span className="a-stand">S Stand</span>
        <span className="a-double">D Double</span>
        <span className="a-split">P Split</span>
      </div>
    </div>
  )
}

function BestMove({ api }: { api: BlackjackApi }) {
  const { state, advice, doubleIsFree, splitIsFree } = api
  let tone = 'neutral'
  let title = ''
  let detail = ''

  if (state.phase === 'insurance') {
    tone = 'warn'
    title = 'Decline insurance'
    detail = "It's a separate −EV bet; skip it without a card count."
  } else if (state.phase === 'playerTurn' && advice) {
    const hand = state.hands[state.activeHandIndex]
    const up = state.dealer.cards[0]
    const { total, soft } = handValue(hand.cards)
    tone = 'go'
    title = advice.label
    const extras: string[] = []
    if (doubleIsFree) extras.push('free double')
    if (splitIsFree) extras.push('free split')
    detail =
      `Your ${soft ? 'soft ' : ''}${total} vs dealer ${up?.rank}` +
      (extras.length ? ` · ${extras.join(' & ')} available` : '')
  } else if (state.phase === 'betting') {
    title = 'Place your wager'
    detail =
      'Side bets carry a high house edge — play them for fun, not value. Stick to basic strategy on the main hand.'
  } else if (state.phase === 'roundOver') {
    title = 'Round complete'
    detail = 'Deal a new hand to keep playing.'
  } else {
    title = 'Dealer is playing…'
    detail = 'Sit tight.'
  }

  return (
    <div className={`cs-bestmove ${tone}`}>
      <span className="cs-bm-eyebrow">Best move now</span>
      <span className="cs-bm-title">{title}</span>
      {detail && <span className="cs-bm-detail">{detail}</span>}
    </div>
  )
}

export function CheatSheet({ open, onClose, api, rules }: CheatSheetProps) {
  return (
    <>
      <div className={`cs-scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden />
      <aside className={`cheatsheet ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="cs-header">
          <h2>Cheat Sheet</h2>
          <button className="cs-close" onClick={onClose} aria-label="Close cheat sheet">
            ✕
          </button>
        </div>

        <BestMove api={api} />

        <section className="cs-block">
          <h3>Basic Strategy {rules.hitSoft17 ? '(H17)' : '(S17)'}</h3>
          {rules.freeBetMode ? (
            <p className="cs-note ember">
              This chart is the <strong>classic</strong> strategy. In Free Bet, double
              hard 9/10/11 and split almost every eligible pair — they're free, so take
              them far more often than the chart shows.
            </p>
          ) : (
            <p className="cs-note">
              Double/Split assume a fresh two-card hand. If you can't double, hit
              (stand on soft 18+).
            </p>
          )}
          <StrategyGrid h17={rules.hitSoft17} />
        </section>

        <section className="cs-block">
          <h3>Main Game</h3>
          <ul className="cs-rules">
            <li>Beat the dealer by getting closer to 21 without going over.</li>
            <li>Number cards = face value, J/Q/K = 10, Ace = 1 or 11.</li>
            <li>Natural blackjack (Ace + ten on the first two cards) pays <b>3:2</b>.</li>
            <li>
              Dealer {rules.hitSoft17 ? 'hits soft 17' : 'stands on all 17s'}; hits 16
              and under otherwise.
            </li>
            <li>Double = one card on double the wager. Split equal ranks into two hands.</li>
            <li>{rules.numDecks}-deck shoe, reshuffled at the cut card (~75%).</li>
          </ul>
        </section>

        <section className="cs-block">
          <h3>Insurance</h3>
          <ul className="cs-rules">
            <li>Offered only when the dealer shows an Ace.</li>
            <li>A side bet (up to half your wager) that the dealer has blackjack.</li>
            <li>Pays <b>2:1</b> if the dealer does. Basic strategy: <b>always decline</b>.</li>
          </ul>
        </section>

        <section className="cs-block">
          <h3>Free Bet (Free Double) Blackjack</h3>
          <ul className="cs-rules">
            <li>The house pays for <b>free doubles</b> on hard <b>9, 10, 11</b> — you win as if doubled but only ever risk your original bet.</li>
            <li><b>Free splits</b> on any pair except tens; the house funds the second hand.</li>
            <li>
              The catch: a dealer total of <b>22 pushes</b> against any hand of 21 or
              less. A natural blackjack still beats it.
            </li>
            <li>Because doubles/splits are free, you take them far more aggressively.</li>
            <li>House edge climbs to ~1% (vs ~0.5% classic) because of the 22-push.</li>
          </ul>
        </section>

        <section className="cs-block">
          <h3>Side Bets <span className="cs-sub">(first two cards + dealer upcard)</span></h3>
          <p className="cs-rule-name">TriLux</p>
          <ul className="cs-rules tight">
            <li>Poker on three cards: flush, straight, three of a kind, straight flush, suited trips. Top pays 100:1.</li>
          </ul>
          <p className="cs-rule-name">Fortune</p>
          <ul className="cs-rules tight">
            <li>The Lucky Lucky bet — three-card totals of 19/20/21, suited 21, 6-7-8 and 7-7-7. Top pays 200:1.</li>
          </ul>
          <p className="cs-rule-name">Blazing 7s</p>
          <ul className="cs-rules tight">
            <li>Pays on the number of 7s — one, two, or three 7s, with same-color and suited 7s paying the most (up to a 1000:1 jackpot).</li>
          </ul>
          <p className="cs-note">
            All three are graded independently of your hand. They're entertainment
            bets — the house edge is several percent. See <b>Paytables</b> for exact odds.
          </p>
        </section>
      </aside>
    </>
  )
}
