const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toDateInputValue = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDefaultLedgerRange = (now = new Date()) => {
  const today = toDateInputValue(now);
  const date = now instanceof Date ? now : new Date(now);
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  return { start: `${year}-01-01`, end: today };
};

const isValidCalendarDate = (value) => {
  if (!DATE_INPUT_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const normalizeLedgerDateRange = (range = {}) => {
  const defaults = getDefaultLedgerRange();
  const start = String(range.start || defaults.start).trim();
  const end = String(range.end || defaults.end).trim();

  if (!isValidCalendarDate(start) || !isValidCalendarDate(end)) {
    return { ok: false, message: "Enter valid dates in YYYY-MM-DD format." };
  }
  if (start > end) {
    return { ok: false, message: "Start date cannot be after end date." };
  }
  return { ok: true, start, end };
};
