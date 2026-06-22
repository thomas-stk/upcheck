import type { ServiceStatus } from '../types/index'
import { openUrl } from '../services/ipc'
import ServiceCard from './ServiceCard'

interface ServiceGridProps {
  services:  ServiceStatus[]
  editMode:  boolean
  loading:   boolean
  onRemove:  (id: string) => void
}

function SkeletonCard() {
  return (
    <div className="bg-white-3 rounded-lg px-4 py-4 border border-white-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 bg-white-8 rounded w-2/5" />
        <div className="h-4 bg-white-6 rounded w-1/5" />
      </div>
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="w-1.5 h-2 rounded-[2px] bg-white-6 shrink-0" />
        ))}
      </div>
      <div className="h-3 bg-white-6 rounded w-1/3" />
    </div>
  )
}

export default function ServiceGrid({ services, editMode, loading, onRemove }: ServiceGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[14px]">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-2">
        <p className="text-[13px] font-light text-white-50">No services added</p>
        <p className="text-[10px] text-white-45">Click + to add your first service</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[14px]">
      {services.map(service => (
        <ServiceCard
          key={service.id}
          service={service}
          editMode={editMode}
          onRemove={() => onRemove(service.id)}
          onClick={editMode ? undefined : () => openUrl(service.url)}
        />
      ))}
    </div>
  )
}
