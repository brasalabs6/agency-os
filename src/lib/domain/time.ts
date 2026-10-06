export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

function offsetAt(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedDateTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone = DEFAULT_TIME_ZONE) {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = new Date(wallAsUtc);
  const offset = offsetAt(guess, timeZone);
  guess = new Date(wallAsUtc - offset);
  const correctedOffset = offsetAt(guess, timeZone);
  if (correctedOffset !== offset) guess = new Date(wallAsUtc - correctedOffset);
  return guess;
}

export function dateKeyInTimeZone(date: Date | string, timeZone = DEFAULT_TIME_ZONE) {
  const value = typeof date === "string" ? new Date(date) : date;
  const parts = zonedParts(value, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dayRangeInTimeZone(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = zonedParts(now, timeZone);
  const start = zonedDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
  const noon = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  const tomorrowParts = zonedParts(new Date(noon.getTime() + 24 * 60 * 60 * 1000), timeZone);
  const nextStart = zonedDateTimeToUtc(tomorrowParts.year, tomorrowParts.month, tomorrowParts.day, 0, 0, 0, timeZone);
  return { start, end: new Date(nextStart.getTime() - 1) };
}
