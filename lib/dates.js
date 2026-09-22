// ─────────────────────────────────────────────
// Tehran timezone date helpers (string-based,
// timezone-safe for Asia/Tehran)
// ─────────────────────────────────────────────
const TEHRAN_TIMEZONE = 'Asia/Tehran';

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTehranParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year').value),
    month: Number(parts.find((p) => p.type === 'month').value),
    day: Number(parts.find((p) => p.type === 'day').value),
  };
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function formatFromParts({ year, month, day }) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function addDaysToString(dateStr, days) {
  const { year, month, day } = parseDate(dateStr);
  const ts = Date.UTC(year, month - 1, day) + days * 86400000;
  const d = new Date(ts);
  return formatFromParts({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

// Get today's date string in Tehran timezone (YYYY-MM-DD)
export function today() {
  const { year, month, day } = getTehranParts(new Date());
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Get a date offset by a number of days (Tehran-based)
export function addDays(date, days) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  return addDaysToString(str, days);
}

// First day of the current month (Tehran)
export function firstDayOfMonth(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  const { year, month } = parseDate(str);
  return `${year}-${pad(month)}-01`;
}

// First day of the previous month (Tehran)
export function firstDayOfPreviousMonth(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  const { year, month } = parseDate(str);
  if (month === 1) {
    return `${year - 1}-12-01`;
  }
  return `${year}-${pad(month - 1)}-01`;
}

// Format a Date as YYYY-MM-DD in Tehran timezone
export function formatYYYYMMDD(date) {
  if (typeof date === 'string') return date;
  const { year, month, day } = getTehranParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Validate a YYYY-MM-DD date string
export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// First day of the next month (Tehran)
export function firstDayOfNextMonth(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  const { year, month } = parseDate(str);
  if (month === 12) {
    return `${year + 1}-01-01`;
  }
  return `${year}-${pad(month + 1)}-01`;
}

// Get the date range for the current month
export function currentMonthRange(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  const start = firstDayOfMonth(str);
  const end = firstDayOfNextMonth(str);
  return { start, end };
}

// Get the date range for the previous month
export function previousMonthRange(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  const start = firstDayOfPreviousMonth(str);
  const end = firstDayOfMonth(str);
  return { start, end };
}

// Get tomorrow's date string in Tehran time
export function tomorrow(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  return addDaysToString(str, 1);
}

// Get a date 7 days from the given date (Tehran)
export function weekFrom(date) {
  const str = typeof date === 'string' ? date : formatYYYYMMDD(date);
  return addDaysToString(str, 7);
}

export { TEHRAN_TIMEZONE };
