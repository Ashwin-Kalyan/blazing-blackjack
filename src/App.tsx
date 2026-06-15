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

  return (
    <div className="app">
      <div className="grain" aria-hidden />

      <header className="topbar">
        <div className="brand">
          <h1>
            <span className="brand-blaze">Blazing</span>
            <span className="brand-bj">Blackjack</span>
          </h1>
          <span className="brand-tag">Trilock · Fortune · Blazing 7s</span>
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

          <div
            className="stat-readout"
            aria-label={`Bankroll $${availableChips.toLocaleString()}`}
          >
            <span className="stat-label" aria-hidden>BANKROLL</span>
            <span className="stat-value bankroll-value" aria-hidden>
              ${availableChips.toLocaleString()}
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
