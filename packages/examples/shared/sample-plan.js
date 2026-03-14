export const samplePlan = {
  id: 'plan-demo-1',
  name: 'Harmonogram Demo Plan',
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
      id: 'lane-b',
      label: 'Field B',
      kind: 'field',
      collapsed: false,
    },
  ],
  items: [
    {
      id: 'item-plant',
      laneId: 'lane-a',
      label: 'Planting',
      kind: 'task',
      segments: [
        {
          id: 'seg-plant',
          workItemId: 'item-plant',
          start: '2026-03-01T00:00:00.000Z',
          end: '2026-03-01T16:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
      ],
      resourceAssignments: [
        {
          resourceId: 'res-crew-a',
          units: 1,
        },
      ],
      metadata: {
        phase: 'Planting',
      },
    },
    {
      id: 'item-irrigate',
      laneId: 'lane-b',
      label: 'Irrigation setup',
      kind: 'task',
      segments: [
        {
          id: 'seg-irrigate',
          workItemId: 'item-irrigate',
          start: '2026-03-02T00:00:00.000Z',
          end: '2026-03-02T10:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
      ],
      resourceAssignments: [
        {
          resourceId: 'res-crew-b',
          units: 1,
        },
      ],
      metadata: {
        phase: 'Irrigation',
      },
    },
    {
      id: 'item-scout',
      laneId: 'lane-a',
      label: 'Scouting',
      kind: 'task',
      segments: [
        {
          id: 'seg-scout',
          workItemId: 'item-scout',
          start: '2026-03-03T00:00:00.000Z',
          end: '2026-03-03T08:00:00.000Z',
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
      id: 'dep-z-plant-irrigate',
      fromId: 'item-plant',
      toId: 'item-irrigate',
      relationship: 'FS',
      lag: 0,
      hard: true,
    },
    {
      id: 'dep-a-irrigate-scout',
      fromId: 'item-irrigate',
      toId: 'item-scout',
      relationship: 'FS',
      lag: 0,
      hard: true,
    },
  ],
  resources: [
    {
      id: 'res-crew-a',
      label: 'Crew A',
      kind: 'crew',
      capacity: 1,
    },
    {
      id: 'res-crew-b',
      label: 'Crew B',
      kind: 'crew',
      capacity: 1,
    },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-risk',
      label: 'Weather watch',
      range: {
        start: '2026-03-02T00:00:00.000Z',
        end: '2026-03-03T00:00:00.000Z',
      },
      severity: 'high',
      kind: 'window',
    },
  ],
};
