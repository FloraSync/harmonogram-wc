import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, validatePlan, ValidationError } from '../dist/index.js';

function createValidPlan() {
  return {
    id: 'plan-1',
    name: 'Spring Launch',
    timeZone: 'America/Denver',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-31T23:59:59.000Z',
    },
    lanes: [
      {
        id: 'lane-field-1',
        label: 'Field 1',
        kind: 'field',
        collapsed: false,
        metadata: {
          fieldId: 'field-1',
        },
      },
    ],
    items: [
      {
        id: 'item-planting',
        laneId: 'lane-field-1',
        label: 'Planting',
        kind: 'task',
        status: 'planned',
        priority: 1,
        progress: 10,
        segments: [
          {
            id: 'segment-1',
            workItemId: 'item-planting',
            start: '2026-03-03T08:00:00.000Z',
            end: '2026-03-03T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        baseline: {
          start: '2026-03-03T08:00:00.000Z',
          end: '2026-03-03T12:00:00.000Z',
        },
        actual: {
          start: '2026-03-03T08:15:00.000Z',
          end: '2026-03-03T12:05:00.000Z',
        },
        projection: {
          start: '2026-03-03T08:10:00.000Z',
          end: '2026-03-03T12:20:00.000Z',
        },
        resourceAssignments: [
          {
            resourceId: 'crew-1',
            units: 1,
            role: 'operator',
          },
        ],
        metadata: {
          operationType: 'planting',
        },
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        fromId: 'item-planting',
        toId: 'item-scouting',
        relationship: 'FS',
        lag: 15,
        hard: true,
      },
    ],
    resources: [
      {
        id: 'crew-1',
        label: 'Crew A',
        kind: 'crew',
        capacity: 1,
        calendarId: 'calendar-default',
      },
    ],
    calendars: [
      {
        id: 'calendar-default',
        label: 'Default Calendar',
        timeZone: 'America/Denver',
        workingRules: [
          {
            id: 'rule-weekday',
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '08:00',
            endTime: '17:00',
          },
        ],
        exceptions: [
          {
            id: 'exception-1',
            start: '2026-03-20T00:00:00.000Z',
            end: '2026-03-20T23:59:59.000Z',
            kind: 'non-working',
            label: 'Weather Hold',
          },
        ],
        windows: [
          {
            id: 'window-1',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-04-01T00:00:00.000Z',
            kind: 'season',
            label: 'Spring Window',
          },
        ],
      },
    ],
    markers: [
      {
        id: 'marker-1',
        label: 'Cold Front Risk',
        range: {
          start: '2026-03-18T00:00:00.000Z',
          end: '2026-03-21T00:00:00.000Z',
        },
        severity: 'medium',
        kind: 'weather-risk',
      },
    ],
    metadata: {
      farmGroupId: 'farm-group-1',
    },
  };
}

test('parsePlan returns typed plan for a valid payload', () => {
  const parsed = parsePlan(createValidPlan());

  assert.equal(parsed.id, 'plan-1');
  assert.equal(parsed.items[0].kind, 'task');
  assert.equal(parsed.dependencies[0].relationship, 'FS');
  assert.equal(parsed.calendars[0].workingRules[0].daysOfWeek.length, 5);
  assert.equal(parsed.markers[0].severity, 'medium');
});

test('validatePlan reports actionable paths for invalid payloads', () => {
  const invalidPlan = createValidPlan();
  invalidPlan.range.start = '2026-04-01T00:00:00.000Z';
  invalidPlan.range.end = '2026-03-01T00:00:00.000Z';
  invalidPlan.items[0].segments[0].start = 'not-a-date';
  invalidPlan.dependencies[0].relationship = 'INVALID';
  delete invalidPlan.lanes[0].id;

  const result = validatePlan(invalidPlan);

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === 'plan.range'));
  assert.ok(result.issues.some((issue) => issue.path === 'plan.items[0].segments[0].start'));
  assert.ok(result.issues.some((issue) => issue.path === 'plan.dependencies[0].relationship'));
  assert.ok(result.issues.some((issue) => issue.path === 'plan.lanes[0].id'));
});

test('parsePlan throws ValidationError with issue details', () => {
  const invalidPlan = {
    id: 'plan-1',
    name: 'Bad Plan',
    timeZone: 'America/Denver',
    range: {
      start: 'bad-date',
      end: '2026-03-01T00:00:00.000Z',
    },
    lanes: [],
    items: [],
    dependencies: [],
    resources: [],
    calendars: [],
    markers: [],
  };

  assert.throws(
    () => parsePlan(invalidPlan),
    (error) =>
      error instanceof ValidationError &&
      error.issues.some((issue) => issue.path === 'plan.range.start') &&
      error.message.includes('plan.range.start'),
  );
});
