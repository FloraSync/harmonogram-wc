import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveHarmonyInsights, evaluateDependencyResolution } from '../dist/index.js';

function createItem({
  id,
  laneId,
  start,
  end,
  baseline,
  projection,
  assignments = [],
}) {
  return {
    id,
    laneId,
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
    baseline,
    projection,
    resourceAssignments: assignments,
  };
}

function createDependency(id, fromId, toId, relationship = 'FS', lag = 0, hard = true) {
  return {
    id,
    fromId,
    toId,
    relationship,
    lag,
    hard,
  };
}

function createPlan({ rangeStart, rangeEnd, items, dependencies = [], resources = [] }) {
  return {
    range: {
      start: rangeStart,
      end: rangeEnd,
    },
    items,
    dependencies,
    resources,
  };
}

function findInsights(result, kind) {
  return result.insights.filter((insight) => insight.kind === kind);
}

test('deriveHarmonyInsights derives overlap and gap insights per lane deterministically', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T16:00:00.000Z',
    items: [
      createItem({
        id: 'item-a',
        laneId: 'lane-1',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T10:00:00.000Z',
      }),
      createItem({
        id: 'item-b',
        laneId: 'lane-1',
        start: '2026-03-10T09:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
      }),
      createItem({
        id: 'item-c',
        laneId: 'lane-1',
        start: '2026-03-10T13:00:00.000Z',
        end: '2026-03-10T14:00:00.000Z',
      }),
    ],
  });
  const result = deriveHarmonyInsights(plan);
  const overlapInsights = findInsights(result, 'overlap');
  const gapInsights = findInsights(result, 'gap');

  assert.equal(overlapInsights.length, 1);
  assert.equal(gapInsights.length, 1);
  assert.deepEqual(overlapInsights[0].subjectIds, ['item-a', 'item-b']);
  assert.deepEqual(gapInsights[0].subjectIds, ['item-b', 'item-c']);
  assert.equal(overlapInsights[0].metadata.overlapMs, 60 * 60 * 1000);
  assert.equal(gapInsights[0].metadata.gapMs, 2 * 60 * 60 * 1000);
});

test('deriveHarmonyInsights maps blocked states from dependency resolution', () => {
  const itemA = createItem({
    id: 'item-a',
    laneId: 'lane-1',
    start: '2026-03-10T08:00:00.000Z',
    end: '2026-03-10T10:00:00.000Z',
  });
  const itemB = createItem({
    id: 'item-b',
    laneId: 'lane-1',
    start: '2026-03-10T09:00:00.000Z',
    end: '2026-03-10T11:00:00.000Z',
  });
  const itemC = createItem({
    id: 'item-c',
    laneId: 'lane-1',
    start: '2026-03-10T12:00:00.000Z',
    end: '2026-03-10T13:00:00.000Z',
  });
  const dependencies = [
    createDependency('dep-a-b', itemA.id, itemB.id),
    createDependency('dep-b-c', itemB.id, itemC.id),
  ];
  const resolution = evaluateDependencyResolution({
    items: [itemA, itemB, itemC],
    dependencies,
  });
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T14:00:00.000Z',
    items: [itemA, itemB, itemC],
    dependencies,
  });
  const result = deriveHarmonyInsights(plan, { dependencyResolution: resolution });
  const blockedInsights = findInsights(result, 'blocked');

  assert.equal(blockedInsights.length, 2);
  assert.deepEqual(
    blockedInsights.map((insight) => insight.subjectIds[0]),
    ['item-b', 'item-c'],
  );
  assert.equal(blockedInsights[0].metadata.reasons.length, 1);
  assert.equal(blockedInsights[1].metadata.reasons.length, 1);
});

test('deriveHarmonyInsights derives drift from baseline and projection snapshots', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T20:00:00.000Z',
    items: [
      createItem({
        id: 'item-drift',
        laneId: 'lane-1',
        start: '2026-03-10T10:00:00.000Z',
        end: '2026-03-10T12:00:00.000Z',
        baseline: {
          start: '2026-03-10T08:00:00.000Z',
          end: '2026-03-10T10:00:00.000Z',
        },
        projection: {
          start: '2026-03-10T11:00:00.000Z',
          end: '2026-03-10T13:00:00.000Z',
        },
      }),
    ],
  });
  const result = deriveHarmonyInsights(plan);
  const driftInsights = findInsights(result, 'drift');

  assert.equal(driftInsights.length, 1);
  assert.equal(driftInsights[0].subjectIds[0], 'item-drift');
  assert.equal(driftInsights[0].metadata.baselineDeltaMs, 2 * 60 * 60 * 1000);
  assert.equal(driftInsights[0].metadata.projectionDeltaMs, 1 * 60 * 60 * 1000);
});

test('deriveHarmonyInsights uses default assignment units for capacity conflicts', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T14:00:00.000Z',
    items: [
      createItem({
        id: 'item-1',
        laneId: 'lane-1',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T10:00:00.000Z',
        assignments: [{ resourceId: 'resource-1', units: 1 }],
      }),
      createItem({
        id: 'item-2',
        laneId: 'lane-1',
        start: '2026-03-10T09:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
        assignments: [{ resourceId: 'resource-1' }],
      }),
      createItem({
        id: 'item-3',
        laneId: 'lane-2',
        start: '2026-03-10T09:30:00.000Z',
        end: '2026-03-10T10:30:00.000Z',
        assignments: [{ resourceId: 'resource-1', units: 1 }],
      }),
    ],
    resources: [
      {
        id: 'resource-1',
        label: 'Resource 1',
        kind: 'crew',
        capacity: 2,
      },
    ],
  });
  const result = deriveHarmonyInsights(plan);
  const capacityInsights = findInsights(result, 'capacity-conflict');

  assert.equal(capacityInsights.length, 1);
  assert.equal(capacityInsights[0].metadata.overloadUnits, 1);
  assert.equal(capacityInsights[0].metadata.loadUnits, 3);
  assert.equal(capacityInsights[0].metadata.capacity, 2);
});

test('deriveHarmonyInsights finds deterministic longest critical sequence in DAG', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T16:00:00.000Z',
    items: [
      createItem({
        id: 'item-a',
        laneId: 'lane-1',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T10:00:00.000Z',
      }),
      createItem({
        id: 'item-b',
        laneId: 'lane-1',
        start: '2026-03-10T10:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
      }),
      createItem({
        id: 'item-c',
        laneId: 'lane-1',
        start: '2026-03-10T11:00:00.000Z',
        end: '2026-03-10T12:00:00.000Z',
      }),
      createItem({
        id: 'item-d',
        laneId: 'lane-2',
        start: '2026-03-10T10:00:00.000Z',
        end: '2026-03-10T13:00:00.000Z',
      }),
    ],
    dependencies: [
      createDependency('dep-a-b', 'item-a', 'item-b'),
      createDependency('dep-b-c', 'item-b', 'item-c'),
      createDependency('dep-a-d', 'item-a', 'item-d'),
    ],
  });
  const result = deriveHarmonyInsights(plan);
  const criticalInsights = findInsights(result, 'critical');

  assert.deepEqual(result.criticalSequence.itemIds, ['item-a', 'item-d']);
  assert.equal(criticalInsights.length, 1);
  assert.deepEqual(criticalInsights[0].metadata.orderedItemIds, ['item-a', 'item-d']);
});

test('deriveHarmonyInsights keeps cycle handling stable in critical sequence output', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T16:00:00.000Z',
    items: [
      createItem({
        id: 'item-x',
        laneId: 'lane-1',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T09:00:00.000Z',
      }),
      createItem({
        id: 'item-y',
        laneId: 'lane-1',
        start: '2026-03-10T09:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
      }),
      createItem({
        id: 'item-z',
        laneId: 'lane-1',
        start: '2026-03-10T11:00:00.000Z',
        end: '2026-03-10T12:00:00.000Z',
      }),
    ],
    dependencies: [
      createDependency('dep-x-y', 'item-x', 'item-y'),
      createDependency('dep-y-x', 'item-y', 'item-x'),
      createDependency('dep-y-z', 'item-y', 'item-z'),
    ],
  });
  const first = deriveHarmonyInsights(plan);
  const second = deriveHarmonyInsights(plan);

  assert.deepEqual(first.criticalSequence, second.criticalSequence);
  assert.deepEqual(first.criticalSequence.itemIds, ['item-x', 'item-y', 'item-z']);
  assert.equal(first.criticalSequence.hasCycle, true);
});

test('deriveHarmonyInsights produces parity for injected vs computed dependency resolution', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T14:00:00.000Z',
    items: [
      createItem({
        id: 'item-a',
        laneId: 'lane-1',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T10:00:00.000Z',
      }),
      createItem({
        id: 'item-b',
        laneId: 'lane-1',
        start: '2026-03-10T09:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
      }),
      createItem({
        id: 'item-c',
        laneId: 'lane-1',
        start: '2026-03-10T11:00:00.000Z',
        end: '2026-03-10T13:00:00.000Z',
      }),
    ],
    dependencies: [
      createDependency('dep-a-b', 'item-a', 'item-b'),
      createDependency('dep-b-c', 'item-b', 'item-c'),
    ],
  });
  const dependencyResolution = evaluateDependencyResolution({
    items: plan.items,
    dependencies: plan.dependencies,
  });
  const withInjected = deriveHarmonyInsights(plan, { dependencyResolution });
  const computed = deriveHarmonyInsights(plan);

  assert.deepEqual(withInjected.insights, computed.insights);
  assert.deepEqual(withInjected.criticalSequence, computed.criticalSequence);
  assert.deepEqual(withInjected.issues, computed.issues);
});

test('deriveHarmonyInsights output is deterministic across repeated runs', () => {
  const plan = createPlan({
    rangeStart: '2026-03-10T08:00:00.000Z',
    rangeEnd: '2026-03-10T16:00:00.000Z',
    items: [
      createItem({
        id: 'item-1',
        laneId: 'lane-a',
        start: '2026-03-10T08:00:00.000Z',
        end: '2026-03-10T11:00:00.000Z',
        assignments: [{ resourceId: 'resource-1', units: 1 }],
      }),
      createItem({
        id: 'item-2',
        laneId: 'lane-a',
        start: '2026-03-10T10:00:00.000Z',
        end: '2026-03-10T12:00:00.000Z',
        assignments: [{ resourceId: 'resource-1' }],
      }),
      createItem({
        id: 'item-3',
        laneId: 'lane-b',
        start: '2026-03-10T12:00:00.000Z',
        end: '2026-03-10T15:00:00.000Z',
        baseline: {
          start: '2026-03-10T11:00:00.000Z',
          end: '2026-03-10T14:00:00.000Z',
        },
      }),
    ],
    dependencies: [
      createDependency('dep-1-2', 'item-1', 'item-2'),
      createDependency('dep-2-3', 'item-2', 'item-3'),
    ],
    resources: [
      {
        id: 'resource-1',
        label: 'Resource 1',
        kind: 'crew',
        capacity: 1,
      },
    ],
  });
  const first = deriveHarmonyInsights(plan);
  const second = deriveHarmonyInsights(plan);

  assert.deepEqual(first, second);
});
