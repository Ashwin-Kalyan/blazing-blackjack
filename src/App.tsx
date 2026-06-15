import { useState } from 'react'
import { useBlackjack, LOAN_APR } from './hooks/useBlackjack'
import { DEFAULT_RULES } from './game/payouts'
import type { Rules } from './types'
import { Table } from './components/Table'
import { Controls } from './components/Controls'
import { Paytable } from './components/Paytable'
import { CheatSheet } from './components/CheatSheet'
import { LoanModal } from './components/LoanModal'
import './App.css'

/** Header logo mark — a flaming 7 in Classic, a 2× badge in Free Double. */
function BrandMark({ freeBet }: { freeBet: boolean }) {
  if (freeBet) {
    return (
      <svg className="brand-mark" viewBox="0 0 44 44" aria-hidden>
        <defs>
          <linearGradient id="bmDbl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe39c" />
            <stop offset="0.5" stopColor="#ff8a3d" />
            <stop offset="1" stopColor="#ff2f23" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r="18" fill="none" stroke="url(#bmDbl)" strokeWidth="3" />
        <text
          x="22"
          y="30"
          textAnchor="middle"
          fontFamily="'Cinzel', serif"
          fontWeight="900"
          fontSize="20"
          fill="url(#bmDbl)"
        >
          2×
        </text>
      </svg>
    )
  }
  return (
    <svg className="brand-mark" viewBox="0 0 44 44" aria-hidden>
      <defs>
        <linearGradient id="bmFire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe39c" />
          <stop offset="0.45" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff2f23" />
        </linearGradient>
      </defs>
      <path
        d="M22 2 C28 9 33 13 28 21 C34 19 36 27 30 35 C36 33 31 42 22 42 C13 42 8 33 14 35 C8 27 10 19 16 21 C11 13 16 9 22 2 Z"
        fill="url(#bmFire)"
      />
      <text
        x="22"
        y="31"
        textAnchor="middle"
        fontFamily="'Cinzel', serif"
        fontWeight="900"
        fontSize="20"
        fill="#3a1402"
      >
        7
      </text>
    </svg>
  )
}

export default function App() {
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES)
  const api = useBlackjack(rules)
  const [selectedChip, setSelectedChip] = useState(25)
  const [coachOn, setCoachOn] = useState(true)
  const [paytableOpen, setPaytableOpen] = useState(false)
  const [cheatOpen, setCheatOpen] = useState(false)
  const [loanOpen, setLoanOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const openPaytable = () => {
    setCheatOpen(false)
    setPaytableOpen(true)
  }
  const openCheat = () => {
    setPaytableOpen(false)
    setCheatOpen(true)
  }

  const { state } = api
  const penetrationPct = Math.round(state.penetration * 100)
  const cardsLeft = Math.max(0, Math.round(rules.numDecks * 52 * (1 - state.penetration)))

  // Table rules can only change between rounds.
  const canEditRules = state.phase === 'betting' || state.phase === 'roundOver'
  const toggleSoft17 = () =>
    canEditRules && setRules((r) => ({ ...r, hitSoft17: !r.hitSoft17 }))
  const toggleDecks = () =>
    canEditRules && setRules((r) => ({ ...r, numDecks: r.numDecks === 6 ? 4 : 6 }))
  const toggleMode = () =>
    canEditRules && setRules((r) => ({ ...r, freeBetMode: !r.freeBetMode }))

  // During betting, chips placed on the felt are committed but not yet deducted
  // from bankroll (that happens at deal) — show what's actually left to wager.
  const committed =
    state.mainBet +
    state.sideBets.trilock +
    state.sideBets.fortune +
    state.sideBets.blazing
  const availableChips =
    state.phase === 'betting' ? state.bankroll - committed : state.bankroll

  // Net proceeds = realized gambling P&L minus interest charged on any loans.
  const net = state.sessionNet - state.interestCost
  const netRounded = Math.round(net)
  const netTone = netRounded > 0 ? 'up' : netRounded < 0 ? 'down' : 'flat'
  const netStr = `${netRounded > 0 ? '+' : netRounded < 0 ? '−' : ''}$${Math.abs(
    netRounded,
  ).toLocaleString()}`

  const debt = state.debt
  const aprPct = (LOAN_APR * 100).toFixed(1)

  const bankrollStr =
    availableChips < 0
      ? `−$${Math.abs(availableChips).toLocaleString()}`
      : `$${availableChips.toLocaleString()}`

  return (
    <div className="app">
      <div className="grain" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <BrandMark freeBet={rules.freeBetMode} />
          <div className="brand-text">
            <h1>
              {rules.freeBetMode && <span className="brand-prefix">Free Double</span>}
              <span className="brand-blaze">Blazing</span>
              <span className="brand-bj">Blackjack</span>
            </h1>
            <span className="brand-tag">
              {rules.freeBetMode
                ? 'Free doubles & splits · Dealer 22 pushes'
                : 'TriLux · Fortune · Blazing 7s'}
            </span>
          </div>
        </div>

        <div className="topbar-controls">
          <div
            className="shoe-meter"
            title={`${rules.numDecks}-deck shoe — ${penetrationPct}% dealt, ${cardsLeft} cards left. Reshuffles at the cut card.`}
            role="img"
            aria-label={`Shoe: ${cardsLeft} cards remaining of ${rules.numDecks} decks`}
          >
            <span className="shoe-label">CARDS LEFT</span>
            <span className="shoe-track">
              <span
                className="shoe-fill"
                style={{ width: `${100 - penetrationPct}%` }}
              />
            </span>
          </div>

          <div className="rule-pills">
            <button
              className={`opt-pill ${rules.freeBetMode ? 'opt-hot' : ''}`}
              onClick={toggleMode}
              disabled={!canEditRules}
              title="Switch between Classic and Free Bet (Free Double) Blackjack"
            >
              <span className="opt-cap">Mode</span>
              <span className="opt-val">{rules.freeBetMode ? 'Free Bet' : 'Classic'}</span>
            </button>
            <button
              className="opt-pill"
              onClick={toggleDecks}
              disabled={!canEditRules}
              title="Click to change the number of decks in the shoe"
            >
              <span className="opt-cap">Decks</span>
              <span className="opt-val">{rules.numDecks}</span>
            </button>
            <button
              className="opt-pill"
              onClick={toggleSoft17}
              disabled={!canEditRules}
              title="Click to switch the dealer's soft-17 rule"
            >
              <span className="opt-cap">Dealer</span>
              <span className="opt-val">
                {rules.hitSoft17 ? 'Hits soft 17' : 'Stands soft 17'}
              </span>
            </button>
          </div>

          <button
            className={`pill-toggle ${coachOn ? 'on' : ''}`}
            onClick={() => setCoachOn((v) => !v)}
            title="Toggle basic-strategy coaching"
            aria-pressed={coachOn}
          >
            Coach {coachOn ? 'On' : 'Off'}
          </button>

          <button className="pill-toggle" onClick={openCheat} aria-haspopup="dialog">
            Cheat Sheet
          </button>

          <button className="pill-toggle" onClick={openPaytable} aria-haspopup="dialog">
            Paytables
          </button>

          {confirmReset ? (
            <span className="reset-confirm">
              <span className="reset-q">Wipe all?</span>
              <button
                className="pill-toggle danger"
                onClick={() => {
                  api.resetGame()
                  setConfirmReset(false)
                }}
              >
                Yes
              </button>
              <button className="pill-toggle" onClick={() => setConfirmReset(false)}>
                No
              </button>
            </span>
          ) : (
            <button
              className="pill-toggle"
              onClick={() => setConfirmReset(true)}
              title="Wipe balance, debt and net — restart from scratch"
            >
              Reset
            </button>
          )}

          {debt > 0 && (
            <div
              className="stat-readout debt-readout"
              title={`Loan balance — compounds yearly at ${aprPct}% APR (one year every 5 min)`}
              aria-label={`Loan debt $${Math.round(debt).toLocaleString()} at ${aprPct}% APR`}
            >
              <span className="stat-label" aria-hidden>
                DEBT · {aprPct}%
              </span>
              <span className="stat-value debt-value" aria-hidden>
                ${Math.round(debt).toLocaleString()}
              </span>
            </div>
          )}

          <div className="stat-readout" aria-label={`Net proceeds ${netStr}`}>
            <span className="stat-label" aria-hidden>NET</span>
            <span className={`stat-value net-${netTone}`} aria-hidden>{netStr}</span>
          </div>

          <div className="stat-readout" aria-label={`Bankroll ${bankrollStr}`}>
            <span className="stat-label" aria-hidden>BANKROLL</span>
            <span
              className={`stat-value bankroll-value ${availableChips < 0 ? 'net-down' : ''}`}
              aria-hidden
            >
              {bankrollStr}
            </span>
          </div>
        </div>
      </header>

      <main className="stage">
        <Table api={api} selectedChip={selectedChip} />
      </main>

      <footer className="dock">
        <Controls
          api={api}
          selectedChip={selectedChip}
          onSelectChip={setSelectedChip}
          coachOn={coachOn}
          onOpenLoan={() => setLoanOpen(true)}
        />
      </footer>

      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} rules={rules} />
      <CheatSheet
        open={cheatOpen}
        onClose={() => setCheatOpen(false)}
        api={api}
        rules={rules}
      />
      <LoanModal
        open={loanOpen}
        onClose={() => setLoanOpen(false)}
        onBorrow={api.takeLoan}
      />
    </div>
  )
}
