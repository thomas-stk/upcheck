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

function IncidentRow({ incident }: { incident: Incident & { serviceName?: string } }) {
  const color = impactColor[incident.impact] ?? 'rgba(255,255,255,0.25)'
  return (
    <div className="pb-3 border-b border-white-4 mb-3 pl-2 border-l-2" style={{ borderLeftColor: color }}>
      {incident.serviceName && (
        <p className="text-[10px] font-semibold text-white-50 mb-0.5">
          {incident.serviceName}
        </p>
      )}
      <p className="text-[11px] font-medium text-white-75 mb-1 leading-[1.4]">
        {incident.name}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[9px] capitalize" style={{ color }}>{incident.impact}</span>
        <span className="text-[9px] text-white-20">{formatAge(incident.updatedAt)}</span>
      </div>
    </div>
  )
}

interface IncidentPanelProps {
  services: ServiceStatus[]
}

export default function IncidentPanel({ services }: IncidentPanelProps) {
  const incidents: (Incident & { serviceName?: string })[] = []
  services.forEach(svc => {
    svc.incidents.forEach(i => incidents.push({ ...i, serviceName: svc.name }))
  })

  return (
    <aside className="w-40 bg-bg-surface border-l border-white-5 flex flex-col overflow-hidden">
      <div className="px-3 pt-[14px] pb-2 border-b border-white-5">
        <p className="text-[9px] tracking-[0.07em] uppercase font-bold text-white-30">
          Incidents
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3">
        {incidents.length === 0 ? (
          <p className="text-[10px] text-white-15 leading-[1.5]">
            No active incidents
          </p>
        ) : (
          incidents.map(i => <IncidentRow key={i.id} incident={i} />)
        )}
      </div>
    </aside>
  )
}
