import { useState } from 'react'
import { useBlackjack } from './hooks/useBlackjack'
import { DEFAULT_RULES } from './game/payouts'
import type { Rules } from './types'
import { Table } from './components/Table'
import { Controls } from './components/Controls'
import { Paytable } from './components/Paytable'
import './App.css'

export default function App() {
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES)
  const api = useBlackjack(rules)
  const [selectedChip, setSelectedChip] = useState(25)
  const [coachOn, setCoachOn] = useState(true)
  const [paytableOpen, setPaytableOpen] = useState(false)

  const { state } = api
  const penetrationPct = Math.round(state.penetration * 100)

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

  const net = state.sessionNet
  const netTone = net > 0 ? 'up' : net < 0 ? 'down' : 'flat'
  const netStr = `${net > 0 ? '+' : net < 0 ? '−' : ''}$${Math.abs(net).toLocaleString()}`

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
          <div className="shoe-meter" title={`Shoe ${penetrationPct}% dealt`}>
            <span className="shoe-label">SHOE</span>
            <span className="shoe-track">
              <span className="shoe-fill" style={{ width: `${penetrationPct}%` }} />
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
          >
            Coach {coachOn ? 'On' : 'Off'}
          </button>

          <button className="pill-toggle" onClick={() => setPaytableOpen(true)}>
            Paytables
          </button>

          <div className="stat-readout">
            <span className="stat-label">NET</span>
            <span className={`stat-value net-${netTone}`}>{netStr}</span>
          </div>

          <div className="stat-readout">
            <span className="stat-label">BANKROLL</span>
            <span className="stat-value bankroll-value">
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
        />
      </footer>

      <Paytable open={paytableOpen} onClose={() => setPaytableOpen(false)} rules={rules} />
    </div>
  )
}
