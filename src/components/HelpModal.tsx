import { IconX } from '@tabler/icons-react'

interface HelpModalProps {
  onClose: () => void
}

const indicators = [
  { color: '#4ade80', label: 'Operational', desc: 'Everything is working normally' },
  { color: '#fbbf24', label: 'Degraded',    desc: 'Performance issues or partial outage' },
  { color: '#f87171', label: 'Outage',      desc: 'Service is down' },
  { color: 'rgba(255,255,255,0.2)', label: 'Unknown', desc: 'Status page could not be reached' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-[10px] tracking-[0.07em] uppercase text-white-35 font-bold mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-bg-surface border border-white-8 rounded-[10px] px-5 pt-5 pb-5 w-80 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs font-medium text-white-80">Help</p>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-white-30 hover:text-white-60 p-0.5 transition-colors duration-100">
            <IconX size={14} stroke={1.5} />
          </button>
        </div>

        <Section title="Adding services">
          <p className="text-[11px] text-white-60 leading-relaxed">
            Click <span className="text-white-80 font-medium">Add</span> in the sidebar to add a service by name and status page URL. Stripe, Cloudflare, and Vercel can be added with one click.
          </p>
        </Section>

        <Section title="Removing services">
          <p className="text-[11px] text-white-60 leading-relaxed">
            Click <span className="text-white-80 font-medium">Edit</span> in the sidebar, then tap the <span className="text-white-80 font-medium">−</span> button on any card. You'll be asked to confirm before anything is deleted.
          </p>
        </Section>

        <Section title="Status indicators">
          <div className="flex flex-col gap-2">
            {indicators.map(({ color, label, desc }) => (
              <div key={label} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-medium w-20 shrink-0" style={{ color }}>{label}</span>
                <span className="text-[11px] text-white-45">{desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Incidents">
          <p className="text-[11px] text-white-60 leading-relaxed">
            Active incidents appear in the right panel. Hover a row and click <span className="text-white-80 font-medium">×</span> to dismiss it, or use <span className="text-white-80 font-medium">Clear all</span> to dismiss everything at once. Dismissed incidents reappear if they are updated.
          </p>
        </Section>

        <Section title="Refreshing">
          <p className="text-[11px] text-white-60 leading-relaxed">
            Click <span className="text-white-80 font-medium">Refresh</span> in the sidebar to poll all services immediately. The auto-poll interval can be changed in <span className="text-white-80 font-medium">Settings</span>.
          </p>
        </Section>

        <Section title="Clicking a service">
          <p className="text-[11px] text-white-60 leading-relaxed">
            Click any service card to open its status page in your browser.
          </p>
        </Section>
      </div>
    </div>
  )
}
