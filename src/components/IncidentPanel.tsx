import { useState } from 'react'
import { IconX } from '@tabler/icons-react'
import type { ServiceStatus, Incident } from '../types/index'

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const impactColor: Record<string, string> = {
  critical: '#f87171',
  major:    '#f87171',
  minor:    '#fbbf24',
  none:     'rgba(255,255,255,0.25)',
}

interface IncidentRowProps {
  incident:    Incident & { serviceName?: string }
  onDismiss:   () => void
}

function IncidentRow({ incident, onDismiss }: IncidentRowProps) {
  const color = impactColor[incident.impact] ?? 'rgba(255,255,255,0.25)'
  return (
    <div className="relative group pb-3 mb-3 pl-3 border-l-2 border-b border-white-4" style={{ borderLeftColor: color }}>
      <button
        onClick={onDismiss}
        title="Dismiss"
        className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center bg-transparent border-0 cursor-pointer text-white-20 opacity-0 group-hover:opacity-100 transition-opacity duration-100 hover:text-white-50"
      >
        <IconX size={11} stroke={2} />
      </button>

      {incident.serviceName && (
        <p className="text-[10px] font-semibold text-white-45 mb-0.5 pr-5">
          {incident.serviceName}
        </p>
      )}
      <p className="text-[12px] font-medium text-white-80 mb-1.5 leading-snug pr-5">
        {incident.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] capitalize font-medium" style={{ color }}>{incident.impact}</span>
        <span className="text-[10px] text-white-25">{formatAge(incident.updatedAt)}</span>
      </div>
    </div>
  )
}

interface IncidentPanelProps {
  services: ServiceStatus[]
}

export default function IncidentPanel({ services }: IncidentPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const allIncidents: (Incident & { serviceName?: string })[] = []
  services.forEach(svc =>
    svc.incidents.forEach(i => allIncidents.push({ ...i, serviceName: svc.name }))
  )
  const visible = allIncidents.filter(i => !dismissed.has(i.id))

  function dismiss(id: string) {
    setDismissed(prev => new Set(prev).add(id))
  }

  function clearAll() {
    setDismissed(new Set(allIncidents.map(i => i.id)))
  }

  return (
    <aside className="w-56 bg-bg-surface border-l border-white-8 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-white-5 flex items-center justify-between">
        <p className="text-[10px] tracking-[0.07em] uppercase font-bold text-white-35">
          Incidents
        </p>
        {visible.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-white-75 bg-transparent border-0 cursor-pointer p-0 transition-colors duration-100"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {visible.length === 0 ? (
          <p className="text-[11px] text-white-20 leading-relaxed">
            No active incidents
          </p>
        ) : (
          visible.map(i => (
            <IncidentRow key={i.id} incident={i} onDismiss={() => dismiss(i.id)} />
          ))
        )}
      </div>
    </aside>
  )
}
