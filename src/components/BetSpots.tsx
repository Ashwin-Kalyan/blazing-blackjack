import type { SideBetKey } from '../types'
import type { BlackjackApi } from '../hooks/useBlackjack'
import { ChipStack } from './Chips'
import './BetSpots.css'

interface BetSpotsProps {
  api: BlackjackApi
  selectedChip: number
}

const SIDE_SPOTS: { key: SideBetKey; label: string; top: string; hint: string }[] = [
  { key: 'trilock', label: 'TriLock', top: '100:1', hint: 'poker on 3 cards' },
  { key: 'fortune', label: 'Fortune', top: '200:1', hint: '3-card 21s & 7s' },
  { key: 'blazing', label: 'Blazing 7s', top: '1000:1', hint: 'count the 7s' },
]

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
            >
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
      >
        <span className="spot-label">MAIN BET</span>
        <span className="spot-top">Blackjack pays 3:2</span>
        {state.mainBet > 0 && <span className="spot-amount big">${state.mainBet}</span>}
        <ChipStack amount={state.mainBet} />
      </button>
    </div>
  )
}
