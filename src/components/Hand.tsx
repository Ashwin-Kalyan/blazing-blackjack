import type { PlayerHand } from '../types'
import { handValue } from '../game/handValue'
import { PlayingCard } from './Card'
import './Hand.css'

interface ValueBadgeProps {
  total: number
  soft: boolean
  blackjack?: boolean
  hidden?: boolean
}

function ValueBadge({ total, soft, blackjack, hidden }: ValueBadgeProps) {
  if (hidden) return null
  const label = blackjack
    ? 'BJ'
    : soft && total < 21
      ? `${total - 10}/${total}`
      : `${total}`
  const tone = total > 21 ? 'bust' : blackjack ? 'bj' : 'normal'
  return <span className={`value-badge ${tone}`}>{label}</span>
}

interface DealerHandProps {
  cards: PlayerHand['cards']
  revealed: boolean
}

export function DealerHand({ cards, revealed }: DealerHandProps) {
  const { total, soft, blackjack } = handValue(cards)
  const showValue = cards.length > 0 && (revealed || !cards.some((c) => c.faceDown))
  return (
    <div className="hand dealer-hand">
      <div className="cards">
        {cards.map((card) => (
          <PlayingCard key={card.id} card={card} />
        ))}
      </div>
      <ValueBadge total={total} soft={soft} blackjack={blackjack} hidden={!showValue} />
    </div>
  )
}

const OUTCOME_LABEL: Record<string, string> = {
  blackjack: 'BLACKJACK',
  win: 'WIN',
  push: 'PUSH',
  lose: 'LOSE',
  bust: 'BUST',
}

interface PlayerHandViewProps {
  hand: PlayerHand
  active: boolean
  showResult: boolean
}

export function PlayerHandView({ hand, active, showResult }: PlayerHandViewProps) {
  const { total, soft, blackjack } = handValue(hand.cards)
  return (
    <div
      className={`hand player-hand ${active ? 'is-active' : ''} ${
        hand.outcome ? `outcome-${hand.outcome}` : ''
      }`}
    >
      <div className="cards">
        {hand.cards.map((card) => (
          <PlayingCard key={card.id} card={card} />
        ))}
      </div>

      <div className="hand-footer">
        <ValueBadge total={total} soft={soft} blackjack={blackjack && !hand.fromSplit} />
        <span className="hand-bet">
          ${hand.bet}
          {hand.freeAmount > 0 && <em className="free-chip"> +${hand.freeAmount} FREE</em>}
          {hand.doubled && hand.freeAmount === 0 && <em> ×2</em>}
        </span>
      </div>

      {showResult && hand.outcome && (
        <span className={`outcome-tag outcome-${hand.outcome}`}>
          {OUTCOME_LABEL[hand.outcome]}
        </span>
      )}
    </div>
  )
}
