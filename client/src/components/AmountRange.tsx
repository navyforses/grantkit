/**
 * AmountRange — formats and displays a currency amount range
 */
interface AmountRangeProps {
  min?: number
  max?: number
  currency?: string
  className?: string
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export default function AmountRange({ min, max, currency = 'USD', className = '' }: AmountRangeProps) {
  if (min == null && max == null) return null

  let label: string
  if (min != null && max != null && min !== max) {
    label = `${formatAmount(min, currency)} – ${formatAmount(max, currency)}`
  } else if (max != null) {
    label = `Up to ${formatAmount(max, currency)}`
  } else if (min != null) {
    label = `From ${formatAmount(min, currency)}`
  } else {
    return null
  }

  return (
    <span className={`text-emerald-600 font-semibold ${className}`}>
      {label}
    </span>
  )
}
