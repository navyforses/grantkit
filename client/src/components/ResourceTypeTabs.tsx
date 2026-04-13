/**
 * ResourceTypeTabs — Three-tab switcher: GRANT / SOCIAL / MEDICAL
 * Uses the existing i18n system for tab labels.
 */
import { useLanguage } from '@/contexts/LanguageContext'
import type { ResourceType } from '@/types/resources'

interface ResourceTypeTabsProps {
  value: ResourceType | undefined
  onChange: (type: ResourceType | undefined) => void
  counts?: Partial<Record<ResourceType, number>>
  className?: string
}

const TABS: { type: ResourceType; icon: string }[] = [
  { type: 'GRANT',   icon: '💰' },
  { type: 'SOCIAL',  icon: '🏠' },
  { type: 'MEDICAL', icon: '🔬' },
]

export default function ResourceTypeTabs({ value, onChange, counts, className = '' }: ResourceTypeTabsProps) {
  const { t } = useLanguage()

  const labelFor = (type: ResourceType) => {
    switch (type) {
      case 'GRANT':   return t.resources.typeGrant
      case 'SOCIAL':  return t.resources.typeSocial
      case 'MEDICAL': return t.resources.typeMedical
    }
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {TABS.map(({ type, icon }) => {
        const isActive = value === type
        const count = counts?.[type]
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(isActive ? undefined : type)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isActive
                ? type === 'GRANT'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : type === 'SOCIAL'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-purple-600 text-white border-purple-600'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
            }`}
          >
            <span>{icon}</span>
            <span>{labelFor(type)}</span>
            {count != null && (
              <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20' : 'bg-secondary'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
