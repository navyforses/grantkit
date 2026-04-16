/**
 * StatusBadge — color-coded pill for resource status
 */
import { useLanguage } from '@/contexts/LanguageContext'
import type { ResourceStatus } from '@/types/resources'

interface StatusBadgeProps {
  status: ResourceStatus
  className?: string
}

const STATUS_STYLES: Record<ResourceStatus, string> = {
  OPEN:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED:   'bg-red-50 text-red-700 border-red-200',
  UPCOMING: 'bg-amber-50 text-amber-700 border-amber-200',
  ONGOING:  'bg-blue-50 text-blue-700 border-blue-200',
  ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_DOT: Record<ResourceStatus, string> = {
  OPEN:     'bg-emerald-500',
  CLOSED:   'bg-red-500',
  UPCOMING: 'bg-amber-500',
  ONGOING:  'bg-blue-500',
  ARCHIVED: 'bg-gray-400',
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useLanguage()

  const labelFor = (s: ResourceStatus): string => {
    switch (s) {
      case 'OPEN':     return t.resources.statusOpen
      case 'CLOSED':   return t.resources.statusClosed
      case 'UPCOMING': return t.resources.statusUpcoming
      case 'ONGOING':  return t.resources.statusOngoing
      case 'ARCHIVED': return t.resources.statusArchived
    }
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLES[status]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {labelFor(status)}
    </span>
  )
}
