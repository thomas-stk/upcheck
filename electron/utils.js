function mapStatusPage(indicator) {
  if (indicator === 'none')                              return 'operational'
  if (indicator === 'minor')                             return 'degraded'
  if (indicator === 'major' || indicator === 'critical') return 'outage'
  return 'unknown'
}

function worstStatus(statuses) {
  if (statuses.length === 0)                          return 'unknown'
  if (statuses.some(s => s.indicator === 'outage'))   return 'outage'
  if (statuses.some(s => s.indicator === 'degraded')) return 'degraded'
  if (statuses.some(s => s.indicator === 'unknown'))  return 'unknown'
  return 'operational'
}

function buildTooltip(statuses) {
  const outages  = statuses.filter(s => s.indicator === 'outage')
  const degraded = statuses.filter(s => s.indicator === 'degraded')
  if (outages.length === 1)  return `${outages[0].name} is down`
  if (outages.length > 1)    return `${outages.length} services down`
  if (degraded.length === 1) return `${degraded[0].name} is degraded`
  if (degraded.length > 1)   return `${degraded.length} services degraded`
  if (statuses.length === 0) return 'UpCheck: Starting...'
  return 'UpCheck: All systems operational'
}

module.exports = { mapStatusPage, worstStatus, buildTooltip }
