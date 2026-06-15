import { useState } from 'react'
import { LOAN_APR } from '../hooks/useBlackjack'
import './LoanModal.css'

interface LoanModalProps {
  open: boolean
  onClose: () => void
  onBorrow: (amount: number) => void
}

const PRESETS = [500, 1000, 2500, 5000]
const MIN = 100
const MAX = 10000

export function LoanModal({ open, onClose, onBorrow }: LoanModalProps) {
  const [amount, setAmount] = useState(1000)
  if (!open) return null

  const aprPct = (LOAN_APR * 100).toFixed(1)

  const borrow = () => {
    onBorrow(amount)
    onClose()
  }

  return (
    <div className="loan-scrim" onClick={onClose}>
      <div
        className="loan-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Casino cash advance"
      >
        <div className="loan-head">
          <span className="loan-eyebrow">Cash Advance</span>
          <h2 className="loan-title">Vinny's Window</h2>
          <p className="loan-tag">Money now. Regret later.</p>
        </div>

        <div className="loan-rate">
          <span className="loan-rate-num">{aprPct}%</span>
          <span className="loan-rate-cap">APR · interest ticks live</span>
        </div>

        <div className="loan-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`loan-preset ${amount === p ? 'active' : ''}`}
              onClick={() => setAmount(p)}
            >
              ${p.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="loan-slider">
          <input
            type="range"
            min={MIN}
            max={MAX}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Loan amount"
          />
          <span className="loan-amount">${amount.toLocaleString()}</span>
        </div>

        <div className="loan-actions">
          <button className="loan-btn cancel" onClick={onClose}>
            Maybe not
          </button>
          <button className="loan-btn borrow" onClick={borrow}>
            Borrow ${amount.toLocaleString()}
          </button>
        </div>

        <p className="loan-fine">
          Interest accrues at {aprPct}% APR until repaid and is deducted from your net.
          Vinny always gets paid.
        </p>
      </div>
    </div>
  )
}
