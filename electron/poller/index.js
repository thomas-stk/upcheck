const { net } = require('electron')
const { mapStatusPage, mapComponentStatus, worstOfTwo } = require('../utils')

// test seam: replaced by tests to avoid requiring a real Electron process
let _fetchFn = null
function _setFetchForTesting(fn) { _fetchFn = fn }
function doFetch(url, opts) { return (_fetchFn || net.fetch.bind(net))(url, opts) }

async function fetchCustom(id, name, url) {
    const base  = url.replace(/\/$/, '')
    const lower = base.toLowerCase()
    const t0    = Date.now()

    // Apple wraps their status data in a JSONP function call instead of plain JSON
    if (lower.includes('apple.com')) {
        try {
            const res  = await doFetch('https://www.apple.com/support/systemstatus/data/system_status_en_US.js')
            const text = await res.text()
            const json = JSON.parse(text.replace(/^Apple\.SystemStatus\.apiResult\(/, '').replace(/\);\s*$/, ''))
            const hasIssues = json.services.some(s => s.events && s.events.some(e => e.eventStatus !== 'resolved'))
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

    // Azure only publishes an RSS feed, no JSON endpoint available
    if (lower.includes('azure') || lower.includes('status.microsoft')) {
        try {
            const res  = await doFetch('https://azurestatuscdn.azureedge.net/en-us/status/feed/')
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

    // Google Cloud uses its own incidents.json format rather than Statuspage
    if (lower.includes('cloud.google.com') || lower.includes('status.cloud.google')) {
        try {
            const res  = await doFetch('https://status.cloud.google.com/incidents.json')
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

    // Statusgator blocks HEAD requests so we have to do a full GET
    if (lower.includes('statusgator.com')) {
        try {
            const res = await doFetch(base)
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

    // Slack has its own API format rather than using Statuspage
    if (lower.includes('slack-status.com') || lower.includes('slack.com')) {
        try {
            const res  = await doFetch('https://slack-status.com/api/v2.0.0/current')
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

    // most services run on Statuspage so this catches the majority of cases
    try {
        const res = await doFetch(`${base}/api/v2/summary.json`)
        if (res.ok) {
            const data = await res.json()
            if (data?.status?.indicator !== undefined) {
                const topLevel = mapStatusPage(data.status.indicator)
                const componentWorst = (data.components || []).reduce(
                    (worst, c) => worstOfTwo(worst, mapComponentStatus(c.status)),
                    'operational'
                )
                return {
                    id, name,
                    indicator: worstOfTwo(topLevel, componentWorst),
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

    // nothing worked, just ping the URL and see if it responds at all
    try {
        const res = await doFetch(base, { method: 'HEAD' })
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
            id:             customServices[i]?.id ?? `service-${i}`,
            name:           customServices[i]?.name ?? 'Unknown',
            indicator:      'unknown',
            responseTimeMs: 0,
            lastChecked:    new Date().toISOString(),
            incidents:      [],
            checkType:      'ping',
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

async function triggerPoll(onUpdate, getCustomServices = () => []) {
    const results = await pollAll(getCustomServices())
    const changed = results.filter(s => previousStatuses[s.id] !== s.indicator)
    changed.forEach(s => { previousStatuses[s.id] = s.indicator })
    onUpdate(results, changed)
}

module.exports = { startPoll, triggerPoll, fetchCustom, _setFetchForTesting }
