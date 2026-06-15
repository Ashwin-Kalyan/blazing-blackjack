import { useState } from 'react'
import type { BlackjackApi } from '../hooks/useBlackjack'
import './InsurancePrompt.css'

interface InsurancePromptProps {
  api: BlackjackApi
}

export function InsurancePrompt({ api }: InsurancePromptProps) {
  const { state } = api
  const max = Math.min(Math.floor(state.mainBet / 2), state.bankroll)
  const step = max >= 20 ? 5 : 1
  const [amount, setAmount] = useState(max)

  if (state.phase !== 'insurance') return null

  const amt = Math.min(amount, max)

  return (
    <div className="insurance-prompt" role="dialog" aria-modal="true" aria-label="Insurance offer">
      <div className="ins-card">
        <span className="ins-eyebrow">Dealer shows an Ace</span>
        <h3 className="ins-title">Insurance?</h3>
        <p className="ins-copy">
          A separate side bet that the dealer has Blackjack. Pays <strong>2:1</strong>,
          up to half your main bet.
        </p>

        <div className="ins-amount">
          <input
            type="range"
            min={0}
            max={max}
            step={step}
            value={amt}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Insurance amount"
          />
          <span className="ins-amount-value">${amt}</span>
        </div>

        <div className="ins-actions">
          <button
            className="ins-btn take"
            onClick={() => api.takeInsurance(amt)}
            disabled={amt <= 0}
          >
            Take Insurance ${amt}
          </button>
          <button className="ins-btn decline" onClick={() => api.declineInsurance()}>
            No Insurance
          </button>
        </div>

        <span className="ins-advice">
          Basic strategy: <strong>decline</strong> — it's a losing bet without card counting.
        </span>
      </div>
    </div>
  )
}
