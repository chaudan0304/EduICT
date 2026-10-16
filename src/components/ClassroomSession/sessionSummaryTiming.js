const milliseconds = value => value ? Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(' ', 'T') + 'Z' : value) : NaN;
export function getSessionSummaryTiming(session = {}, activities = []) {
  const start = milliseconds(session.started_at);
  const end = milliseconds(session.ended_at);
  const pauseStart = milliseconds(session.paused_at);
  const paused = Math.max(0, Number(session.total_paused_seconds) || 0) + (Number.isFinite(pauseStart) && Number.isFinite(end) ? Math.max(0, (end - pauseStart) / 1000) : 0);
  return { actualSeconds: Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.max(0, Math.floor((end - start) / 1000 - paused)) : null,
    plannedMinutes: Number(session.duration_minutes || session.durationMinutes) || 35,
    completed: activities.filter(activity => activity.status === 'COMPLETED').length, total: activities.length };
}
