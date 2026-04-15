export const CENTRAL_TIME_ZONE = 'America/Chicago';

function toDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDateCentral(value, options = {}) {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: CENTRAL_TIME_ZONE, ...options }).format(d);
}

export function formatTimeCentral(value, options = {}) {
  return formatDateCentral(value, { hour: 'numeric', minute: '2-digit', ...options });
}

export function formatDateTimeCentral(value, options = {}) {
  return formatDateCentral(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options
  });
}

export function getCentralNowParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const weekdayMap = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6
  };
  const dayIndex = weekdayMap[(map.weekday || '').toLowerCase()] ?? 0;
  const hour = Number.parseInt(map.hour || '0', 10);
  const minute = Number.parseInt(map.minute || '0', 10);

  return {
    dayIndex,
    hour: Number.isNaN(hour) ? 0 : hour,
    minute: Number.isNaN(minute) ? 0 : minute
  };
}

export function getMonthDayFromIsoDate(dateValue) {
  if (!dateValue || typeof dateValue !== 'string') return { monthShort: '', day: '' };
  const m = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { monthShort: '', day: '' };
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  if (!year || !month || !day) return { monthShort: '', day: '' };
  const dt = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return {
    monthShort: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(dt).toUpperCase(),
    day
  };
}

