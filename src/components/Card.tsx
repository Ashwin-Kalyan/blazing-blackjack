import type { Card as CardType } from '../types'
import { SUIT_SYMBOL, isRed } from '../game/deck'
import './Card.css'

interface CardProps {
  card: CardType
}

const FACE = new Set(['J', 'Q', 'K'])

export function PlayingCard({ card }: CardProps) {
  const symbol = SUIT_SYMBOL[card.suit]
  const colorClass = isRed(card.suit) ? 'is-red' : 'is-black'
  const center = FACE.has(card.rank) ? card.rank : symbol

  return (
    <div className={`card ${card.faceDown ? 'is-down' : ''} ${colorClass}`}>
      <div className="card-inner">
        <div className="card-face card-front">
          <span className="corner top">
            <span className="corner-rank">{card.rank}</span>
            <span className="corner-suit">{symbol}</span>
          </span>
          <span className={`pip ${FACE.has(card.rank) ? 'pip-face' : ''}`}>
            {center}
          </span>
          <span className="corner bottom">
            <span className="corner-rank">{card.rank}</span>
            <span className="corner-suit">{symbol}</span>
          </span>
        </div>
        <div className="card-face card-back">
          <div className="card-back-art">
            <span className="card-back-mark">7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
