import type { ServiceStatus, AppConfig } from '../types/index'

export const getStatuses    = (): Promise<ServiceStatus[]>       => window.api.getStatuses()
export const getConfig      = (): Promise<AppConfig>             => window.api.getConfig()
export const saveConfig     = (c: Partial<AppConfig>): Promise<void> => window.api.saveConfig(c)
export const onStatusUpdate = (cb: (d: ServiceStatus[]) => void): (() => void) => window.api.onStatusUpdate(cb)
export const addService     = (name: string, url: string)             => window.api.addService(name, url)
export const removeService  = (id: string)                            => window.api.removeService(id)
