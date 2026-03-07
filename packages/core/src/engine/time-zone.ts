export interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

interface ShiftDelta {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  formatterCache.set(timeZone, formatter);

  return formatter;
}

export function getZonedDateTimeParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type === 'literal') {
      continue;
    }

    values[part.type] = Number.parseInt(part.value, 10);
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: date.getUTCMilliseconds(),
  };
}

export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone);
  const utcFromZoned = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );

  return utcFromZoned - date.getTime();
}

export function zonedDateTimeToUtc(parts: ZonedDateTimeParts, timeZone: string): Date {
  let utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
    const nextGuess = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond,
    ) - offset;

    if (nextGuess === utcGuess) {
      break;
    }

    utcGuess = nextGuess;
  }

  return new Date(utcGuess);
}

export function getZonedDayOfWeek(date: Date, timeZone: string): number {
  const parts = getZonedDateTimeParts(date, timeZone);

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function shiftZonedDate(date: Date, timeZone: string, delta: ShiftDelta): Date {
  const parts = getZonedDateTimeParts(date, timeZone);
  const normalizedUtc = new Date(
    Date.UTC(
      parts.year + (delta.years ?? 0),
      parts.month - 1 + (delta.months ?? 0),
      parts.day + (delta.days ?? 0),
      parts.hour + (delta.hours ?? 0),
      parts.minute + (delta.minutes ?? 0),
      parts.second + (delta.seconds ?? 0),
      parts.millisecond,
    ),
  );

  return zonedDateTimeToUtc(
    {
      year: normalizedUtc.getUTCFullYear(),
      month: normalizedUtc.getUTCMonth() + 1,
      day: normalizedUtc.getUTCDate(),
      hour: normalizedUtc.getUTCHours(),
      minute: normalizedUtc.getUTCMinutes(),
      second: normalizedUtc.getUTCSeconds(),
      millisecond: normalizedUtc.getUTCMilliseconds(),
    },
    timeZone,
  );
}

export function startOfZonedDay(date: Date, timeZone: string): Date {
  const parts = getZonedDateTimeParts(date, timeZone);

  return zonedDateTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  );
}
