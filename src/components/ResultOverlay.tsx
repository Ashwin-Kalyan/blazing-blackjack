import type { GameState } from '../hooks/useBlackjack'
import './ResultOverlay.css'

interface ResultOverlayProps {
  state: GameState
}

export function ResultOverlay({ state }: ResultOverlayProps) {
  if (!state.showResult) return null
  const net = state.roundNet
  const tone = net > 0 ? 'win' : net < 0 ? 'lose' : 'push'
  const headline = net > 0 ? 'YOU WIN' : net < 0 ? 'DEALER WINS' : 'PUSH'
  const sideWins = state.sideResults.filter((r) => r.won)

  return (
    <div className={`result-overlay ${tone}`}>
      <div className="result-card">
        <span className="result-headline">{headline}</span>
        <span className="result-net">
          {net > 0 ? '+' : net < 0 ? '−' : ''}${Math.abs(net)}
        </span>
        {sideWins.length > 0 && (
          <ul className="result-sides">
            {sideWins.map((r) => (
              <li key={r.key}>
                <span>{r.label}</span>
                <span className="combo">{r.combo}</span>
                <span className="amt">+${r.net}</span>
              </li>
            ))}
          </ul>
        )}
        <span className="result-msg">{state.message}</span>
      </div>
    </div>
  )
}
