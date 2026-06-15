import type { GameState } from '../hooks/useBlackjack'
import './ResultOverlay.css'

interface ResultOverlayProps {
  state: GameState
}

function money(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}$${Math.abs(n).toLocaleString()}`
}

export function ResultOverlay({ state }: ResultOverlayProps) {
  if (!state.showResult) return null

  // The headline reflects the BLACKJACK HAND result only — side bets are graded
  // independently and shown as separate line items, so a winning hand never
  // reads as a loss just because a side bet lost.
  const mainNet = state.hands.reduce((sum, h) => sum + (h.net ?? 0), 0)
  const anyBlackjack = state.hands.some((h) => h.outcome === 'blackjack')
  const tone = mainNet > 0 || anyBlackjack ? 'win' : mainNet < 0 ? 'lose' : 'push'
  const headline = anyBlackjack
    ? 'BLACKJACK!'
    : mainNet > 0
      ? 'YOU WIN'
      : mainNet < 0
        ? 'DEALER WINS'
        : 'PUSH'

  const sideNet = state.sideResults.reduce((sum, r) => sum + r.net, 0)
  const insuranceNet = state.roundNet - mainNet - sideNet

  const handLabel = anyBlackjack ? 'Blackjack 3:2' : mainNet > 0 ? 'Hand' : mainNet < 0 ? 'Hand' : 'Push'

  return (
    <div className={`result-overlay ${tone}`} role="status" aria-live="assertive">
      <div className="result-card">
        <span className="result-headline">{headline}</span>

        <ul className="result-lines">
          <li className="result-line main">
            <span className="rl-label">{handLabel}</span>
            <span className={`rl-amt ${mainNet >= 0 ? 'pos' : 'neg'}`}>{money(mainNet)}</span>
          </li>

          {state.sideResults.map((r) => (
            <li key={r.key} className="result-line">
              <span className="rl-label">{r.label}</span>
              <span className="rl-combo">{r.won ? r.combo : 'no win'}</span>
              <span className={`rl-amt ${r.net >= 0 ? 'pos' : 'neg'}`}>{money(r.net)}</span>
            </li>
          ))}

          {state.insuranceBet > 0 && (
            <li className="result-line">
              <span className="rl-label">Insurance</span>
              <span className={`rl-amt ${insuranceNet >= 0 ? 'pos' : 'neg'}`}>
                {money(insuranceNet)}
              </span>
            </li>
          )}
        </ul>

        <div className="result-total">
          <span>Round net</span>
          <span className={state.roundNet >= 0 ? 'pos' : 'neg'}>{money(state.roundNet)}</span>
        </div>
      </div>
    </div>
  )
}
