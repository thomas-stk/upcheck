import type { ServiceStatus, StatusIndicator } from '../types/index'

const indicatorLabel: Record<StatusIndicator, string> = {
  operational: 'Operational',
  degraded:    'Degraded',
  outage:      'Outage',
  unknown:     'Unknown',
}

const indicatorColor: Record<StatusIndicator, string> = {
  operational: '#4ade80',
  degraded:    '#fbbf24',
  outage:      '#f87171',
  unknown:     'rgba(255,255,255,0.2)',
}

function formatMs(ms: number): string {
  if (ms <= 0)    return '—'
  if (ms < 1000)  return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

interface ServiceCardProps {
  service:   ServiceStatus
  editMode?: boolean
  onRemove?: () => void
  onClick?:  () => void
}

export default function ServiceCard({ service, editMode, onRemove, onClick }: ServiceCardProps) {
  const color = indicatorColor[service.indicator]

  return (
    <div className="relative">
      {editMode && (
        <button
          onClick={onRemove}
          title="Remove service"
          className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-status-outage border-2 border-bg-base text-white cursor-pointer flex items-center justify-center text-[12px] leading-none font-semibold"
        >
          −
        </button>
      )}

      <button
        onClick={onClick}
        className={`w-full text-left bg-white-3 rounded-lg px-4 py-4 cursor-pointer transition-[border-color,background] duration-150 border ${
          editMode
            ? 'border-[rgba(248,113,113,0.25)]'
            : 'border-white-6 hover:border-white-12 hover:bg-white-5'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-white-85 tracking-[0.01em]">
            {service.name}
          </span>
          <span
            className="text-[10px] font-medium tracking-[0.06em] uppercase rounded px-1.5 py-0.5"
            style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
          >
            {indicatorLabel[service.indicator]}
          </span>
        </div>

        <div className="flex items-center gap-0.5 mb-3">
          {service.history.length === 0
            ? Array.from({ length: 20 }).map((_, i) => (
                <span key={i} className="w-1.5 h-2 rounded-[2px] bg-white-6 shrink-0" />
              ))
            : service.history.map((indicator, i) => (
                <span key={i} className="w-1.5 h-2 rounded-[2px] shrink-0" style={{
                  background: indicatorColor[indicator],
                  opacity: 0.4 + (i / service.history.length) * 0.6,
                }} />
              ))
          }
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white-30">
            {formatMs(service.responseTimeMs)}
          </span>
          {service.incidents.length > 0 && (
            <span className="text-[11px] text-status-degraded">
              {service.incidents.length} incident{service.incidents.length > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-[11px] text-white-20 ml-auto">
            {service.lastChecked ? formatAge(service.lastChecked) : '—'}
          </span>
        </div>
      </button>
    </div>
  )
}
