import { useState } from 'react'
import { IconX, IconPlus, IconBrandStripe, IconBrandCloudflare, IconBrandVercel } from '@tabler/icons-react'
import { addService } from '../services/ipc'

interface AddServiceModalProps {
  onClose: () => void
}

export default function AddServiceModal({ onClose }: AddServiceModalProps) {
  const [name,    setName]    = useState('')
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const suggestions = [
    { name: 'Stripe',      url: 'https://www.stripestatus.com',    icon: IconBrandStripe     },
    { name: 'Cloudflare',  url: 'https://www.cloudflarestatus.com', icon: IconBrandCloudflare },
    { name: 'Vercel',      url: 'https://www.vercel-status.com',   icon: IconBrandVercel     },
  ]

  async function quickAdd(sName: string, sUrl: string) {
    setLoading(true)
    setError(null)
    try {
      await addService(sName, sUrl)
      onClose()
    } catch (err: any) {
      const msg = err?.message ?? ''
      setError(msg.includes('already') ? `${sName} has already been added.` : `Could not reach ${sName}. Try again.`)
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    setLoading(true)
    setError(null)
    try {
      await addService(name.trim(), normalized)
      onClose()
    } catch (err: any) {
      const msg = err?.message ?? ''
      setError(msg.includes('already') ? 'This service has already been added.' : 'Could not reach that URL. Check it and try again.')
      setLoading(false)
    }
  }

  const canSubmit = !!name.trim() && !!url.trim() && !loading

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
          <p className="text-xs font-medium text-white-80">Add service</p>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-white-30 p-0.5">
            <IconX size={14} stroke={1.5} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[9px] tracking-[0.07em] uppercase text-white-20 mb-2">Quick add</p>
          <div className="flex gap-1.5">
            {suggestions.map(s => (
              <button
                key={s.name}
                onClick={() => quickAdd(s.name, s.url)}
                disabled={loading}
                title={s.name}
                className={`flex-1 py-2 bg-white-4 border border-white-8 rounded-md flex flex-col items-center gap-1 transition-[border-color,color] duration-150 text-white-40 ${loading ? 'cursor-not-allowed' : 'cursor-pointer hover:border-white-20 hover:text-white-80'}`}
              >
                <s.icon size={16} stroke={1.5} />
                <span className="text-[9px]">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white-6 mb-4" />

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-[9px] tracking-[0.07em] uppercase text-white-30 mb-1.5 block">Service name</label>
            <input
              className="w-full bg-white-5 border border-white-10 rounded-md px-[10px] py-2 text-xs text-white-80 outline-none"
              placeholder="e.g. GitHub"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="text-[9px] tracking-[0.07em] uppercase text-white-30 mb-1.5 block">Status page URL</label>
            <input
              className="w-full bg-white-5 border border-white-10 rounded-md px-[10px] py-2 text-xs text-white-80 outline-none"
              placeholder="e.g. https://githubstatus.com"
              value={url}
              onChange={e => { setUrl(e.target.value); setError(null) }}
            />
            <p className="text-[9px] text-white-20 mt-[5px]">
              Statuspage.io pages get full incident data automatically
            </p>
          </div>

          {error && (
            <p className="text-[10px] text-status-outage mb-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-medium transition-all duration-150 border ${canSubmit ? 'bg-[rgba(99,102,241,0.2)] border-[rgba(129,140,248,0.4)] text-[rgba(129,140,248,0.9)] cursor-pointer' : 'bg-white-4 border-white-8 text-white-20 cursor-not-allowed'}`}
          >
            <IconPlus size={12} stroke={2} />
            {loading ? 'Checking...' : 'Add service'}
          </button>
        </form>
      </div>
    </div>
  )
}
