import type { SideBetKey } from '../types'
import type { BlackjackApi } from '../hooks/useBlackjack'
import { ChipStack } from './Chips'
import './BetSpots.css'

interface BetSpotsProps {
  api: BlackjackApi
  selectedChip: number
}

const SIDE_SPOTS: { key: SideBetKey; label: string; top: string }[] = [
  { key: 'trilock', label: 'TriLux', top: '100:1' },
  { key: 'fortune', label: 'Fortune', top: '200:1' },
  { key: 'blazing', label: 'Blazing 7s', top: '1000:1' },
]

/** Original stylized emblems for each proprietary side bet. */
function SideBetLogo({ which }: { which: SideBetKey }) {
  if (which === 'trilock') {
    // TriLux mark — a beveled blue triangular frame.
    return (
      <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
        <defs>
          <linearGradient id="triLuxGrad" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor="#9fd0f0" />
            <stop offset="0.5" stopColor="#3f86c4" />
            <stop offset="1" stopColor="#1b5187" />
          </linearGradient>
        </defs>
        <path
          d="M24 3 L45 43 L3 43 Z M24 16 L34 37 L14 37 Z"
          fill="url(#triLuxGrad)"
          fillRule="evenodd"
          stroke="#143f68"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* top-edge highlight */}
        <path d="M24 6 L41.5 39.5" fill="none" stroke="#cfe8fb" strokeWidth="1" opacity="0.55" />
      </svg>
    )
  }
  if (which === 'fortune') {
    // Fortune mark — a gold Chinese prosperity coin with a square hole.
    return (
      <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
        <defs>
          <radialGradient id="forCoin" cx="0.42" cy="0.34" r="0.75">
            <stop offset="0" stopColor="#ffe9b0" />
            <stop offset="0.55" stopColor="#e8be57" />
            <stop offset="1" stopColor="#bd8a2c" />
          </radialGradient>
          <mask id="forHole">
            <rect width="48" height="48" fill="#fff" />
            <rect x="17.5" y="17.5" width="13" height="13" rx="2.5" fill="#000" />
          </mask>
        </defs>
        {/* red accent ring */}
        <circle cx="24" cy="24" r="21" fill="none" stroke="#c4382b" strokeWidth="2.2" />
        {/* coin body with punched square hole */}
        <g mask="url(#forHole)">
          <circle cx="24" cy="24" r="18.5" fill="url(#forCoin)" />
        </g>
        <circle cx="24" cy="24" r="18.5" fill="none" stroke="#9a6b1a" strokeWidth="2" />
        <rect
          x="17.5"
          y="17.5"
          width="13"
          height="13"
          rx="2.5"
          fill="none"
          stroke="#9a6b1a"
          strokeWidth="1.6"
        />
      </svg>
    )
  }
  // Blazing 7s mark — three flaming sevens.
  return (
    <svg className="sb-logo" viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="blaze7" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe39c" />
          <stop offset="0.45" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ff2f23" />
        </linearGradient>
      </defs>
      {/* flame tips rising off each seven */}
      <g fill="url(#blaze7)">
        <path d="M14 18 C11 13 12 8 14 5 C16 8 17 14 14 18 Z" />
        <path d="M24 17 C20 11 22 5 24 2 C26 5 28 11 24 17 Z" />
        <path d="M34 18 C31 13 32 8 34 5 C36 8 37 14 34 18 Z" />
      </g>
      <text
        x="24"
        y="40"
        textAnchor="middle"
        fontFamily="'Cinzel', serif"
        fontWeight="900"
        fontSize="19"
        letterSpacing="-1"
        fill="url(#blaze7)"
        stroke="#7a1410"
        strokeWidth="0.6"
      >
        777
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
