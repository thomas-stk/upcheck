const {net} = require('electron')

function mapStatusPage(indicator) {
    if (indicator === 'none') return 'operational'
    if (indicator === 'minor') return 'degraded'
    if (indicator === 'major' || indicator === 'critical') return 'outage'
    return 'unknown'
}

async function fetchSlack() {
    const t0 = Date.now()
    const res = await net.fetch('https://slack-status.com/api/v2.0.0/current')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return {
        id: 'slack',
        name: 'Slack',
        indicator: data.status === "ok" ? 'operational' : 'degraded',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: data.active_incidents.map(i => ({
            id: i.id,
            name: i.title,
            status: i.status,
            impact: i.type,
            updatedAt: i.date_updated
        }))
    }
    }

async function fetchClaude() {
    const t0 = Date.now()
    const res = await net.fetch('https://anthropic.statuspage.io/api/v2/summary.json')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return { 
        id: 'claude',
        name: 'Claude',
        indicator: mapStatusPage(data.status.indicator),
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: data.incidents.map(i => ({
            id: i.id,
            name: i.name,
            status: i.status,
            impact: i.impact,
            updatedAt: i.updated_at
        }))
    }
}

async function fetchWindsurf() {
    const t0 = Date.now()
    const res = await net.fetch('https://status.windsurf.com/api/v2/summary.json')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return {
        id: 'windsurf',
        name: 'Windsurf',
        indicator: mapStatusPage(data.status.indicator),
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: data.incidents.map(i => ({
            id: i.id,
            name: i.name,
            status: i.status,
            impact: i.impact,
            updatedAt: i.updated_at
        }))
    }
}

async function fetchSentinelOne() {
    const t0 = Date.now()
    const res = await net.fetch('https://status.sentinelone.com/api/v2/summary.json')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return {
        id: 'sentinelone',
        name: 'SentinelOne',
        indicator: mapStatusPage(data.status.indicator),
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: data.incidents.map(i => ({
            id: i.id,
            name: i.name,
            status: i.status,
            impact: i.impact,
            updatedAt: i.updated_at
        }))
    }
}

async function fetchGoogleCloud() {
    const t0 = Date.now()
    const res = await net.fetch('https://status.cloud.google.com/incidents.json')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return {
        id: 'googlecloud',
        name: 'Google Cloud',
        // empty array means all clear, any items means something is wrong
        indicator: data.length === 0 ? 'operational' : 'degraded',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: []
    }
}

async function fetchIntruder() {
    const t0 = Date.now()
    const res = await net.fetch('https://status.intruder.io/api/v1/')
    const data = await res.json()
    const responseTimeMs = Date.now() - t0
    return {
        id: 'intruder',
        name: 'Intruder',
        indicator: data.page.state === 'operational' ? 'operational' : 'degraded',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: []
    }
}

async function fetchOpenCVE() {
    const t0 = Date.now()
    const res = await net.fetch('https://app.opencve.io', { method: 'HEAD' })
    const responseTimeMs = Date.now() - t0
    return {
        id: 'opencve',
        name: 'OpenCVE',
        indicator: res.ok ? 'operational' : 'outage',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: []
    }
}

async function fetchApple() {
    const t0 = Date.now()
    const res = await net.fetch('https://www.apple.com/support/systemstatus/data/system_status_en_US.js')
    const text = await res.text()
    const responseTimeMs = Date.now() - t0

    // strip the JSONP wrapper from both ends before parsing
    const json = JSON.parse(
        text.replace(/^Apple\.SystemStatus\.apiResult\(/, '').replace(/\);\s*$/, '')
    )

    const hasIssues = json.services.some(s => s.events && s.events.length > 0)
    return {
        id: 'apple',
        name: 'Apple',
        indicator: hasIssues ? 'degraded' : 'operational',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: []
    }
}

async function fetchAzure() {
    const t0 = Date.now()
    const res = await net.fetch('https://azurestatuscdn.azureedge.net/en-us/status/feed/')
    const text = await res.text()
    const responseTimeMs = Date.now() - t0
    // no XML parser needed, presence of any <entry> tag means there is an active incident
    const hasIncidents = /<entry>/i.test(text)
    return {
        id: 'azure',
        name: 'Azure',
        indicator: hasIncidents ? 'degraded' : 'operational',
        responseTimeMs,
        lastChecked: new Date().toISOString(),
        incidents: []
    }
}

async function pollAll() {
    const results = await Promise.allSettled([
        fetchClaude(),
        fetchWindsurf(),
        fetchSentinelOne(),
        fetchSlack(),
        fetchGoogleCloud(),
        fetchIntruder(),
        fetchApple(),
        fetchAzure(),
        fetchOpenCVE(),
    ])

    // convert allSettled results into a flat array.
    // if a fetch crashed, return a safe unknown fallback so one bad endpoint
    // never wipes out the whole dashboard.
    return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value
        console.error('poll failed for service index', i, result.reason)
        return {
            id: `service-${i}`,
            name: 'Unknown',
            indicator: 'unknown',
            responseTimeMs: 0,
            lastChecked: new Date().toISOString(),
            incidents: []
        }
    })
}

let previousStatuses = {}

function startPoll(onUpdate, intervalMs= 60000) {
    const tick = async () => {
        const results = await pollAll()
        const changed = results.filter(s => previousStatuses[s.id] !== s.indicator)
        changed.forEach(s => { previousStatuses[s.id] = s.indicator })
        onUpdate(results, changed)
    }
    tick()
    return setInterval(tick, intervalMs)
}

module.exports = {
    startPoll
}