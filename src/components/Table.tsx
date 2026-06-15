import type { BlackjackApi } from '../hooks/useBlackjack'
import { DealerHand, PlayerHandView } from './Hand'
import { BetSpots } from './BetSpots'
import { ResultOverlay } from './ResultOverlay'
import './Table.css'

interface TableProps {
  api: BlackjackApi
  selectedChip: number
}

export function Table({ api, selectedChip }: TableProps) {
  const { state, rules } = api
  const revealed = state.phase === 'dealerTurn' || state.phase === 'roundOver'
  const showCards = state.dealer.cards.length > 0 || state.hands.length > 0

  return (
    <div className="table">
      <div className="felt-glow" />
      {state.phase === 'betting' && (
        <div className="felt-arc">
          <span className="felt-legend">
            {rules.freeBetMode ? 'FREE BET · BLACKJACK PAYS 3 TO 2' : 'BLACKJACK PAYS 3 TO 2'}
          </span>
          <span className="felt-sub">
            Dealer {rules.hitSoft17 ? 'hits' : 'stands on'} soft 17 · Insurance pays 2 to 1
            {rules.freeBetMode && ' · Dealer 22 pushes'}
          </span>
        </div>
      )}

      <div className="table-dealer">
        <DealerHand cards={state.dealer.cards} revealed={revealed} />
      </div>

      <div className="table-message">
        <span className={`message-pill ${state.shuffling ? 'shuffling' : ''}`}>
          {state.message}
        </span>
      </div>

      <div className="table-player">
        {showCards && state.hands.length > 0 && (
          <div className="player-hands">
            {state.hands.map((hand, i) => (
              <PlayerHandView
                key={hand.id}
                hand={hand}
                active={
                  state.phase === 'playerTurn' && i === state.activeHandIndex
                }
                showResult={state.phase === 'roundOver'}
              />
            ))}
          </div>
        )}

        <BetSpots api={api} selectedChip={selectedChip} />
      </div>

      <ResultOverlay state={state} />
    </div>
  )
}
