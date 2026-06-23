import { describe, it, expect, vi, beforeEach } from 'vitest'
import pollerModule from '../electron/poller/index.js'

const { fetchCustom, _setFetchForTesting } = pollerModule

const mockFetch = vi.fn()
_setFetchForTesting(mockFetch)

function fakeFetch(status, body) {
  mockFetch.mockResolvedValue({
    ok:   status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchCustom: Statuspage.io auto-detect', () => {
  it('returns operational when indicator is none', async () => {
    fakeFetch(200, { status: { indicator: 'none' }, incidents: [] })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('operational')
    expect(result.checkType).toBe('statuspage')
  })

  it('returns degraded when indicator is minor', async () => {
    fakeFetch(200, { status: { indicator: 'minor' }, incidents: [] })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('degraded')
  })

  it('returns outage when indicator is major', async () => {
    fakeFetch(200, { status: { indicator: 'major' }, incidents: [] })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('outage')
  })

  it('maps incidents from statuspage format', async () => {
    fakeFetch(200, {
      status: { indicator: 'minor' },
      incidents: [{ id: '1', name: 'Slow API', status: 'investigating', impact: 'minor', updated_at: '2024-01-01T00:00:00Z' }],
    })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.incidents).toHaveLength(1)
    expect(result.incidents[0].name).toBe('Slow API')
  })
})

describe('fetchCustom: HEAD ping fallback', () => {
  it('returns operational when HEAD returns 200', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('not statuspage'))
      .mockResolvedValueOnce({ ok: true, status: 200 })
    const result = await fetchCustom('x', 'X', 'https://example.com')
    expect(result.indicator).toBe('operational')
    expect(result.checkType).toBe('ping')
  })

  it('returns outage when HEAD returns non-ok', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('not statuspage'))
      .mockResolvedValueOnce({ ok: false, status: 503 })
    const result = await fetchCustom('x', 'X', 'https://example.com')
    expect(result.indicator).toBe('outage')
  })

  it('returns unknown when all fetches throw', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const result = await fetchCustom('x', 'X', 'https://example.com')
    expect(result.indicator).toBe('unknown')
  })
})

describe('fetchCustom: Slack', () => {
  it('returns operational when slack status is ok', async () => {
    fakeFetch(200, { status: 'ok', active_incidents: [] })
    const result = await fetchCustom('slack', 'Slack', 'https://slack-status.com')
    expect(result.indicator).toBe('operational')
    expect(result.checkType).toBe('custom')
  })

  it('returns degraded when slack has active incidents', async () => {
    fakeFetch(200, {
      status: 'active',
      active_incidents: [{ id: 1, title: 'Messages delayed', type: 'incident', date_updated: '2024-01-01T00:00:00Z' }],
    })
    const result = await fetchCustom('slack', 'Slack', 'https://slack-status.com')
    expect(result.indicator).toBe('degraded')
    expect(result.incidents).toHaveLength(1)
  })
})

describe('fetchCustom: Statuspage component-level status', () => {
  it('returns outage when a component has major_outage even if top-level indicator is none', async () => {
    fakeFetch(200, {
      status: { indicator: 'none' },
      incidents: [],
      components: [
        { status: 'operational' },
        { status: 'major_outage' },
      ],
    })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('outage')
  })

  it('returns degraded when a component has partial_outage and top-level is none', async () => {
    fakeFetch(200, {
      status: { indicator: 'none' },
      incidents: [],
      components: [
        { status: 'operational' },
        { status: 'partial_outage' },
      ],
    })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('degraded')
  })

  it('returns outage when top-level is major even if all components are operational', async () => {
    fakeFetch(200, {
      status: { indicator: 'major' },
      incidents: [],
      components: [{ status: 'operational' }],
    })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('outage')
  })

  it('returns operational when all components are operational and top-level is none', async () => {
    fakeFetch(200, {
      status: { indicator: 'none' },
      incidents: [],
      components: [{ status: 'operational' }, { status: 'operational' }],
    })
    const result = await fetchCustom('gh', 'GitHub', 'https://www.githubstatus.com')
    expect(result.indicator).toBe('operational')
  })
})

describe('fetchCustom: output shape', () => {
  it('always returns id and name matching input', async () => {
    fakeFetch(200, { status: { indicator: 'none' }, incidents: [] })
    const result = await fetchCustom('my-id', 'My Service', 'https://www.githubstatus.com')
    expect(result.id).toBe('my-id')
    expect(result.name).toBe('My Service')
  })

  it('always includes responseTimeMs and lastChecked', async () => {
    fakeFetch(200, { status: { indicator: 'none' }, incidents: [] })
    const result = await fetchCustom('x', 'X', 'https://www.githubstatus.com')
    expect(typeof result.responseTimeMs).toBe('number')
    expect(result.lastChecked).toBeTruthy()
  })
})
