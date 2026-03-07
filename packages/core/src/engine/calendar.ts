import type { Calendar, TimeRange } from '../contracts/model.js';
import { getZonedDateTimeParts, getZonedDayOfWeek, shiftZonedDate, startOfZonedDay, zonedDateTimeToUtc } from './time-zone.js';

export type CalendarAvailability = 'working' | 'non-working' | 'blackout';
export type CalendarStatusReason = 'rule' | 'exception' | 'window';

export interface CalendarStatus {
  status: CalendarAvailability;
  reason: CalendarStatusReason;
  sourceId?: string;
}

export interface CalendarAvailabilitySlice extends TimeRange {
  status: CalendarAvailability;
  reason: CalendarStatusReason;
  sourceId?: string;
}

interface CalendarResolutionOptions {
  timeZone?: string;
}

interface CompiledWorkingRule {
  id: string;
  daysOfWeek: number[];
  startMinute: number;
  endMinute: number;
  overnight: boolean;
  fullDay: boolean;
}

interface CompiledException {
  id: string;
  startMs: number;
  endMs: number;
  kind: 'working' | 'non-working';
}

interface CompiledBlackoutWindow {
  id: string;
  startMs: number;
  endMs: number;
}

interface CompiledCalendar {
  timeZone: string;
  workingRules: CompiledWorkingRule[];
  exceptions: CompiledException[];
  blackoutWindows: CompiledBlackoutWindow[];
}

interface ClockTime {
  hour: number;
  minute: number;
  second: number;
}

const BLACKOUT_WINDOW_MATCHERS = ['blackout', 'blocked', 'non-working'];

function parseIsoToMillis(value: string, fieldPath: string): number {
  const millis = Date.parse(value);

  if (!Number.isFinite(millis)) {
    throw new Error(`${fieldPath} must be a valid ISO-8601 date-time string`);
  }

  return millis;
}

function parseRangeToMillis(range: TimeRange): { startMs: number; endMs: number } {
  const startMs = parseIsoToMillis(range.start, 'range.start');
  const endMs = parseIsoToMillis(range.end, 'range.end');

  if (startMs > endMs) {
    throw new Error('range.start must be before or equal to range.end');
  }

  return { startMs, endMs };
}

function normalizeTimeZone(calendar: Calendar, options: CalendarResolutionOptions): string {
  return options.timeZone ?? calendar.timeZone;
}

function parseClockTime(value: string, fieldPath: string): ClockTime {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);

  if (!match) {
    throw new Error(`${fieldPath} must be in HH:mm or HH:mm:ss format`);
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const second = Number.parseInt(match[3] ?? '0', 10);

  if (hour < 0 || hour > 23) {
    throw new Error(`${fieldPath} hour must be between 00 and 23`);
  }

  if (minute < 0 || minute > 59) {
    throw new Error(`${fieldPath} minute must be between 00 and 59`);
  }

  if (second < 0 || second > 59) {
    throw new Error(`${fieldPath} second must be between 00 and 59`);
  }

  return { hour, minute, second };
}

function toMinuteOfDay(time: ClockTime): number {
  return time.hour * 60 + time.minute;
}

function containsMs(startMs: number, endMs: number, instantMs: number): boolean {
  return startMs <= instantMs && instantMs < endMs;
}

function intersectsRange(startMs: number, endMs: number, rangeStartMs: number, rangeEndMs: number): boolean {
  return startMs < rangeEndMs && endMs > rangeStartMs;
}

function isBlackoutWindowKind(kind: string): boolean {
  const normalized = kind.trim().toLowerCase();

  return BLACKOUT_WINDOW_MATCHERS.some((matcher) => normalized.includes(matcher));
}

function compileCalendar(calendar: Calendar, options: CalendarResolutionOptions = {}): CompiledCalendar {
  const workingRules: CompiledWorkingRule[] = calendar.workingRules.map((rule, index) => {
    const start = parseClockTime(rule.startTime, `calendar.workingRules[${index}].startTime`);
    const end = parseClockTime(rule.endTime, `calendar.workingRules[${index}].endTime`);

    for (const day of rule.daysOfWeek) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new Error(`calendar.workingRules[${index}].daysOfWeek values must be integers between 0 and 6`);
      }
    }

    const startMinute = toMinuteOfDay(start);
    const endMinute = toMinuteOfDay(end);

    return {
      id: rule.id,
      daysOfWeek: [...rule.daysOfWeek],
      startMinute,
      endMinute,
      overnight: startMinute > endMinute,
      fullDay: startMinute === endMinute,
    };
  });

  const exceptions: CompiledException[] = calendar.exceptions.map((exception, index) => {
    const startMs = parseIsoToMillis(exception.start, `calendar.exceptions[${index}].start`);
    const endMs = parseIsoToMillis(exception.end, `calendar.exceptions[${index}].end`);

    if (startMs > endMs) {
      throw new Error(`calendar.exceptions[${index}] start must be before or equal to end`);
    }

    return {
      id: exception.id,
      startMs,
      endMs,
      kind: exception.kind,
    };
  });

  const blackoutWindows: CompiledBlackoutWindow[] = calendar.windows
    .filter((window) => isBlackoutWindowKind(window.kind))
    .map((window, index) => {
      const startMs = parseIsoToMillis(window.start, `calendar.windows[${index}].start`);
      const endMs = parseIsoToMillis(window.end, `calendar.windows[${index}].end`);

      if (startMs > endMs) {
        throw new Error(`calendar.windows[${index}] start must be before or equal to end`);
      }

      return {
        id: window.id,
        startMs,
        endMs,
      };
    });

  return {
    timeZone: normalizeTimeZone(calendar, options),
    workingRules,
    exceptions,
    blackoutWindows,
  };
}

function findMostSpecificInterval<T extends { id: string; startMs: number; endMs: number }>(
  intervals: T[],
  instantMs: number,
): T | undefined {
  let selected: T | undefined;

  for (const interval of intervals) {
    if (!containsMs(interval.startMs, interval.endMs, instantMs)) {
      continue;
    }

    if (!selected) {
      selected = interval;
      continue;
    }

    if (interval.startMs > selected.startMs) {
      selected = interval;
      continue;
    }

    if (interval.startMs === selected.startMs && interval.id > selected.id) {
      selected = interval;
    }
  }

  return selected;
}

function isWorkingByRule(rules: CompiledWorkingRule[], instant: Date, timeZone: string): boolean {
  if (rules.length === 0) {
    return false;
  }

  const parts = getZonedDateTimeParts(instant, timeZone);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const dayOfWeek = getZonedDayOfWeek(instant, timeZone);
  const previousDayOfWeek = (dayOfWeek + 6) % 7;

  return rules.some((rule) => {
    if (rule.fullDay) {
      return rule.daysOfWeek.includes(dayOfWeek);
    }

    if (!rule.overnight) {
      return (
        rule.daysOfWeek.includes(dayOfWeek) &&
        minuteOfDay >= rule.startMinute &&
        minuteOfDay < rule.endMinute
      );
    }

    return (
      (rule.daysOfWeek.includes(dayOfWeek) && minuteOfDay >= rule.startMinute) ||
      (rule.daysOfWeek.includes(previousDayOfWeek) && minuteOfDay < rule.endMinute)
    );
  });
}

function evaluateAtMillis(compiled: CompiledCalendar, instantMs: number): CalendarStatus {
  const blackout = findMostSpecificInterval(compiled.blackoutWindows, instantMs);

  if (blackout) {
    return {
      status: 'blackout',
      reason: 'window',
      sourceId: blackout.id,
    };
  }

  const exception = findMostSpecificInterval(compiled.exceptions, instantMs);

  if (exception) {
    return {
      status: exception.kind === 'working' ? 'working' : 'non-working',
      reason: 'exception',
      sourceId: exception.id,
    };
  }

  const working = isWorkingByRule(compiled.workingRules, new Date(instantMs), compiled.timeZone);

  return {
    status: working ? 'working' : 'non-working',
    reason: 'rule',
  };
}

function addBoundary(boundaries: Set<number>, boundaryMs: number, rangeStartMs: number, rangeEndMs: number): void {
  if (boundaryMs > rangeStartMs && boundaryMs < rangeEndMs) {
    boundaries.add(boundaryMs);
  }
}

function addIntervalBoundaries(
  boundaries: Set<number>,
  intervalStartMs: number,
  intervalEndMs: number,
  rangeStartMs: number,
  rangeEndMs: number,
): void {
  if (!intersectsRange(intervalStartMs, intervalEndMs, rangeStartMs, rangeEndMs)) {
    return;
  }

  addBoundary(boundaries, intervalStartMs, rangeStartMs, rangeEndMs);
  addBoundary(boundaries, intervalEndMs, rangeStartMs, rangeEndMs);
}

function collectRuleBoundaries(
  compiled: CompiledCalendar,
  boundaries: Set<number>,
  rangeStartMs: number,
  rangeEndMs: number,
): void {
  const rangeStart = new Date(rangeStartMs);
  const rangeEnd = new Date(rangeEndMs);
  const startDay = shiftZonedDate(startOfZonedDay(rangeStart, compiled.timeZone), compiled.timeZone, { days: -1 });
  const endDay = shiftZonedDate(startOfZonedDay(rangeEnd, compiled.timeZone), compiled.timeZone, { days: 2 });

  for (
    let cursor = startDay;
    cursor.getTime() <= endDay.getTime();
    cursor = shiftZonedDate(cursor, compiled.timeZone, { days: 1 })
  ) {
    const dayParts = getZonedDateTimeParts(cursor, compiled.timeZone);
    const dayOfWeek = getZonedDayOfWeek(cursor, compiled.timeZone);

    for (const rule of compiled.workingRules) {
      if (!rule.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      const startHour = Math.floor(rule.startMinute / 60);
      const startMinute = rule.startMinute % 60;
      const endHour = Math.floor(rule.endMinute / 60);
      const endMinute = rule.endMinute % 60;

      const intervalStart = zonedDateTimeToUtc(
        {
          year: dayParts.year,
          month: dayParts.month,
          day: dayParts.day,
          hour: startHour,
          minute: startMinute,
          second: 0,
          millisecond: 0,
        },
        compiled.timeZone,
      );

      let intervalEnd = zonedDateTimeToUtc(
        {
          year: dayParts.year,
          month: dayParts.month,
          day: dayParts.day,
          hour: endHour,
          minute: endMinute,
          second: 0,
          millisecond: 0,
        },
        compiled.timeZone,
      );

      if (rule.fullDay) {
        intervalEnd = shiftZonedDate(intervalStart, compiled.timeZone, { days: 1 });
      } else if (rule.overnight) {
        intervalEnd = shiftZonedDate(intervalEnd, compiled.timeZone, { days: 1 });
      }

      addIntervalBoundaries(
        boundaries,
        intervalStart.getTime(),
        intervalEnd.getTime(),
        rangeStartMs,
        rangeEndMs,
      );
    }
  }
}

export function getCalendarStatusAt(
  calendar: Calendar,
  instant: string | Date,
  options: CalendarResolutionOptions = {},
): CalendarStatus {
  const compiled = compileCalendar(calendar, options);
  const instantMs = typeof instant === 'string' ? parseIsoToMillis(instant, 'instant') : instant.getTime();

  return evaluateAtMillis(compiled, instantMs);
}

export function resolveCalendarAvailability(
  calendar: Calendar,
  range: TimeRange,
  options: CalendarResolutionOptions = {},
): CalendarAvailabilitySlice[] {
  const { startMs, endMs } = parseRangeToMillis(range);

  if (startMs === endMs) {
    return [];
  }

  const compiled = compileCalendar(calendar, options);
  const boundaries = new Set<number>([startMs, endMs]);

  for (const exception of compiled.exceptions) {
    addIntervalBoundaries(boundaries, exception.startMs, exception.endMs, startMs, endMs);
  }

  for (const window of compiled.blackoutWindows) {
    addIntervalBoundaries(boundaries, window.startMs, window.endMs, startMs, endMs);
  }

  collectRuleBoundaries(compiled, boundaries, startMs, endMs);

  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  const slices: CalendarAvailabilitySlice[] = [];

  for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
    const sliceStartMs = sortedBoundaries[index];
    const sliceEndMs = sortedBoundaries[index + 1];

    if (sliceStartMs >= sliceEndMs) {
      continue;
    }

    const midpoint = sliceStartMs + (sliceEndMs - sliceStartMs) / 2;
    const status = evaluateAtMillis(compiled, midpoint);
    const previous = slices[slices.length - 1];

    if (
      previous &&
      previous.status === status.status &&
      previous.reason === status.reason &&
      previous.sourceId === status.sourceId
    ) {
      previous.end = new Date(sliceEndMs).toISOString();
      continue;
    }

    slices.push({
      start: new Date(sliceStartMs).toISOString(),
      end: new Date(sliceEndMs).toISOString(),
      status: status.status,
      reason: status.reason,
      sourceId: status.sourceId,
    });
  }

  return slices;
}
