import { useState, useEffect } from 'react'
import type { ServiceStatus, StatusIndicator } from './types/index'
import { getStatuses, onStatusUpdate, removeService } from './services/ipc'
import Sidebar from './components/Sidebar'
import ServiceGrid from './components/ServiceGrid'
import IncidentPanel from './components/IncidentPanel'
import AddServiceModal from './components/AddServiceModal'
import SettingsModal from './components/SettingsModal'

const greetings: Record<StatusIndicator, { line: string; keyword: string }> = {
  operational: { line: 'Most things are running', keyword: 'smoothly' },
  degraded:    { line: '',                         keyword: 'struggling' },
  outage:      { line: 'Something is',             keyword: 'down' },
  unknown:     { line: 'Checking',                 keyword: 'services...' },
}

function worstIndicator(services: ServiceStatus[]): StatusIndicator {
  if (services.length === 0)                          return 'unknown'
  if (services.some(s => s.indicator === 'outage'))   return 'outage'
  if (services.some(s => s.indicator === 'degraded')) return 'degraded'
  if (services.some(s => s.indicator === 'unknown'))  return 'unknown'
  return 'operational'
}

function formatDateTime(d: Date): string {
  const day   = d.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()
  const date  = d.getDate()
  const month = d.toLocaleDateString(undefined, { month: 'long' }).toUpperCase()
  const time  = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return `${day}, ${date} ${month} · ${time}`
}

export default function App() {
  const [services,     setServices]     = useState<ServiceStatus[]>([])
  const [now,          setNow]          = useState(new Date())
  const [showAddModal,      setShowAddModal]      = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editMode,          setEditMode]          = useState(false)

  useEffect(() => {
    getStatuses().then(setServices)
    const unsub = onStatusUpdate(setServices)
    return unsub
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const overall     = worstIndicator(services)
  const operational = services.filter(s => s.indicator === 'operational').length
  const degraded    = services.filter(s => s.indicator === 'degraded').length
  const outage      = services.filter(s => s.indicator === 'outage').length

  const greeting = overall === 'degraded'
    ? { line: `${degraded} ${degraded === 1 ? 'service' : 'services'} ${degraded === 1 ? 'is' : 'are'}`, keyword: 'struggling' }
    : greetings[overall]

  return (
    <div className="flex flex-col h-screen bg-bg-base font-sans select-none">

      <div
        className="h-10 shrink-0 flex items-center justify-center relative border-b bg-bg-surface border-white-6"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[11px] tracking-[0.08em] text-white-20 uppercase">
          UpCheck
        </span>
        <div
          className="absolute right-2 flex items-center gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button onClick={() => window.api.windowMinimize()} className="bg-transparent border-0 text-white-25 cursor-pointer text-xs px-1 leading-none">─</button>
          <button onClick={() => window.api.windowMaximize()} className="bg-transparent border-0 text-white-25 cursor-pointer text-xs px-1 leading-none">□</button>
          <button onClick={() => window.api.windowClose()}    className="bg-transparent border-0 text-status-outage cursor-pointer text-xs px-1 leading-none">✕</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          editMode={editMode}
          onToggleEdit={() => setEditMode(e => !e)}
          onAddClick={() => setShowAddModal(true)}
          onSettingsClick={() => setShowSettingsModal(true)}
        />

        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: 'clamp(16px, 2.5vw, 36px)' }}
        >
          <p className="text-[10px] tracking-[0.07em] uppercase text-white-25 mb-1.5">
            {formatDateTime(now)}
          </p>
          <p className="text-lg font-light text-white-85 mb-5">
            {greeting.line}{' '}
            <strong className="font-medium text-accent">{greeting.keyword}</strong>
          </p>

          {services.length > 0 && (
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {([
                { label: 'OPERATIONAL', count: operational, color: '#4ade80' },
                { label: 'DEGRADED',    count: degraded,    color: '#fbbf24' },
                { label: 'OUTAGE',      count: outage,      color: '#f87171' },
              ] as const).map(({ label, count, color }) => (
                <div key={label} className="bg-white-3 border border-white-6 rounded-lg px-[14px] py-[10px]">
                  <p className="text-[24px] font-light mb-0.5" style={{ color }}>{count}</p>
                  <p className="text-[10px] tracking-[0.06em] text-white-40">{label}</p>
                </div>
              ))}
            </div>
          )}

          <ServiceGrid
            services={services}
            editMode={editMode}
            onRemove={id => removeService(id)}
          />
        </main>

        <IncidentPanel services={services} />
      </div>

      {showAddModal && (
        <AddServiceModal onClose={() => setShowAddModal(false)} />
      )}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  )
}
