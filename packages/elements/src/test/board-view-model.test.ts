import { expect } from '@open-wc/testing';
import type { Plan } from '@florasync/harmonogram-core';
import { buildBoardViewModel } from '../board-view-model.js';

function createOrganizingPlan(): Plan {
  return {
    id: 'plan-organize',
    name: 'Organizing Plan',
    timeZone: 'UTC',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-05T00:00:00.000Z',
    },
    lanes: [
      {
        id: 'lane-a',
        label: 'Field A',
        kind: 'field',
        collapsed: false,
      },
      {
        id: 'lane-a1',
        label: 'Field A / North',
        parentId: 'lane-a',
        kind: 'field-block',
        collapsed: false,
      },
      {
        id: 'lane-a2',
        label: 'Field A / South',
        parentId: 'lane-a',
        kind: 'field-block',
        collapsed: false,
      },
      {
        id: 'lane-b',
        label: 'Field B',
        kind: 'field',
        collapsed: false,
      },
    ],
    items: [
      {
        id: 'item-plant',
        laneId: 'lane-a1',
        label: 'Planting pass',
        kind: 'task',
        segments: [
          {
            id: 'seg-plant',
            workItemId: 'item-plant',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-03-01T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [{ resourceId: 'res-tractor' }],
        metadata: {
          phase: 'Planting',
        },
      },
      {
        id: 'item-irrigate',
        laneId: 'lane-a2',
        label: 'Irrigation setup',
        kind: 'task',
        segments: [
          {
            id: 'seg-irrigate',
            workItemId: 'item-irrigate',
            start: '2026-03-02T00:00:00.000Z',
            end: '2026-03-02T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [{ resourceId: 'res-irrigation' }],
        metadata: {
          phase: 'Irrigation',
        },
      },
      {
        id: 'item-scout',
        laneId: 'lane-b',
        label: 'Scout pass',
        kind: 'task',
        segments: [
          {
            id: 'seg-scout',
            workItemId: 'item-scout',
            start: '2026-03-03T00:00:00.000Z',
            end: '2026-03-03T12:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
        metadata: {
          phase: 'Scouting',
        },
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        fromId: 'item-plant',
        toId: 'item-irrigate',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
    ],
    resources: [
      {
        id: 'res-tractor',
        label: 'Tractor Crew',
        kind: 'crew',
        capacity: 1,
      },
      {
        id: 'res-irrigation',
        label: 'Irrigation Crew',
        kind: 'crew',
        capacity: 1,
      },
    ],
    calendars: [],
    markers: [],
  };
}

function createLargePlan(laneCount: number, itemsPerLane: number): Plan {
  const lanes = Array.from({ length: laneCount }, (_, laneIndex) => ({
    id: `lane-${laneIndex + 1}`,
    label: `Lane ${laneIndex + 1}`,
    kind: 'field',
    collapsed: false,
  }));

  const items = lanes.flatMap((lane, laneIndex) =>
    Array.from({ length: itemsPerLane }, (_, itemIndex) => {
      const absoluteIndex = laneIndex * itemsPerLane + itemIndex;
      const startDate = new Date(Date.UTC(2026, 2, 1, 0, 0, 0, 0));
      startDate.setUTCHours(startDate.getUTCHours() + absoluteIndex);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      return {
        id: `item-${laneIndex + 1}-${itemIndex + 1}`,
        laneId: lane.id,
        label: `Work ${absoluteIndex + 1}`,
        kind: 'task' as const,
        segments: [
          {
            id: `seg-${laneIndex + 1}-${itemIndex + 1}`,
            workItemId: `item-${laneIndex + 1}-${itemIndex + 1}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            segmentKind: 'planned' as const,
            locked: false,
          },
        ],
        resourceAssignments: [],
      };
    }),
  );

  return {
    id: 'plan-large',
    name: 'Large Plan',
    timeZone: 'UTC',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-10T00:00:00.000Z',
    },
    lanes,
    items,
    dependencies: [],
    resources: [],
    calendars: [],
    markers: [],
  };
}

function createDependencyOrderingPlan(): Plan {
  return {
    id: 'plan-dependency-order',
    name: 'Dependency Ordering Plan',
    timeZone: 'UTC',
    range: {
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-06T00:00:00.000Z',
    },
    lanes: [
      {
        id: 'lane-1',
        label: 'Lane 1',
        kind: 'field',
        collapsed: false,
      },
      {
        id: 'lane-2',
        label: 'Lane 2',
        kind: 'field',
        collapsed: false,
      },
    ],
    items: [
      {
        id: 'item-1',
        laneId: 'lane-1',
        label: 'Item 1',
        kind: 'task',
        segments: [
          {
            id: 'seg-1',
            workItemId: 'item-1',
            start: '2026-03-01T00:00:00.000Z',
            end: '2026-03-01T06:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
      {
        id: 'item-2',
        laneId: 'lane-1',
        label: 'Item 2',
        kind: 'task',
        segments: [
          {
            id: 'seg-2',
            workItemId: 'item-2',
            start: '2026-03-02T00:00:00.000Z',
            end: '2026-03-02T06:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
      {
        id: 'item-3',
        laneId: 'lane-2',
        label: 'Item 3',
        kind: 'task',
        segments: [
          {
            id: 'seg-3',
            workItemId: 'item-3',
            start: '2026-03-03T00:00:00.000Z',
            end: '2026-03-03T06:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
      {
        id: 'item-4',
        laneId: 'lane-2',
        label: 'Item 4',
        kind: 'task',
        segments: [
          {
            id: 'seg-4',
            workItemId: 'item-4',
            start: '2026-03-04T00:00:00.000Z',
            end: '2026-03-04T06:00:00.000Z',
            segmentKind: 'planned',
            locked: false,
          },
        ],
        resourceAssignments: [],
      },
    ],
    dependencies: [
      {
        id: 'dep-z',
        fromId: 'item-1',
        toId: 'item-3',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
      {
        id: 'dep-a',
        fromId: 'item-2',
        toId: 'item-4',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
      {
        id: 'dep-b',
        fromId: 'item-2',
        toId: 'item-3',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
      {
        id: 'dep-c',
        fromId: 'item-2',
        toId: 'item-4',
        relationship: 'FS',
        lag: 0,
        hard: true,
      },
    ],
    resources: [],
    calendars: [],
    markers: [],
  };
}

describe('board-view-model organizing modes', () => {
  it('reorganizes lanes by hierarchy and supports collapse state', () => {
    const plan = createOrganizingPlan();

    const hierarchyView = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: {
        groupBy: 'hierarchy',
      },
      interactive: false,
      readonly: false,
    });

    expect(hierarchyView.groupBy).to.equal('hierarchy');
    expect(hierarchyView.lanes.map((lane) => lane.id)).to.deep.equal(['lane-a', 'lane-a1', 'lane-a2', 'lane-b']);
    expect(hierarchyView.lanes.map((lane) => lane.depth)).to.deep.equal([0, 1, 1, 0]);

    const collapsedHierarchy = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: {
        groupBy: 'hierarchy',
        collapsedLaneIds: ['lane-a'],
      },
      interactive: false,
      readonly: false,
    });

    expect(collapsedHierarchy.lanes.map((lane) => lane.id)).to.deep.equal(['lane-a', 'lane-b']);
    expect(collapsedHierarchy.lanes[0].collapsed).to.equal(true);
  });

  it('reorganizes visible items by resource', () => {
    const plan = createOrganizingPlan();

    const resourceView = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: {
        groupBy: 'resource',
      },
      interactive: false,
      readonly: false,
    });

    expect(resourceView.groupBy).to.equal('resource');
    expect(resourceView.lanes.map((lane) => lane.label)).to.deep.equal([
      'Irrigation Crew',
      'Tractor Crew',
      'Unassigned resource',
    ]);
    expect(resourceView.lanes.find((lane) => lane.id === 'resource:res-tractor')?.items.map((item) => item.id)).to.deep.equal([
      'item-plant',
    ]);
  });

  it('reorganizes and filters visible items by phase', () => {
    const plan = createOrganizingPlan();

    const phaseView = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: {
        groupBy: 'phase',
        phases: ['planting'],
      },
      interactive: false,
      readonly: false,
    });

    expect(phaseView.groupBy).to.equal('phase');
    expect(phaseView.lanes).to.have.length(1);
    expect(phaseView.lanes[0].label).to.equal('Planting');
    expect(phaseView.visibleItems.map((item) => item.id)).to.deep.equal(['item-plant']);
  });
});

describe('board-view-model rendering discipline', () => {
  it('limits rendered items while preserving full visible counts for large plans', () => {
    const plan = createLargePlan(20, 120);
    const startedAt = performance.now();

    const viewModel = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: null,
      interactive: false,
      readonly: false,
    });

    const elapsedMs = performance.now() - startedAt;
    const renderedItemCount = viewModel.lanes.reduce((total, lane) => total + lane.items.length, 0);

    expect(viewModel.visibleItemCount).to.equal(2400);
    expect(renderedItemCount).to.be.lessThanOrEqual(400);
    expect(viewModel.lanes.every((lane) => lane.items.length <= 80)).to.equal(true);
    expect(viewModel.lanes.some((lane) => lane.hiddenItemCount > 0)).to.equal(true);
    expect(elapsedMs).to.be.lessThan(2000);
  });
});

describe('board-view-model dependency ordering', () => {
  it('orders dependency overlay paths by required and actual execution boundaries before id', () => {
    const plan = createDependencyOrderingPlan();

    const viewModel = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: null,
      filters: null,
      interactive: false,
      readonly: false,
    });

    expect(viewModel.dependencyOverlay.paths.map((path) => path.id)).to.deep.equal(['dep-z', 'dep-b', 'dep-a', 'dep-c']);
  });

  it('keeps dependency inspection id-driven when selected ids are not in display order', () => {
    const plan = createDependencyOrderingPlan();

    const viewModel = buildBoardViewModel({
      plan,
      view: { scale: 'day' },
      selection: {
        itemIds: [],
        dependencyIds: ['dep-z', 'dep-a'],
      },
      filters: null,
      interactive: false,
      readonly: false,
    });

    expect(viewModel.dependencyOverlay.paths.map((path) => path.id)).to.deep.equal(['dep-z', 'dep-b', 'dep-a', 'dep-c']);
    expect(viewModel.dependencyOverlay.inspection?.id).to.equal('dep-a');
    expect(viewModel.dependencyOverlay.inspection?.fromLabel).to.equal('Item 2');
    expect(viewModel.dependencyOverlay.inspection?.toLabel).to.equal('Item 4');
    expect(viewModel.dependencyOverlay.paths.find((path) => path.id === 'dep-a')?.selected).to.equal(true);
    expect(viewModel.dependencyOverlay.paths.find((path) => path.id === 'dep-z')?.selected).to.equal(true);
  });
});
