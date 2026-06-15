import {
  BLAZING_PAYTABLE,
  FORTUNE_PAYTABLE,
  TRILOCK_PAYTABLE,
  type PayoutRow,
} from '../game/payouts'
import type { Rules } from '../types'
import './Paytable.css'

interface PaytableProps {
  open: boolean
  onClose: () => void
  rules: Rules
}

function Table({ title, blurb, rows, edge }: {
  title: string
  blurb: string
  rows: PayoutRow[]
  edge: string
}) {
  return (
    <section className="pt-block">
      <header>
        <h3>{title}</h3>
        <span className="pt-edge">house edge {edge}</span>
      </header>
      <p className="pt-blurb">{blurb}</p>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.combo}>
              <td className="pt-combo">
                {r.combo}
                {r.note && <span className="pt-note">{r.note}</span>}
              </td>
              <td className="pt-odds">{r.odds}:1</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function Paytable({ open, onClose, rules }: PaytableProps) {
  const dealerRule = rules.hitSoft17
    ? 'dealer hits soft 17'
    : 'dealer stands on all 17s'
  return (
    <>
      <div
        className={`pt-scrim ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden
      />
      <aside className={`paytable ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="pt-header">
          <h2>Paytables</h2>
          <button className="pt-close" onClick={onClose} aria-label="Close paytables">
            ✕
          </button>
        </div>
        <p className="pt-disclaimer">
          Side-bet payouts are <em>not</em> standardized — real casinos vary. These
          are typical tables. All three side bets use your first two cards plus the
          dealer's upcard and are graded independently of your hand.
        </p>

        <Table
          title="Fortune Blackjack"
          blurb="A renamed Lucky Lucky. The three-card total (and matching suits) decides the win."
          rows={FORTUNE_PAYTABLE}
          edge="~7.9%"
        />
        <Table
          title="TriLock"
          blurb="Poker-style scoring (à la TriLux / 21+3) on your two cards and the dealer upcard."
          rows={TRILOCK_PAYTABLE}
          edge="several %"
        />
        <Table
          title="Blazing 7s"
          blurb="Pays on the number of 7s among the three cards. Three suited 7s is the jackpot."
          rows={BLAZING_PAYTABLE}
          edge="high / progressive"
        />

        <section className="pt-block">
          <header>
            <h3>Main Game{rules.freeBetMode ? ' · Free Bet' : ''}</h3>
            <span className="pt-edge">house edge {rules.freeBetMode ? '~1%' : '~0.5%'}</span>
          </header>
          <table>
            <tbody>
              <tr><td className="pt-combo">Blackjack (natural)</td><td className="pt-odds">3:2</td></tr>
              <tr><td className="pt-combo">Win</td><td className="pt-odds">1:1</td></tr>
              <tr><td className="pt-combo">Insurance</td><td className="pt-odds">2:1</td></tr>
            </tbody>
          </table>
          <p className="pt-blurb">
            {rules.numDecks}-deck shoe · {dealerRule} · double on any two · split up
            to {rules.maxSplitHands} hands
            {rules.doubleAfterSplit ? ' · double after split' : ''} · insurance
            offered on a dealer Ace.
          </p>
          {rules.freeBetMode && (
            <p className="pt-blurb">
              <strong>Free Bet:</strong> the house pays for doubles on hard 9/10/11
              and splits on any non-ten pair — you risk nothing extra and are paid as
              if you'd wagered it. In exchange, a dealer total of <strong>22 pushes</strong>{' '}
              against any hand of 21 or less (a natural blackjack still wins). Free Bet
              uses a different basic strategy than the classic game.
            </p>
          )}
        </section>
      </aside>
    </>
  )
}
