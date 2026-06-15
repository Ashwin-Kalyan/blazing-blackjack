import './Chips.css'

export const CHIP_COLORS: Record<number, string> = {
  1: 'chip-white',
  5: 'chip-red',
  25: 'chip-green',
  50: 'chip-orange',
  100: 'chip-slate',
  500: 'chip-violet',
}

function chipClassFor(value: number): string {
  if (value >= 500) return CHIP_COLORS[500]
  if (value >= 100) return CHIP_COLORS[100]
  if (value >= 50) return CHIP_COLORS[50]
  if (value >= 25) return CHIP_COLORS[25]
  if (value >= 5) return CHIP_COLORS[5]
  return CHIP_COLORS[1]
}

interface ChipProps {
  value: number
  size?: number
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function Chip({ value, size = 56, selected, onClick, disabled }: ChipProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`chip ${chipClassFor(value)} ${selected ? 'is-selected' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-label={`$${value} chip`}
      type={onClick ? 'button' : undefined}
    >
      <span className="chip-spots" />
      <span className="chip-inlay">
        <span className="chip-value">{value}</span>
      </span>
    </Tag>
  )
}

/** Compact stack visual representing a wagered amount. */
export function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null
  // Break the amount into standard chips for a believable stack.
  const denoms = [500, 100, 50, 25, 5, 1]
  const stack: number[] = []
  let remaining = amount
  for (const d of denoms) {
    while (remaining >= d && stack.length < 7) {
      stack.push(d)
      remaining -= d
    }
  }
  return (
    <div className="chip-stack" aria-hidden>
      {stack.map((d, i) => (
        <span
          key={i}
          className={`chip-disc ${chipClassFor(d)}`}
          style={{ bottom: `${i * 5}px` }}
        />
      ))}
    </div>
  )
}
