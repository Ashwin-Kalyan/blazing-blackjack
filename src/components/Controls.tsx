import type { BlackjackApi } from '../hooks/useBlackjack'
import type { Action } from '../game/strategy'
import { INSURANCE_ADVICE } from '../game/strategy'
import { CHIP_DENOMINATIONS } from '../game/payouts'
import { Chip } from './Chips'
import './Controls.css'

interface ControlsProps {
  api: BlackjackApi
  selectedChip: number
  onSelectChip: (v: number) => void
  coachOn: boolean
}

export function Controls({ api, selectedChip, onSelectChip, coachOn }: ControlsProps) {
  const { state, rules, advice, canDouble, canSplit, doubleIsFree, splitIsFree } = api
  const phase = state.phase
  const recommended: Action | null = coachOn && advice ? advice.action : null

  const actionGlow = (a: Action) => (recommended === a ? 'is-recommended' : '')

  if (phase === 'betting') {
    const hasBet = state.mainBet > 0
    return (
      <div className="controls">
        <div className="chip-rack">
          {CHIP_DENOMINATIONS.map((d) => (
            <Chip
              key={d}
              value={d}
              selected={selectedChip === d}
              onClick={() => onSelectChip(d)}
              disabled={d > state.bankroll}
            />
          ))}
        </div>
        <div className="action-row">
          <button className="btn ghost" onClick={api.clearBets} disabled={!hasBet}>
            Clear
          </button>
          <button className="btn ghost" onClick={api.repeatBet}>
            Rebet
          </button>
          <button className="btn deal" onClick={api.deal} disabled={!hasBet}>
            Deal
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'insurance') {
    const max = Math.min(Math.floor(state.mainBet / 2), state.bankroll)
    return (
      <div className="controls">
        <p className="insurance-note">{INSURANCE_ADVICE}</p>
        <div className="action-row">
          <button className="btn" onClick={() => api.takeInsurance(max)}>
            Insure ${max}
          </button>
          <button className="btn primary" onClick={api.declineInsurance}>
            No Insurance
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'roundOver') {
    return (
      <div className="controls">
        <div className="action-row">
          {state.bankroll <= 0 && (
            <button className="btn ghost" onClick={() => api.addFunds(500)}>
              + $500 chips
            </button>
          )}
          <button className="btn deal" onClick={api.nextRound}>
            New Round
          </button>
        </div>
      </div>
    )
  }

  // playerTurn (and transient dealing/dealerTurn — buttons disabled)
  const live = phase === 'playerTurn'
  return (
    <div className="controls">
      {coachOn && advice && live && (
        <p className="coach-line">
          Basic strategy: <strong>{advice.label}</strong>
          {rules.freeBetMode && (
            <em className="coach-caveat"> · Free Bet play differs (shows classic)</em>
          )}
        </p>
      )}
      <div className="action-row">
        <button className={`btn ${actionGlow('H')}`} onClick={api.hit} disabled={!live}>
          Hit
        </button>
        <button className={`btn ${actionGlow('S')}`} onClick={api.stand} disabled={!live}>
          Stand
        </button>
        <button
          className={`btn ${actionGlow('D')} ${doubleIsFree ? 'is-free' : ''}`}
          onClick={api.double}
          disabled={!live || !canDouble}
        >
          {doubleIsFree ? 'Free Double' : 'Double'}
        </button>
        <button
          className={`btn ${actionGlow('P')} ${splitIsFree ? 'is-free' : ''}`}
          onClick={api.split}
          disabled={!live || !canSplit}
        >
          {splitIsFree ? 'Free Split' : 'Split'}
        </button>
      </div>
    </div>
  )
}
