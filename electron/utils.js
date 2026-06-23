function mapComponentStatus(status) {
  if (status === 'operational') return 'operational'
  if (status === 'under_maintenance') return 'degraded'
  if (status === 'degraded_performance') return 'degraded'
  if (status === 'partial_outage') return 'degraded'
  if (status === 'major_outage') return 'outage'
  return 'unknown'
}

const STATUS_RANK = { outage: 3, degraded: 2, unknown: 1, operational: 0 }

function worstOfTwo(a, b) {
  return (STATUS_RANK[a] ?? STATUS_RANK.unknown) >= (STATUS_RANK[b] ?? STATUS_RANK.unknown) ? a : b
}

function mapStatusPage(indicator) {
  if (indicator === 'none') return 'operational'
  if (indicator === 'minor') return 'degraded'
  if (indicator === 'major' || indicator === 'critical') return 'outage'
  return 'unknown'
}


function worstStatus(statuses) {
  if (statuses.length === 0) return 'unknown'
  if (statuses.some(s => s.indicator === 'outage')) return 'outage'
  if (statuses.some(s => s.indicator === 'degraded')) return 'degraded'
  if (statuses.some(s => s.indicator === 'unknown')) return 'unknown'
  return 'operational'
}

function buildTooltip(statuses) {
  const outages = statuses.filter(s => s.indicator === 'outage')
  const degraded = statuses.filter(s => s.indicator === 'degraded')
  if (outages.length === 1) return `${outages[0].name} is down`
  if (outages.length > 1) return `${outages.length} services down`
  if (degraded.length === 1) return `${degraded[0].name} is degraded`
  if (degraded.length > 1) return `${degraded.length} services degraded`
  if (statuses.length === 0) return 'UpCheck: Starting...'
  return 'UpCheck: All systems operational'
}

module.exports = { mapStatusPage, mapComponentStatus, worstOfTwo, worstStatus, buildTooltip }
