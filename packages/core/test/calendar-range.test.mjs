import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignRangeToScale,
  getCalendarStatusAt,
  resolveCalendarAvailability,
  splitRangeByScale,
} from '../dist/index.js';

test('splitRangeByScale supports hour/day/week/month/quarter/season', () => {
  const hourSlices = splitRangeByScale(
    {
      start: '2026-03-05T10:15:00.000Z',
      end: '2026-03-05T12:45:00.000Z',
    },
    'hour',
    'UTC',
  );
  assert.equal(hourSlices.length, 3);
  assert.deepEqual(
    hourSlices.map((slice) => `${slice.start} -> ${slice.end}`),
    [
      '2026-03-05T10:15:00.000Z -> 2026-03-05T11:00:00.000Z',
      '2026-03-05T11:00:00.000Z -> 2026-03-05T12:00:00.000Z',
      '2026-03-05T12:00:00.000Z -> 2026-03-05T12:45:00.000Z',
    ],
  );

  const daySlices = splitRangeByScale(
    {
      start: '2026-03-05T10:15:00.000Z',
      end: '2026-03-07T03:00:00.000Z',
    },
    'day',
    'UTC',
  );
  assert.equal(daySlices.length, 3);
  assert.equal(daySlices[0].start, '2026-03-05T10:15:00.000Z');
  assert.equal(daySlices[2].end, '2026-03-07T03:00:00.000Z');

  const weekSlices = splitRangeByScale(
    {
      start: '2026-03-04T00:00:00.000Z',
      end: '2026-03-12T00:00:00.000Z',
    },
    'week',
    'UTC',
    { weekStartsOn: 1 },
  );
  assert.equal(weekSlices.length, 2);
  assert.deepEqual(
    weekSlices.map((slice) => `${slice.start} -> ${slice.end}`),
    [
      '2026-03-04T00:00:00.000Z -> 2026-03-09T00:00:00.000Z',
      '2026-03-09T00:00:00.000Z -> 2026-03-12T00:00:00.000Z',
    ],
  );

  const monthSlices = splitRangeByScale(
    {
      start: '2026-02-15T00:00:00.000Z',
      end: '2026-04-03T00:00:00.000Z',
    },
    'month',
    'UTC',
  );
  assert.equal(monthSlices.length, 3);

  const quarterSlices = splitRangeByScale(
    {
      start: '2026-02-15T00:00:00.000Z',
      end: '2026-08-05T00:00:00.000Z',
    },
    'quarter',
    'UTC',
  );
  assert.equal(quarterSlices.length, 3);

  const seasonSlices = splitRangeByScale(
    {
      start: '2026-02-15T00:00:00.000Z',
      end: '2026-07-05T00:00:00.000Z',
    },
    'season',
    'UTC',
    {
      seasonStartMonth: 2,
      seasonLengthMonths: 3,
    },
  );
  assert.equal(seasonSlices.length, 3);
});

test('alignRangeToScale is deterministic across DST day boundaries', () => {
  const aligned = alignRangeToScale(
    {
      start: '2026-03-08T08:30:00.000Z',
      end: '2026-03-09T08:30:00.000Z',
    },
    'day',
    'America/Denver',
  );

  assert.deepEqual(aligned, {
    start: '2026-03-08T07:00:00.000Z',
    end: '2026-03-10T06:00:00.000Z',
  });
});

test('calendar availability prioritizes blackout windows over exceptions and rules', () => {
  const calendar = {
    id: 'calendar-1',
    label: 'Ops Calendar',
    timeZone: 'UTC',
    workingRules: [
      {
        id: 'rule-main',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startTime: '08:00',
        endTime: '18:00',
      },
    ],
    exceptions: [
      {
        id: 'exception-maintenance',
        start: '2026-03-05T10:00:00.000Z',
        end: '2026-03-05T11:00:00.000Z',
        kind: 'non-working',
      },
      {
        id: 'exception-early-shift',
        start: '2026-03-05T06:00:00.000Z',
        end: '2026-03-05T08:30:00.000Z',
        kind: 'working',
      },
    ],
    windows: [
      {
        id: 'window-blackout',
        start: '2026-03-05T09:30:00.000Z',
        end: '2026-03-05T10:30:00.000Z',
        kind: 'blackout-window',
      },
    ],
    metadata: {},
  };

  assert.deepEqual(getCalendarStatusAt(calendar, '2026-03-05T07:00:00.000Z'), {
    status: 'working',
    reason: 'exception',
    sourceId: 'exception-early-shift',
  });

  assert.deepEqual(getCalendarStatusAt(calendar, '2026-03-05T09:45:00.000Z'), {
    status: 'blackout',
    reason: 'window',
    sourceId: 'window-blackout',
  });

  assert.deepEqual(getCalendarStatusAt(calendar, '2026-03-05T10:45:00.000Z'), {
    status: 'non-working',
    reason: 'exception',
    sourceId: 'exception-maintenance',
  });

  assert.deepEqual(getCalendarStatusAt(calendar, '2026-03-05T12:00:00.000Z'), {
    status: 'working',
    reason: 'rule',
  });

  const slices = resolveCalendarAvailability(
    calendar,
    {
      start: '2026-03-05T06:00:00.000Z',
      end: '2026-03-05T12:00:00.000Z',
    },
  );

  assert.deepEqual(
    slices.map((slice) => `${slice.start} -> ${slice.end} (${slice.status}/${slice.reason})`),
    [
      '2026-03-05T06:00:00.000Z -> 2026-03-05T08:30:00.000Z (working/exception)',
      '2026-03-05T08:30:00.000Z -> 2026-03-05T09:30:00.000Z (working/rule)',
      '2026-03-05T09:30:00.000Z -> 2026-03-05T10:30:00.000Z (blackout/window)',
      '2026-03-05T10:30:00.000Z -> 2026-03-05T11:00:00.000Z (non-working/exception)',
      '2026-03-05T11:00:00.000Z -> 2026-03-05T12:00:00.000Z (working/rule)',
    ],
  );
});

test('calendar timezone evaluation handles DST transition deterministically', () => {
  const dstCalendar = {
    id: 'calendar-dst',
    label: 'DST Calendar',
    timeZone: 'America/Denver',
    workingRules: [
      {
        id: 'rule-sunday-window',
        daysOfWeek: [0],
        startTime: '01:00',
        endTime: '04:00',
      },
    ],
    exceptions: [],
    windows: [],
    metadata: {},
  };

  assert.equal(getCalendarStatusAt(dstCalendar, '2026-03-08T08:30:00.000Z').status, 'working');
  assert.equal(getCalendarStatusAt(dstCalendar, '2026-03-08T09:30:00.000Z').status, 'working');
  assert.equal(getCalendarStatusAt(dstCalendar, '2026-03-08T10:30:00.000Z').status, 'non-working');
});
