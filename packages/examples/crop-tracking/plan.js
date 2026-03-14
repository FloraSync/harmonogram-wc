export const cropTrackingPlan = {
  id: 'farm-group-2026-spring',
  name: 'Farm Group Delta - Spring 2026',
  timeZone: 'America/Denver',
  range: {
    start: '2026-03-10T00:00:00.000Z',
    end: '2026-07-20T00:00:00.000Z',
  },
  metadata: {
    farmGroupId: 'FG-DELTA',
    farmGroupName: 'Delta Planting Group',
    season: 'Spring 2026',
  },
  lanes: [
    {
      id: 'field-12',
      label: 'Field 12 (North Block)',
      kind: 'field',
      collapsed: false,
      metadata: {
        fieldId: 'F-12',
        crop: 'Corn',
        variety: 'Pioneer P1366AM',
      },
    },
    {
      id: 'field-17',
      label: 'Field 17 (South Flat)',
      kind: 'field',
      collapsed: false,
      metadata: {
        fieldId: 'F-17',
        crop: 'Corn',
        variety: 'Pioneer P1257AM',
      },
    },
  ],
  items: [
    {
      id: 'op-12-prep',
      laneId: 'field-12',
      label: 'Soil prep',
      kind: 'task',
      segments: [
        {
          id: 'seg-12-prep-plan',
          workItemId: 'op-12-prep',
          start: '2026-03-12T13:00:00.000Z',
          end: '2026-03-14T22:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
        {
          id: 'seg-12-prep-actual',
          workItemId: 'op-12-prep',
          start: '2026-03-12T15:00:00.000Z',
          end: '2026-03-15T01:00:00.000Z',
          segmentKind: 'actual',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-03-12T13:00:00.000Z',
        end: '2026-03-14T22:00:00.000Z',
      },
      actual: {
        start: '2026-03-12T15:00:00.000Z',
        end: '2026-03-15T01:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-tillage', units: 1 }],
      metadata: {
        operationType: 'tillage',
        phase: 'Preparation',
      },
    },
    {
      id: 'op-12-plant',
      laneId: 'field-12',
      label: 'Planting pass',
      kind: 'task',
      segments: [
        {
          id: 'seg-12-plant-plan',
          workItemId: 'op-12-plant',
          start: '2026-03-18T12:00:00.000Z',
          end: '2026-03-19T20:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
        {
          id: 'seg-12-plant-actual',
          workItemId: 'op-12-plant',
          start: '2026-03-18T14:00:00.000Z',
          end: '2026-03-20T03:00:00.000Z',
          segmentKind: 'actual',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-03-18T12:00:00.000Z',
        end: '2026-03-19T20:00:00.000Z',
      },
      actual: {
        start: '2026-03-18T14:00:00.000Z',
        end: '2026-03-20T03:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-planter', units: 1 }],
      metadata: {
        operationType: 'planting',
        phase: 'Planting',
      },
    },
    {
      id: 'op-12-scout',
      laneId: 'field-12',
      label: 'Emergence scouting',
      kind: 'task',
      segments: [
        {
          id: 'seg-12-scout-plan',
          workItemId: 'op-12-scout',
          start: '2026-04-02T14:00:00.000Z',
          end: '2026-04-03T01:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
        {
          id: 'seg-12-scout-proj',
          workItemId: 'op-12-scout',
          start: '2026-04-03T13:00:00.000Z',
          end: '2026-04-04T00:00:00.000Z',
          segmentKind: 'projected',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-04-02T14:00:00.000Z',
        end: '2026-04-03T01:00:00.000Z',
      },
      projection: {
        start: '2026-04-03T13:00:00.000Z',
        end: '2026-04-04T00:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-scout', units: 1 }],
      metadata: {
        operationType: 'scouting',
        phase: 'In-season',
      },
    },
    {
      id: 'op-17-prep',
      laneId: 'field-17',
      label: 'Soil prep',
      kind: 'task',
      segments: [
        {
          id: 'seg-17-prep-plan',
          workItemId: 'op-17-prep',
          start: '2026-03-15T13:00:00.000Z',
          end: '2026-03-17T22:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
        {
          id: 'seg-17-prep-actual',
          workItemId: 'op-17-prep',
          start: '2026-03-15T13:00:00.000Z',
          end: '2026-03-17T19:00:00.000Z',
          segmentKind: 'actual',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-03-15T13:00:00.000Z',
        end: '2026-03-17T22:00:00.000Z',
      },
      actual: {
        start: '2026-03-15T13:00:00.000Z',
        end: '2026-03-17T19:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-tillage', units: 1 }],
      metadata: {
        operationType: 'tillage',
        phase: 'Preparation',
      },
    },
    {
      id: 'op-17-plant',
      laneId: 'field-17',
      label: 'Planting pass',
      kind: 'task',
      segments: [
        {
          id: 'seg-17-plant-plan',
          workItemId: 'op-17-plant',
          start: '2026-03-21T12:00:00.000Z',
          end: '2026-03-22T21:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
        {
          id: 'seg-17-plant-proj',
          workItemId: 'op-17-plant',
          start: '2026-03-22T14:00:00.000Z',
          end: '2026-03-24T00:00:00.000Z',
          segmentKind: 'projected',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-03-21T12:00:00.000Z',
        end: '2026-03-22T21:00:00.000Z',
      },
      projection: {
        start: '2026-03-22T14:00:00.000Z',
        end: '2026-03-24T00:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-planter', units: 1 }],
      metadata: {
        operationType: 'planting',
        phase: 'Planting',
      },
    },
    {
      id: 'op-17-harvest',
      laneId: 'field-17',
      label: 'Harvest run',
      kind: 'task',
      segments: [
        {
          id: 'seg-17-harvest-plan',
          workItemId: 'op-17-harvest',
          start: '2026-07-01T12:00:00.000Z',
          end: '2026-07-06T01:00:00.000Z',
          segmentKind: 'planned',
          locked: false,
        },
      ],
      baseline: {
        start: '2026-07-01T12:00:00.000Z',
        end: '2026-07-06T01:00:00.000Z',
      },
      resourceAssignments: [{ resourceId: 'crew-harvest', units: 1 }],
      metadata: {
        operationType: 'harvest',
        phase: 'Harvest',
      },
    },
  ],
  dependencies: [
    {
      id: 'dep-z-12-prep-plant',
      fromId: 'op-12-prep',
      toId: 'op-12-plant',
      relationship: 'FS',
      lag: 0,
      hard: true,
    },
    {
      id: 'dep-a-12-plant-scout',
      fromId: 'op-12-plant',
      toId: 'op-12-scout',
      relationship: 'FS',
      lag: 86400000,
      hard: true,
    },
    {
      id: 'dep-c-17-prep-plant',
      fromId: 'op-17-prep',
      toId: 'op-17-plant',
      relationship: 'FS',
      lag: 0,
      hard: true,
    },
    {
      id: 'dep-b-17-plant-harvest',
      fromId: 'op-17-plant',
      toId: 'op-17-harvest',
      relationship: 'FS',
      lag: 0,
      hard: true,
    },
  ],
  resources: [
    {
      id: 'crew-tillage',
      label: 'Tillage crew',
      kind: 'crew',
      capacity: 1,
    },
    {
      id: 'crew-planter',
      label: 'Planter crew',
      kind: 'crew',
      capacity: 1,
    },
    {
      id: 'crew-scout',
      label: 'Scouting crew',
      kind: 'crew',
      capacity: 1,
    },
    {
      id: 'crew-harvest',
      label: 'Harvest crew',
      kind: 'crew',
      capacity: 1,
    },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-plant-window',
      label: 'Planting window',
      range: {
        start: '2026-03-15T00:00:00.000Z',
        end: '2026-03-28T00:00:00.000Z',
      },
      severity: 'medium',
      kind: 'window',
      metadata: {
        domain: 'crop',
      },
    },
    {
      id: 'marker-harvest-window',
      label: 'Harvest window',
      range: {
        start: '2026-06-28T00:00:00.000Z',
        end: '2026-07-12T00:00:00.000Z',
      },
      severity: 'high',
      kind: 'window',
      metadata: {
        domain: 'crop',
      },
    },
  ],
};
