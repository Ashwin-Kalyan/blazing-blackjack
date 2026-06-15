import type { BlackjackApi } from '../hooks/useBlackjack'
import { DealerHand, PlayerHandView } from './Hand'
import { BetSpots } from './BetSpots'
import { ResultOverlay } from './ResultOverlay'
import { InsurancePrompt } from './InsurancePrompt'
import './Table.css'

interface TableProps {
  api: BlackjackApi
  selectedChip: number
}

/** The screen-printed felt graphics — the curved rules arc you see on a real table. */
function FeltPrint({ hitSoft17, freeBet }: { hitSoft17: boolean; freeBet: boolean }) {
  return (
    <svg
      className="felt-print"
      viewBox="0 0 1000 470"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <path id="bjArc" d="M 150 330 A 400 330 0 0 1 850 330" fill="none" />
      </defs>
      <text className="fp-main">
        <textPath href="#bjArc" startOffset="50%" textAnchor="middle">
          BLACKJACK PAYS 3 TO 2
        </textPath>
      </text>
      <text className="fp-sub" x="500" y="378" textAnchor="middle">
        {freeBet
          ? 'FREE BET  ·  DEALER 22 PUSHES'
          : `DEALER MUST ${hitSoft17 ? 'HIT SOFT 17' : 'STAND ON ALL 17'}`}
      </text>
      <text className="fp-sub small" x="500" y="408" textAnchor="middle">
        INSURANCE PAYS 2 TO 1
      </text>
    </svg>
  )
}

/** Decorative dealer chip float (the tray of chips in front of the dealer). */
function DealerFloat() {
  const colors = ['chip-violet', 'chip-slate', 'chip-green', 'chip-red', 'chip-violet']
  return (
    <div className="dealer-float" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} className={`float-stack ${c}`} />
      ))}
    </div>
  )
}

export function Table({ api, selectedChip }: TableProps) {
  const { state, rules } = api
  const revealed = state.phase === 'dealerTurn' || state.phase === 'roundOver'
  const showCards = state.dealer.cards.length > 0 || state.hands.length > 0

  return (
    <div className="table">
      <div className="felt">
        <div className="felt-spotlight" />
        <FeltPrint hitSoft17={rules.hitSoft17} freeBet={rules.freeBetMode} />
        <DealerFloat />

        <div className="table-dealer">
          <DealerHand cards={state.dealer.cards} revealed={revealed} />
        </div>

        <div className="table-message">
          <span
            className={`message-pill ${state.shuffling ? 'shuffling' : ''}`}
            role="status"
            aria-live="polite"
          >
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
                  active={state.phase === 'playerTurn' && i === state.activeHandIndex}
                  showResult={state.phase === 'roundOver'}
                />
              ))}
            </div>
          )}

          <BetSpots api={api} selectedChip={selectedChip} />
        </div>

        {state.phase === 'insurance' && <InsurancePrompt api={api} />}
        <ResultOverlay state={state} />
      </div>
    </div>
  )
}
