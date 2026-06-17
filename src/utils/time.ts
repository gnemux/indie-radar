export type DayWindow = {
  date: string;
  startIso: string;
  endIso: string;
};

export function getReportDate(timezone: string, explicitDate?: string): string {
  if (explicitDate) return explicitDate;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export function getDayWindow(timezone: string, date: string): DayWindow {
  const [year, month, day] = parseDate(date);
  const start = zonedTimeToUtc(timezone, year, month, day, 0, 0, 0);
  const nextDate = addDays(year, month, day, 1);
  const end = zonedTimeToUtc(timezone, nextDate.year, nextDate.month, nextDate.day, 0, 0, 0);

  return {
    date,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = parseDate(date);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

function parseDate(date: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Invalid date: ${date}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return [year, month, day];
}

function addDays(year: number, month: number, day: number, days: number): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function zonedTimeToUtc(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimezoneOffsetMs(new Date(utcMs), timezone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }

  return new Date(utcMs);
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hourPart = part(parts, "hour");
  const hour = hourPart === "24" ? 0 : Number(hourPart);
  const asUtc = Date.UTC(
    Number(part(parts, "year")),
    Number(part(parts, "month")) - 1,
    Number(part(parts, "day")),
    hour,
    Number(part(parts, "minute")),
    Number(part(parts, "second")),
  );
  return asUtc - date.getTime();
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  const value = parts.find((item) => item.type === type)?.value;
  if (!value) throw new Error(`Missing date part: ${type}`);
  return value;
}
