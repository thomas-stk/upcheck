const { net } = require('electron')

function mapStatusPage(indicator) {
    if (indicator === 'none')                          return 'operational'
    if (indicator === 'minor')                         return 'degraded'
    if (indicator === 'major' || indicator === 'critical') return 'outage'
    return 'unknown'
}

async function fetchCustom(id, name, url) {
    const base = url.replace(/\/$/, '')
    const lower = base.toLowerCase()
    const t0 = Date.now()

    // Apple — JSONP wrapper, not standard JSON
    if (lower.includes('apple.com')) {
        try {
            const res  = await net.fetch('https://www.apple.com/support/systemstatus/data/system_status_en_US.js')
            const text = await res.text()
            const json = JSON.parse(text.replace(/^Apple\.SystemStatus\.apiResult\(/, '').replace(/\);\s*$/, ''))
            const hasIssues = json.services.some(s => s.events && s.events.length > 0)
            return {
                id, name,
                indicator: hasIssues ? 'degraded' : 'operational',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: [],
                checkType: 'custom',
            }
        } catch {}
    }

    // Azure — RSS/XML feed, no JSON available
    if (lower.includes('azure') || lower.includes('status.microsoft')) {
        try {
            const res  = await net.fetch('https://azurestatuscdn.azureedge.net/en-us/status/feed/')
            const text = await res.text()
            return {
                id, name,
                indicator: /<entry>/i.test(text) ? 'degraded' : 'operational',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: [],
                checkType: 'custom',
            }
        } catch {}
    }

    // Google Cloud — incidents.json, different shape to Statuspage
    if (lower.includes('cloud.google.com') || lower.includes('status.cloud.google')) {
        try {
            const res  = await net.fetch('https://status.cloud.google.com/incidents.json')
            const data = await res.json()
            return {
                id, name,
                indicator: data.length === 0 ? 'operational' : 'degraded',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: data.map(i => ({
                    id:        i.id,
                    name:      i.external_desc,
                    status:    i.most_recent_update?.status ?? 'unknown',
                    impact:    i.severity ?? 'minor',
                    updatedAt: i.most_recent_update?.when ?? i.modified,
                })),
                checkType: 'custom',
            }
        } catch {}
    }

    // Statusgator — aggregator site, blocks HEAD so use GET
    if (lower.includes('statusgator.com')) {
        try {
            const res = await net.fetch(base)
            return {
                id, name,
                indicator: res.ok ? 'operational' : 'outage',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: [],
                checkType: 'ping',
            }
        } catch {
            return {
                id, name,
                indicator: 'unknown',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: [],
                checkType: 'ping',
            }
        }
    }

    // Slack — uses its own /api/v2.0.0/current, not the standard Statuspage path
    if (lower.includes('slack-status.com') || lower.includes('slack.com')) {
        try {
            const res  = await net.fetch('https://slack-status.com/api/v2.0.0/current')
            const data = await res.json()
            return {
                id, name,
                indicator: data.status === 'ok' ? 'operational' : 'degraded',
                responseTimeMs: Date.now() - t0,
                lastChecked: new Date().toISOString(),
                incidents: (data.active_incidents || []).map(i => ({
                    id:        String(i.id),
                    name:      i.title,
                    status:    i.type,
                    impact:    'minor',
                    updatedAt: i.date_updated,
                })),
                checkType: 'custom',
            }
        } catch {}
    }

    // Statuspage.io — covers most SaaS (GitHub, Stripe, Twitch, etc.)
    try {
        const res = await net.fetch(`${base}/api/v2/summary.json`)
        if (res.ok) {
            const data = await res.json()
            if (data?.status?.indicator !== undefined) {
                return {
                    id, name,
                    indicator: mapStatusPage(data.status.indicator),
                    responseTimeMs: Date.now() - t0,
                    lastChecked: new Date().toISOString(),
                    incidents: (data.incidents || []).map(i => ({
                        id:        i.id,
                        name:      i.name,
                        status:    i.status,
                        impact:    i.impact,
                        updatedAt: i.updated_at,
                    })),
                    checkType: 'statuspage',
                }
            }
        }
    } catch {}

    // fallback — plain HEAD ping
    try {
        const res = await net.fetch(base, { method: 'HEAD' })
        return {
            id, name,
            indicator: res.ok ? 'operational' : 'outage',
            responseTimeMs: Date.now() - t0,
            lastChecked: new Date().toISOString(),
            incidents: [],
            checkType: 'ping',
        }
    } catch {
        return {
            id, name,
            indicator: 'unknown',
            responseTimeMs: Date.now() - t0,
            lastChecked: new Date().toISOString(),
            incidents: [],
            checkType: 'ping',
        }
    }
}

async function pollAll(customServices = []) {
    const results = await Promise.allSettled(
        customServices.map(s => fetchCustom(s.id, s.name, s.url))
    )

    return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value
        console.error('poll failed for', customServices[i]?.name, result.reason)
        return {
            id:            customServices[i]?.id ?? `service-${i}`,
            name:          customServices[i]?.name ?? 'Unknown',
            indicator:     'unknown',
            responseTimeMs: 0,
            lastChecked:   new Date().toISOString(),
            incidents:     [],
            checkType:     'ping',
        }
    })
}

let previousStatuses = {}

function startPoll(onUpdate, getCustomServices = () => [], intervalMs = 60000) {
    const tick = async () => {
        const results = await pollAll(getCustomServices())
        const changed = results.filter(s => previousStatuses[s.id] !== s.indicator)
        changed.forEach(s => { previousStatuses[s.id] = s.indicator })
        onUpdate(results, changed)
    }
    tick()
    return setInterval(tick, intervalMs)
}

module.exports = { startPoll, fetchCustom }
