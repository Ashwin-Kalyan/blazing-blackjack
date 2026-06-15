import type { SideBetKey } from '../types'
import type { BlackjackApi } from '../hooks/useBlackjack'
import { ChipStack } from './Chips'
import './BetSpots.css'

interface BetSpotsProps {
  api: BlackjackApi
  selectedChip: number
}

const SIDE_SPOTS: { key: SideBetKey; label: string; top: string }[] = [
  { key: 'trilock', label: 'TriLock', top: '100:1' },
  { key: 'fortune', label: 'Fortune', top: '200:1' },
  { key: 'blazing', label: 'Blazing 7s', top: '1000:1' },
]

/** Original stylized emblems for each proprietary side bet. */
function SideBetLogo({ which }: { which: SideBetKey }) {
  if (which === 'trilock') {
    return (
      <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7fe3d0" />
            <stop offset="1" stopColor="#e8c477" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#triGrad)" strokeWidth="3">
          <circle cx="24" cy="16" r="9" />
          <circle cx="15.5" cy="31" r="9" />
          <circle cx="32.5" cy="31" r="9" />
        </g>
      </svg>
    )
  }
  if (which === 'fortune') {
    return (
      <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id="forGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe39c" />
            <stop offset="1" stopColor="#e0b84a" />
          </linearGradient>
        </defs>
        <path d="M27 33 L31 45" stroke="#2c9866" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <g fill="url(#forGrad)">
          <circle cx="24" cy="15" r="7.4" />
          <circle cx="15" cy="24" r="7.4" />
          <circle cx="33" cy="24" r="7.4" />
          <circle cx="24" cy="32" r="7.4" />
        </g>
        <circle cx="24" cy="23.5" r="3" fill="#caa23e" />
      </svg>
    )
  }
  // blazing 7s
  return (
    <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="fireGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe39c" />
          <stop offset="0.45" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff2f23" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 C30 11 35 15 30 24 C37 21 39 31 32 39 C39 37 34 47 24 47 C14 47 9 37 16 39 C9 31 11 21 18 24 C13 15 18 11 24 3 Z"
        fill="url(#fireGrad)"
      />
      <text
        x="24"
        y="34"
        textAnchor="middle"
        fontFamily="'Cinzel', serif"
        fontWeight="900"
        fontSize="22"
        fill="#3a1402"
      >
        7
      </text>
    </svg>
  )
}

export function BetSpots({ api, selectedChip }: BetSpotsProps) {
  const { state, addToMain, addToSide } = api
  const betting = state.phase === 'betting'

  return (
    <div className="bet-spots">
      <div className="side-spots">
        {SIDE_SPOTS.map((spot) => {
          const amount = state.sideBets[spot.key]
          const result = state.sideResults.find((r) => r.key === spot.key)
          return (
            <button
              key={spot.key}
              type="button"
              className={`bet-spot side ${amount > 0 ? 'is-funded' : ''} ${
                result ? (result.won ? 'is-won' : 'is-lost') : ''
              }`}
              disabled={!betting}
              onClick={() => addToSide(spot.key, selectedChip)}
              aria-label={`${spot.label} side bet, pays up to ${spot.top}${
                amount > 0 ? `, $${amount} placed` : ''
              }`}
            >
              <SideBetLogo which={spot.key} />
              <span className="spot-label">{spot.label}</span>
              <span className="spot-top">{spot.top}</span>
              {amount > 0 && <span className="spot-amount">${amount}</span>}
              <ChipStack amount={amount} />
              {result && (
                <span className="spot-result">
                  {result.won ? `${result.combo} +$${result.net}` : 'no win'}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={`bet-spot main ${state.mainBet > 0 ? 'is-funded' : ''}`}
        disabled={!betting}
        onClick={() => addToMain(selectedChip)}
        aria-label={`Main bet${state.mainBet > 0 ? `, $${state.mainBet} placed` : ''}`}
      >
        <span className="spot-label">MAIN BET</span>
        <span className="spot-top">Blackjack pays 3:2</span>
        {state.mainBet > 0 && <span className="spot-amount big">${state.mainBet}</span>}
        <ChipStack amount={state.mainBet} />
      </button>
    </div>
  )
}
