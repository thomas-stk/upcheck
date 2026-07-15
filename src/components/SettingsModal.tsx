import { useState, useEffect } from 'react'
import { IconX } from '@tabler/icons-react'
import { getConfig, saveConfig, getAppVersion } from '../services/ipc'
import type { AppConfig } from '../types/index'

interface SettingsModalProps {
  onClose: () => void
}

const POLL_OPTIONS: { value: number; label: string }[] = [
  { value: 30_000,    label: '30 seconds' },
  { value: 60_000,    label: '1 minute'   },
  { value: 300_000,   label: '5 minutes'  },
  { value: 900_000,   label: '15 minutes' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-4.5 rounded-full border-0 cursor-pointer transition-colors duration-150 shrink-0 ${
        checked ? 'bg-[rgba(99,102,241,0.7)]' : 'bg-white-12'
      }`}
    >
      <span
        className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-[left] duration-150 ${
          checked ? 'left-[calc(100%-14px-2px)]' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white-6 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] text-white-75">{label}</p>
        {description && <p className="text-[9px] text-white-45 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    getConfig().then(setConfig)
    getAppVersion().then(setVersion)
  }, [])

  async function set<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    if (!config) return
    const next = { ...config, [key]: value }
    setConfig(next)
    await saveConfig({ [key]: value })
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-bg-surface border border-white-8 rounded-[10px] px-5 pt-5 pb-4 w-80"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-white-80">Settings</p>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-white-30 p-0.5">
            <IconX size={14} stroke={1.5} />
          </button>
        </div>

        {config === null ? (
          <p className="text-[10px] text-white-25 py-4 text-center">Loading...</p>
        ) : (
          <div>
            <p className="text-[9px] tracking-[0.07em] uppercase text-white-30 mb-1">General</p>

            <Row label="Notifications" description="Alert when a service changes status">
              <Toggle
                checked={config.notificationsEnabled}
                onChange={v => set('notificationsEnabled', v)}
              />
            </Row>

            <Row label="Poll interval" description="How often to check service statuses">
              <select
                value={config.pollIntervalMs}
                onChange={e => set('pollIntervalMs', Number(e.target.value))}
                style={{ colorScheme: 'dark' }}
                className="bg-white-5 border border-white-10 rounded-md text-[11px] text-white-70 px-2 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(129,140,248,0.5)]"
              >
                {POLL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} style={{ backgroundColor: '#16181e', color: 'rgba(255,255,255,0.85)' }}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Row>

            <p className="text-[9px] tracking-[0.07em] uppercase text-white-30 mt-3 mb-1">Window</p>

            <Row label="Launch at startup" description="Start UpCheck when you log in">
              <Toggle
                checked={config.launchAtStartup}
                onChange={v => set('launchAtStartup', v)}
              />
            </Row>

            <Row label="Minimize to tray on close" description="Hide to system tray instead of quitting">
              <Toggle
                checked={config.minimizeToTray}
                onChange={v => set('minimizeToTray', v)}
              />
            </Row>

            {version && (
              <p className="text-[9px] text-white-50 text-center mt-3">UpCheck v{version}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
