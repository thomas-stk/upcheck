// the four states a service can be in — anything outside this list is a bug
export type StatusIndicator = 'operational' | 'degraded' | 'outage' | 'unknown'

// a single incident from a service's status page
export interface Incident {
  id: string
  name: string
  status: string
  impact: string
  updatedAt: string
}

// everything we know about a service after polling it
export interface ServiceStatus {
  id: string
  name: string
  url: string
  indicator: StatusIndicator
  description: string
  responseTimeMs: number
  lastChecked: string         // ISO timestamp e.g. "2026-06-09T13:00:00.000Z"
  incidents: Incident[]       // empty when everything is fine
  history: StatusIndicator[]  // last 20 poll readings, oldest first
}

// what gets saved to disk via electron-store
export interface AppConfig {
  pollIntervalMs: number
  enabledServices: string[]
  notificationsEnabled: boolean
  minimizeToTray: boolean
  launchAtStartup: boolean
}

// preload.js creates window.api at runtime — this just tells TypeScript it exists
declare global {
  interface Window {
    api: {
      getStatuses:    () => Promise<ServiceStatus[]>
      getConfig:      () => Promise<AppConfig>
      saveConfig:     (config: Partial<AppConfig>) => Promise<void>
      onStatusUpdate: (callback: (data: ServiceStatus[]) => void) => (() => void)
      addService:     (name: string, url: string) => Promise<{ success: boolean; checkType: string }>
      removeService:  (id: string) => Promise<void>
      getDismissedIncidents: () => Promise<Record<string, string>>
      dismissIncidents: (incidents: { id: string; updatedAt: string }[]) => Promise<void>
      openUrl:        (url: string) => void
      triggerPoll:    () => Promise<void>
      platform:       string
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose:    () => void
    }
  }
}
