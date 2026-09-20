// lib/utils.js
// Shared utilities

// ─────────────────────────────────────────────
// HTML escaping
// ─────────────────────────────────────────────
export function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// Number formatting
// ─────────────────────────────────────────────
export function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US');
}

// ─────────────────────────────────────────────
// Date validation
// ─────────────────────────────────────────────
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