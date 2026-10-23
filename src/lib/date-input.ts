export function formatDayFirstDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function parseDayFirstDate(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000) return null;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getDayFirstDateError(
  value: string,
  min?: string,
  max?: string,
): string | null {
  if (!value) return null;
  const parsed = parseDayFirstDate(value);
  if (!parsed) return "Enter a valid date in DD/MM/YYYY format.";
  if (min && parsed < min) return "Date cannot be in the past. Choose today or a future date.";
  if (max && parsed > max) return "Date cannot be in the future.";
  return null;
}
