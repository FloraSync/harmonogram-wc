import type { TimeRange } from '../contracts/model.js';
import {
  getZonedDateTimeParts,
  getZonedDayOfWeek,
  shiftZonedDate,
  startOfZonedDay,
  zonedDateTimeToUtc,
} from './time-zone.js';

export const TIME_SCALES = ['hour', 'day', 'week', 'month', 'quarter', 'season'] as const;
export type TimeScale = (typeof TIME_SCALES)[number];

export interface TimeScaleOptions {
  weekStartsOn?: number;
  quarterStartMonth?: number;
  seasonStartMonth?: number;
  seasonLengthMonths?: number;
}

export interface TimeRangeSlice extends TimeRange {
  scale: TimeScale;
  index: number;
}

const DEFAULT_WEEK_START = 1;
const DEFAULT_QUARTER_START_MONTH = 0;
const DEFAULT_SEASON_START_MONTH = 0;
const DEFAULT_SEASON_LENGTH_MONTHS = 3;

function toDate(value: string, fieldPath: string): Date {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`${fieldPath} must be a valid ISO-8601 date-time string`);
  }

  return new Date(timestamp);
}

function ensureRange(range: TimeRange): { start: Date; end: Date } {
  const start = toDate(range.start, 'range.start');
  const end = toDate(range.end, 'range.end');

  if (start.getTime() > end.getTime()) {
    throw new Error('range.start must be before or equal to range.end');
  }

  return { start, end };
}

function floorDiv(value: number, by: number): number {
  return Math.floor(value / by);
}

function mod(value: number, by: number): number {
  return ((value % by) + by) % by;
}

function normalizeWeekStart(value: number | undefined): number {
  const weekStartsOn = value ?? DEFAULT_WEEK_START;

  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new Error('weekStartsOn must be an integer between 0 and 6');
  }

  return weekStartsOn;
}

function normalizeSeasonStartMonth(value: number | undefined): number {
  const seasonStartMonth = value ?? DEFAULT_SEASON_START_MONTH;

  if (!Number.isInteger(seasonStartMonth) || seasonStartMonth < 0 || seasonStartMonth > 11) {
    throw new Error('seasonStartMonth must be an integer between 0 and 11');
  }

  return seasonStartMonth;
}

function normalizeQuarterStartMonth(value: number | undefined): number {
  const quarterStartMonth = value ?? DEFAULT_QUARTER_START_MONTH;

  if (!Number.isInteger(quarterStartMonth) || quarterStartMonth < 0 || quarterStartMonth > 11) {
    throw new Error('quarterStartMonth must be an integer between 0 and 11');
  }

  return quarterStartMonth;
}

function normalizeSeasonLengthMonths(value: number | undefined): number {
  const seasonLengthMonths = value ?? DEFAULT_SEASON_LENGTH_MONTHS;

  if (!Number.isInteger(seasonLengthMonths) || seasonLengthMonths < 1 || seasonLengthMonths > 12) {
    throw new Error('seasonLengthMonths must be an integer between 1 and 12');
  }

  return seasonLengthMonths;
}

export function alignDateToScale(
  date: Date,
  scale: TimeScale,
  timeZone: string,
  options: TimeScaleOptions = {},
): Date {
  const parts = getZonedDateTimeParts(date, timeZone);

  if (scale === 'hour') {
    return zonedDateTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone,
    );
  }

  if (scale === 'day') {
    return startOfZonedDay(date, timeZone);
  }

  if (scale === 'week') {
    const weekStartsOn = normalizeWeekStart(options.weekStartsOn);
    const dayStart = startOfZonedDay(date, timeZone);
    const dayOfWeek = getZonedDayOfWeek(dayStart, timeZone);
    const dayDelta = mod(dayOfWeek - weekStartsOn, 7);

    return shiftZonedDate(dayStart, timeZone, { days: -dayDelta });
  }

  if (scale === 'month') {
    return zonedDateTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone,
    );
  }

  if (scale === 'quarter') {
    const quarterStartMonth = normalizeQuarterStartMonth(options.quarterStartMonth);
    const absoluteMonth = parts.year * 12 + (parts.month - 1);
    const quarterStartAbsoluteMonth = floorDiv(absoluteMonth - quarterStartMonth, 3) * 3 + quarterStartMonth;
    const quarterYear = floorDiv(quarterStartAbsoluteMonth, 12);
    const quarterMonth = mod(quarterStartAbsoluteMonth, 12) + 1;

    return zonedDateTimeToUtc(
      {
        year: quarterYear,
        month: quarterMonth,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      timeZone,
    );
  }

  const seasonStartMonth = normalizeSeasonStartMonth(options.seasonStartMonth);
  const seasonLengthMonths = normalizeSeasonLengthMonths(options.seasonLengthMonths);
  const absoluteMonth = parts.year * 12 + (parts.month - 1);
  const seasonStartAbsoluteMonth =
    floorDiv(absoluteMonth - seasonStartMonth, seasonLengthMonths) * seasonLengthMonths + seasonStartMonth;
  const seasonYear = floorDiv(seasonStartAbsoluteMonth, 12);
  const seasonMonth = mod(seasonStartAbsoluteMonth, 12) + 1;

  return zonedDateTimeToUtc(
    {
      year: seasonYear,
      month: seasonMonth,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  );
}

export function advanceScaleDate(
  alignedDate: Date,
  scale: TimeScale,
  timeZone: string,
  options: TimeScaleOptions = {},
): Date {
  if (scale === 'hour') {
    return shiftZonedDate(alignedDate, timeZone, { hours: 1 });
  }

  if (scale === 'day') {
    return shiftZonedDate(alignedDate, timeZone, { days: 1 });
  }

  if (scale === 'week') {
    return shiftZonedDate(alignedDate, timeZone, { days: 7 });
  }

  if (scale === 'month') {
    return shiftZonedDate(alignedDate, timeZone, { months: 1 });
  }

  if (scale === 'quarter') {
    return shiftZonedDate(alignedDate, timeZone, { months: 3 });
  }

  const seasonLengthMonths = normalizeSeasonLengthMonths(options.seasonLengthMonths);

  return shiftZonedDate(alignedDate, timeZone, { months: seasonLengthMonths });
}

export function alignRangeToScale(
  range: TimeRange,
  scale: TimeScale,
  timeZone: string,
  options: TimeScaleOptions = {},
): TimeRange {
  const { start, end } = ensureRange(range);
  const alignedStart = alignDateToScale(start, scale, timeZone, options);
  let alignedEnd = alignDateToScale(end, scale, timeZone, options);

  if (alignedEnd.getTime() < end.getTime()) {
    alignedEnd = advanceScaleDate(alignedEnd, scale, timeZone, options);
  }

  return {
    start: alignedStart.toISOString(),
    end: alignedEnd.toISOString(),
  };
}

export function splitRangeByScale(
  range: TimeRange,
  scale: TimeScale,
  timeZone: string,
  options: TimeScaleOptions = {},
): TimeRangeSlice[] {
  const { start, end } = ensureRange(range);

  if (start.getTime() === end.getTime()) {
    return [];
  }

  const slices: TimeRangeSlice[] = [];
  let cursor = alignDateToScale(start, scale, timeZone, options);
  let index = 0;

  while (cursor.getTime() < end.getTime()) {
    const next = advanceScaleDate(cursor, scale, timeZone, options);
    const sliceStart = Math.max(cursor.getTime(), start.getTime());
    const sliceEnd = Math.min(next.getTime(), end.getTime());

    if (sliceStart < sliceEnd) {
      slices.push({
        scale,
        index,
        start: new Date(sliceStart).toISOString(),
        end: new Date(sliceEnd).toISOString(),
      });
      index += 1;
    }

    cursor = next;
  }

  return slices;
}
