import { describe, it, expect } from 'vitest'
import { mapStatusPage, worstStatus, buildTooltip } from '../electron/utils.js'

describe('mapStatusPage', () => {
  it('maps none to operational', () => {
    expect(mapStatusPage('none')).toBe('operational')
  })
  it('maps minor to degraded', () => {
    expect(mapStatusPage('minor')).toBe('degraded')
  })
  it('maps major to outage', () => {
    expect(mapStatusPage('major')).toBe('outage')
  })
  it('maps critical to outage', () => {
    expect(mapStatusPage('critical')).toBe('outage')
  })
  it('maps anything else to unknown', () => {
    expect(mapStatusPage('maintenance')).toBe('unknown')
    expect(mapStatusPage('')).toBe('unknown')
    expect(mapStatusPage(undefined)).toBe('unknown')
  })
})

describe('worstStatus', () => {
  it('returns unknown for empty list', () => {
    expect(worstStatus([])).toBe('unknown')
  })
  it('returns operational when all operational', () => {
    expect(worstStatus([
      { indicator: 'operational' },
      { indicator: 'operational' },
    ])).toBe('operational')
  })
  it('returns degraded when mix of operational and degraded', () => {
    expect(worstStatus([
      { indicator: 'operational' },
      { indicator: 'degraded' },
    ])).toBe('degraded')
  })
  it('returns outage when any service is down', () => {
    expect(worstStatus([
      { indicator: 'operational' },
      { indicator: 'degraded' },
      { indicator: 'outage' },
    ])).toBe('outage')
  })
  it('outage takes priority over degraded', () => {
    expect(worstStatus([
      { indicator: 'degraded' },
      { indicator: 'outage' },
    ])).toBe('outage')
  })
})

describe('buildTooltip', () => {
  it('returns starting message for empty list', () => {
    expect(buildTooltip([])).toContain('Starting')
  })
  it('returns all operational message', () => {
    expect(buildTooltip([{ indicator: 'operational', name: 'GitHub' }]))
      .toContain('operational')
  })
  it('names the single downed service', () => {
    expect(buildTooltip([{ indicator: 'outage', name: 'GitHub' }]))
      .toBe('GitHub is down')
  })
  it('counts multiple outages', () => {
    expect(buildTooltip([
      { indicator: 'outage', name: 'GitHub' },
      { indicator: 'outage', name: 'Slack' },
    ])).toBe('2 services down')
  })
  it('names the single degraded service', () => {
    expect(buildTooltip([{ indicator: 'degraded', name: 'Slack' }]))
      .toBe('Slack is degraded')
  })
})
