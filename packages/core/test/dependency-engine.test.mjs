import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDependencyResolution } from '../dist/index.js';

function createWorkItem(id, start, end) {
  return {
    id,
    laneId: 'lane-1',
    label: id,
    kind: 'task',
    segments: [
      {
        id: `${id}-segment`,
        workItemId: id,
        start,
        end,
        segmentKind: 'planned',
        locked: false,
      },
    ],
    resourceAssignments: [],
  };
}

function createDependency(id, fromId, toId, relationship, lag = 0, hard = true) {
  return {
    id,
    fromId,
    toId,
    relationship,
    lag,
    hard,
  };
}

test('evaluateDependencyResolution evaluates relationship boundaries and lag deterministically', () => {
  const from = createWorkItem('item-from', '2026-03-10T08:00:00.000Z', '2026-03-10T10:00:00.000Z');
  const to = createWorkItem('item-to', '2026-03-10T09:00:00.000Z', '2026-03-10T11:00:00.000Z');
  const relations = [
    {
      dependency: createDependency('dep-fs', from.id, to.id, 'FS', 0, true),
      expectedRequired: '2026-03-10T10:00:00.000Z',
      expectedActual: '2026-03-10T09:00:00.000Z',
      expectedSatisfied: false,
      expectedViolationMs: 60 * 60 * 1000,
    },
    {
      dependency: createDependency('dep-ss', from.id, to.id, 'SS', 30 * 60 * 1000, true),
      expectedRequired: '2026-03-10T08:30:00.000Z',
      expectedActual: '2026-03-10T09:00:00.000Z',
      expectedSatisfied: true,
      expectedViolationMs: 0,
    },
    {
      dependency: createDependency('dep-ff', from.id, to.id, 'FF', 2 * 60 * 60 * 1000, true),
      expectedRequired: '2026-03-10T12:00:00.000Z',
      expectedActual: '2026-03-10T11:00:00.000Z',
      expectedSatisfied: false,
      expectedViolationMs: 60 * 60 * 1000,
    },
    {
      dependency: createDependency('dep-sf', from.id, to.id, 'SF', 0, true),
      expectedRequired: '2026-03-10T08:00:00.000Z',
      expectedActual: '2026-03-10T11:00:00.000Z',
      expectedSatisfied: true,
      expectedViolationMs: 0,
    },
    {
      dependency: createDependency('dep-fs-negative-lag', from.id, to.id, 'FS', -30 * 60 * 1000, true),
      expectedRequired: '2026-03-10T09:30:00.000Z',
      expectedActual: '2026-03-10T09:00:00.000Z',
      expectedSatisfied: false,
      expectedViolationMs: 30 * 60 * 1000,
    },
  ];

  const plan = {
    items: [from, to],
    dependencies: relations.map((entry) => entry.dependency),
  };
  const result = evaluateDependencyResolution(plan);

  assert.equal(result.dependencyResults.length, relations.length);

  for (const entry of relations) {
    const evaluation = result.dependencyResults.find((candidate) => candidate.dependencyId === entry.dependency.id);
    assert.ok(evaluation, `missing evaluation for ${entry.dependency.id}`);
    assert.equal(evaluation.requiredBoundary, entry.expectedRequired);
    assert.equal(evaluation.actualBoundary, entry.expectedActual);
    assert.equal(evaluation.satisfied, entry.expectedSatisfied);
    assert.equal(evaluation.violationMs, entry.expectedViolationMs);
  }
});

test('evaluateDependencyResolution blocks hard violations and propagates chain blockers', () => {
  const itemA = createWorkItem('item-a', '2026-03-10T08:00:00.000Z', '2026-03-10T10:00:00.000Z');
  const itemB = createWorkItem('item-b', '2026-03-10T09:00:00.000Z', '2026-03-10T11:00:00.000Z');
  const itemC = createWorkItem('item-c', '2026-03-10T12:00:00.000Z', '2026-03-10T13:00:00.000Z');
  const plan = {
    items: [itemA, itemB, itemC],
    dependencies: [
      createDependency('dep-a-b', itemA.id, itemB.id, 'FS', 0, true),
      createDependency('dep-b-c', itemB.id, itemC.id, 'FS', 0, true),
    ],
  };
  const result = evaluateDependencyResolution(plan);

  assert.deepEqual(result.blockedItemIds, ['item-b', 'item-c']);
  assert.equal(result.blockedStates['item-b'].blocked, true);
  assert.equal(result.blockedStates['item-c'].blocked, true);
  assert.deepEqual(
    result.blockedStates['item-c'].reasons.map((reason) => reason.type),
    ['upstream-blocked'],
  );
});

test('evaluateDependencyResolution does not block for soft dependency violations', () => {
  const from = createWorkItem('item-from', '2026-03-10T08:00:00.000Z', '2026-03-10T10:00:00.000Z');
  const to = createWorkItem('item-to', '2026-03-10T09:00:00.000Z', '2026-03-10T11:00:00.000Z');
  const plan = {
    items: [from, to],
    dependencies: [createDependency('dep-soft', from.id, to.id, 'FS', 0, false)],
  };
  const result = evaluateDependencyResolution(plan);

  assert.equal(result.dependencyResults[0].satisfied, false);
  assert.deepEqual(result.blockedItemIds, []);
  assert.equal(result.blockedStates['item-to'].blocked, false);
});

test('evaluateDependencyResolution records issues for missing references and keeps deterministic output', () => {
  const from = createWorkItem('item-from', '2026-03-10T08:00:00.000Z', '2026-03-10T10:00:00.000Z');
  const plan = {
    items: [from],
    dependencies: [createDependency('dep-missing-to', from.id, 'item-missing', 'FS', 0, true)],
  };
  const result = evaluateDependencyResolution(plan);

  assert.equal(result.dependencyResults.length, 0);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].code, 'missing-item');
  assert.equal(result.issues[0].dependencyId, 'dep-missing-to');
});
