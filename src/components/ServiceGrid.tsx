import type { ServiceStatus } from '../types/index'
import ServiceCard from './ServiceCard'

interface ServiceGridProps {
  services:  ServiceStatus[]
  editMode:  boolean
  onRemove:  (id: string) => void
}

export default function ServiceGrid({ services, editMode, onRemove }: ServiceGridProps) {
  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-2">
        <p className="text-[13px] font-light text-white-25">No services added</p>
        <p className="text-[10px] text-white-12">Click + to add your first service</p>
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
        />
      ))}
    </div>
  )
}
