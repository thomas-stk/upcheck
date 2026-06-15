// StatusIndicator is a union type, only these four string values are valid.
// if you try to assign anything else TypeScript will error immediately.
export type StatusIndicator = 'operational' | 'degraded' | 'outage' | 'unknown'

// an individual incident reported by a status page
export interface Incident {
  id: string
  name: string
  status: string
  impact: string
  updatedAt: string
}

// the full status snapshot for one service, built by the poller and sent via IPC
export interface ServiceStatus {
  id: string
  name: string
  indicator: StatusIndicator
  description: string
  responseTimeMs: number
  lastChecked: string     // ISO timestamp string e.g. "2026-06-09T13:00:00.000Z"
  incidents: Incident[]   // empty array when everything is fine
  history: StatusIndicator[]  // last 20 poll readings, oldest first
}

// user preferences stored on disk via electron-store
export interface AppConfig {
  pollIntervalMs: number
  enabledServices: string[]
  notificationsEnabled: boolean
}

// tells TypeScript that window.api exists and what shape it has.
// preload.js creates it at runtime, this declaration just makes TS aware of it.
// Partial<AppConfig> means every field in AppConfig becomes optional for saveConfig.
declare global {
  interface Window {
    api: {
      getStatuses:    () => Promise<ServiceStatus[]>
      getConfig:      () => Promise<AppConfig>
      saveConfig:     (config: Partial<AppConfig>) => Promise<void>
      onStatusUpdate: (callback: (data: ServiceStatus[]) => void) => (() => void)
      addService:     (name: string, url: string) => Promise<{ success: boolean; checkType: string }>
      removeService:  (id: string) => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose:    () => void
    }
  }
}
