function segment(id, workItemId, start, end, segmentKind) {
  return {
    id,
    workItemId,
    start,
    end,
    segmentKind,
    locked: false,
  };
}

function assignment(resourceId, units = 1) {
  return { resourceId, units };
}

const rollingMillPlan = {
  id: 'plan-rolling-mill',
  name: 'Rolling Mill Sequencing',
  timeZone: 'UTC',
  range: {
    start: '2026-04-01T05:00:00.000Z',
    end: '2026-04-02T03:00:00.000Z',
  },
  lanes: [
    { id: 'lane-furnace', label: 'Station A - Furnace', kind: 'station', collapsed: false },
    { id: 'lane-rolling', label: 'Station B - Rolling', kind: 'station', collapsed: false },
    { id: 'lane-finishing', label: 'Station C - Finishing', kind: 'station', collapsed: false },
  ],
  items: [
    {
      id: 'item-a-heat',
      laneId: 'lane-furnace',
      label: 'Coil A heat treatment',
      kind: 'task',
      segments: [
        segment('seg-a-heat-plan', 'item-a-heat', '2026-04-01T06:00:00.000Z', '2026-04-01T09:00:00.000Z', 'planned'),
        segment('seg-a-heat-actual', 'item-a-heat', '2026-04-01T06:20:00.000Z', '2026-04-01T09:40:00.000Z', 'actual'),
      ],
      resourceAssignments: [assignment('res-furnace')],
      metadata: { phase: 'Heating' },
    },
    {
      id: 'item-a-roll',
      laneId: 'lane-rolling',
      label: 'Coil A rolling pass',
      kind: 'task',
      segments: [
        segment('seg-a-roll-plan', 'item-a-roll', '2026-04-01T09:20:00.000Z', '2026-04-01T12:10:00.000Z', 'planned'),
        segment('seg-a-roll-actual', 'item-a-roll', '2026-04-01T10:05:00.000Z', '2026-04-01T13:00:00.000Z', 'actual'),
      ],
      resourceAssignments: [assignment('res-mill')],
      metadata: { phase: 'Rolling' },
    },
    {
      id: 'item-a-finish',
      laneId: 'lane-finishing',
      label: 'Coil A inspection and trim',
      kind: 'task',
      segments: [segment('seg-a-finish-plan', 'item-a-finish', '2026-04-01T12:20:00.000Z', '2026-04-01T14:10:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-qc')],
      metadata: { phase: 'Finishing' },
    },
    {
      id: 'item-b-heat',
      laneId: 'lane-furnace',
      label: 'Coil B heat treatment',
      kind: 'task',
      segments: [segment('seg-b-heat-plan', 'item-b-heat', '2026-04-01T10:15:00.000Z', '2026-04-01T12:50:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-furnace')],
      metadata: { phase: 'Heating' },
    },
    {
      id: 'item-b-roll',
      laneId: 'lane-rolling',
      label: 'Coil B rolling pass',
      kind: 'task',
      segments: [
        segment('seg-b-roll-plan', 'item-b-roll', '2026-04-01T12:55:00.000Z', '2026-04-01T15:10:00.000Z', 'planned'),
        segment('seg-b-roll-proj', 'item-b-roll', '2026-04-01T13:30:00.000Z', '2026-04-01T16:10:00.000Z', 'projected'),
      ],
      resourceAssignments: [assignment('res-mill')],
      metadata: { phase: 'Rolling' },
    },
    {
      id: 'item-b-finish',
      laneId: 'lane-finishing',
      label: 'Coil B inspection and pack',
      kind: 'task',
      segments: [segment('seg-b-finish-plan', 'item-b-finish', '2026-04-01T15:15:00.000Z', '2026-04-01T16:45:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-qc')],
      metadata: { phase: 'Finishing' },
    },
  ],
  dependencies: [
    { id: 'dep-z-a-heat-roll', fromId: 'item-a-heat', toId: 'item-a-roll', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-c-a-roll-finish', fromId: 'item-a-roll', toId: 'item-a-finish', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-a-b-heat-roll', fromId: 'item-b-heat', toId: 'item-b-roll', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-b-b-roll-finish', fromId: 'item-b-roll', toId: 'item-b-finish', relationship: 'FS', lag: 0, hard: true },
  ],
  resources: [
    { id: 'res-furnace', label: 'Furnace crew', kind: 'crew', capacity: 1 },
    { id: 'res-mill', label: 'Rolling crew', kind: 'crew', capacity: 1 },
    { id: 'res-qc', label: 'Finishing crew', kind: 'crew', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-roll-bottleneck',
      label: 'Rolling bottleneck risk',
      range: { start: '2026-04-01T12:00:00.000Z', end: '2026-04-01T14:00:00.000Z' },
      severity: 'high',
      kind: 'window',
    },
  ],
};

const sprintPlan = {
  id: 'plan-sprint',
  name: 'Micro Sprint Flow (2 Weeks)',
  timeZone: 'UTC',
  range: {
    start: '2026-04-13T00:00:00.000Z',
    end: '2026-04-24T23:59:59.000Z',
  },
  lanes: [
    { id: 'lane-ada', label: 'Developer Ada', kind: 'person', collapsed: false },
    { id: 'lane-lin', label: 'Developer Lin', kind: 'person', collapsed: false },
    { id: 'lane-qa', label: 'QA Pair', kind: 'person', collapsed: false },
  ],
  items: [
    {
      id: 'item-feat-201',
      laneId: 'lane-ada',
      label: 'Feature 201 implementation',
      kind: 'task',
      segments: [
        segment('seg-feat-201-plan', 'item-feat-201', '2026-04-13T15:00:00.000Z', '2026-04-14T21:00:00.000Z', 'planned'),
        segment('seg-feat-201-actual', 'item-feat-201', '2026-04-13T16:10:00.000Z', '2026-04-14T23:15:00.000Z', 'actual'),
      ],
      resourceAssignments: [assignment('res-ada')],
      metadata: { phase: 'Feature Work' },
    },
    {
      id: 'item-review-201',
      laneId: 'lane-lin',
      label: 'Code review 201',
      kind: 'task',
      segments: [segment('seg-review-201-plan', 'item-review-201', '2026-04-15T14:00:00.000Z', '2026-04-15T18:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-lin')],
      metadata: { phase: 'Code Review' },
    },
    {
      id: 'item-test-201',
      laneId: 'lane-qa',
      label: 'QA pass 201',
      kind: 'task',
      segments: [segment('seg-test-201-plan', 'item-test-201', '2026-04-16T15:00:00.000Z', '2026-04-16T21:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-qa')],
      metadata: { phase: 'Verification' },
    },
    {
      id: 'item-context-switch',
      laneId: 'lane-ada',
      label: 'Support + meeting context switch',
      kind: 'task',
      segments: [
        segment('seg-context-1', 'item-context-switch', '2026-04-17T15:00:00.000Z', '2026-04-17T16:00:00.000Z', 'planned'),
        segment('seg-context-2', 'item-context-switch', '2026-04-17T18:00:00.000Z', '2026-04-17T19:00:00.000Z', 'planned'),
        segment('seg-context-3', 'item-context-switch', '2026-04-17T20:30:00.000Z', '2026-04-17T22:00:00.000Z', 'planned'),
      ],
      resourceAssignments: [assignment('res-ada')],
      metadata: { phase: 'Context Switch' },
    },
  ],
  dependencies: [
    { id: 'dep-sprint-1', fromId: 'item-feat-201', toId: 'item-review-201', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-sprint-2', fromId: 'item-review-201', toId: 'item-test-201', relationship: 'FS', lag: 0, hard: true },
  ],
  resources: [
    { id: 'res-ada', label: 'Ada', kind: 'person', capacity: 1 },
    { id: 'res-lin', label: 'Lin', kind: 'person', capacity: 1 },
    { id: 'res-qa', label: 'QA Pair', kind: 'person', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-sprint-review',
      label: 'Sprint review deadline',
      range: { start: '2026-04-23T15:00:00.000Z', end: '2026-04-23T17:00:00.000Z' },
      severity: 'medium',
      kind: 'window',
    },
  ],
};

const orSchedulePlan = {
  id: 'plan-or-schedule',
  name: 'Hospital OR Turnover Model',
  timeZone: 'UTC',
  range: {
    start: '2026-05-04T05:00:00.000Z',
    end: '2026-05-04T23:00:00.000Z',
  },
  lanes: [
    { id: 'lane-or1', label: 'OR-1', kind: 'room', collapsed: false },
    { id: 'lane-or2', label: 'OR-2', kind: 'room', collapsed: false },
    { id: 'lane-pacu', label: 'PACU', kind: 'care', collapsed: false },
  ],
  items: [
    {
      id: 'item-or1-case-a',
      laneId: 'lane-or1',
      label: 'Case A (Cardiac)',
      kind: 'task',
      segments: [
        segment('seg-or1-a-plan', 'item-or1-case-a', '2026-05-04T07:00:00.000Z', '2026-05-04T10:00:00.000Z', 'planned'),
        segment('seg-or1-a-actual', 'item-or1-case-a', '2026-05-04T07:15:00.000Z', '2026-05-04T10:50:00.000Z', 'actual'),
      ],
      resourceAssignments: [assignment('res-surgeon-a')],
      metadata: { phase: 'Procedure' },
    },
    {
      id: 'item-or1-turnover',
      laneId: 'lane-or1',
      label: 'OR-1 turnover',
      kind: 'task',
      segments: [segment('seg-or1-turnover', 'item-or1-turnover', '2026-05-04T10:50:00.000Z', '2026-05-04T11:30:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-room-team')],
      metadata: { phase: 'Turnover' },
    },
    {
      id: 'item-or1-case-b',
      laneId: 'lane-or1',
      label: 'Case B (Orthopedic)',
      kind: 'task',
      segments: [segment('seg-or1-b-plan', 'item-or1-case-b', '2026-05-04T11:35:00.000Z', '2026-05-04T14:40:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-surgeon-b')],
      metadata: { phase: 'Procedure' },
    },
    {
      id: 'item-or2-case-c',
      laneId: 'lane-or2',
      label: 'Case C (ENT)',
      kind: 'task',
      segments: [segment('seg-or2-c-plan', 'item-or2-case-c', '2026-05-04T07:40:00.000Z', '2026-05-04T09:40:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-surgeon-c')],
      metadata: { phase: 'Procedure' },
    },
    {
      id: 'item-pacu-a',
      laneId: 'lane-pacu',
      label: 'PACU recovery Case A',
      kind: 'task',
      segments: [segment('seg-pacu-a-plan', 'item-pacu-a', '2026-05-04T10:55:00.000Z', '2026-05-04T12:15:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-anesthesia')],
      metadata: { phase: 'Recovery' },
    },
    {
      id: 'item-pacu-c',
      laneId: 'lane-pacu',
      label: 'PACU recovery Case C',
      kind: 'task',
      segments: [segment('seg-pacu-c-plan', 'item-pacu-c', '2026-05-04T09:45:00.000Z', '2026-05-04T10:45:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-anesthesia')],
      metadata: { phase: 'Recovery' },
    },
  ],
  dependencies: [
    { id: 'dep-or-a1', fromId: 'item-or1-case-a', toId: 'item-or1-turnover', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-or-a2', fromId: 'item-or1-turnover', toId: 'item-or1-case-b', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-or-a3', fromId: 'item-or1-case-a', toId: 'item-pacu-a', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-or-c1', fromId: 'item-or2-case-c', toId: 'item-pacu-c', relationship: 'FS', lag: 0, hard: true },
  ],
  resources: [
    { id: 'res-surgeon-a', label: 'Surgeon A', kind: 'person', capacity: 1 },
    { id: 'res-surgeon-b', label: 'Surgeon B', kind: 'person', capacity: 1 },
    { id: 'res-surgeon-c', label: 'Surgeon C', kind: 'person', capacity: 1 },
    { id: 'res-room-team', label: 'Turnover team', kind: 'crew', capacity: 1 },
    { id: 'res-anesthesia', label: 'Anesthesia pool', kind: 'crew', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-or-emergency',
      label: 'Emergency intake buffer',
      range: { start: '2026-05-04T12:00:00.000Z', end: '2026-05-04T13:00:00.000Z' },
      severity: 'critical',
      kind: 'window',
    },
  ],
};

const logisticsPlan = {
  id: 'plan-logistics',
  name: 'Fleet Route And Dock Harmony',
  timeZone: 'UTC',
  range: {
    start: '2026-06-02T05:00:00.000Z',
    end: '2026-06-03T03:00:00.000Z',
  },
  lanes: [
    { id: 'lane-truck-17', label: 'Truck 17', kind: 'vehicle', collapsed: false },
    { id: 'lane-truck-21', label: 'Truck 21', kind: 'vehicle', collapsed: false },
    { id: 'lane-dock-4', label: 'Hub Dock 4', kind: 'hub', collapsed: false },
  ],
  items: [
    {
      id: 'item-route-17-a',
      laneId: 'lane-truck-17',
      label: 'Route 17A - Depot to Hub',
      kind: 'task',
      segments: [segment('seg-route-17-a', 'item-route-17-a', '2026-06-02T06:00:00.000Z', '2026-06-02T09:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-driver-17')],
      metadata: { phase: 'Transit' },
    },
    {
      id: 'item-dock-17',
      laneId: 'lane-dock-4',
      label: 'Truck 17 loading slot',
      kind: 'task',
      segments: [segment('seg-dock-17', 'item-dock-17', '2026-06-02T09:05:00.000Z', '2026-06-02T10:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-dock-team')],
      metadata: { phase: 'Loading' },
    },
    {
      id: 'item-route-21-a',
      laneId: 'lane-truck-21',
      label: 'Route 21A - North loop',
      kind: 'task',
      segments: [segment('seg-route-21-a', 'item-route-21-a', '2026-06-02T06:30:00.000Z', '2026-06-02T09:20:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-driver-21')],
      metadata: { phase: 'Transit' },
    },
    {
      id: 'item-dock-21',
      laneId: 'lane-dock-4',
      label: 'Truck 21 loading slot',
      kind: 'task',
      segments: [
        segment('seg-dock-21-plan', 'item-dock-21', '2026-06-02T09:10:00.000Z', '2026-06-02T09:55:00.000Z', 'planned'),
        segment('seg-dock-21-proj', 'item-dock-21', '2026-06-02T09:35:00.000Z', '2026-06-02T10:20:00.000Z', 'projected'),
      ],
      resourceAssignments: [assignment('res-dock-team')],
      metadata: { phase: 'Loading' },
    },
    {
      id: 'item-route-17-b',
      laneId: 'lane-truck-17',
      label: 'Route 17B - Hub to East',
      kind: 'task',
      segments: [segment('seg-route-17-b', 'item-route-17-b', '2026-06-02T10:05:00.000Z', '2026-06-02T13:10:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-driver-17')],
      metadata: { phase: 'Transit' },
    },
  ],
  dependencies: [
    { id: 'dep-log-1', fromId: 'item-route-17-a', toId: 'item-dock-17', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-log-2', fromId: 'item-dock-17', toId: 'item-route-17-b', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-log-3', fromId: 'item-route-21-a', toId: 'item-dock-21', relationship: 'FS', lag: 0, hard: true },
  ],
  resources: [
    { id: 'res-driver-17', label: 'Driver 17', kind: 'person', capacity: 1 },
    { id: 'res-driver-21', label: 'Driver 21', kind: 'person', capacity: 1 },
    { id: 'res-dock-team', label: 'Dock team', kind: 'crew', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-dock-collision',
      label: 'Dock collision risk',
      range: { start: '2026-06-02T09:05:00.000Z', end: '2026-06-02T10:15:00.000Z' },
      severity: 'high',
      kind: 'window',
    },
  ],
};

const eventProductionPlan = {
  id: 'plan-festival',
  name: 'Festival Stage Hand-Offs',
  timeZone: 'UTC',
  range: {
    start: '2026-07-18T12:00:00.000Z',
    end: '2026-07-19T07:00:00.000Z',
  },
  lanes: [
    { id: 'lane-main-stage', label: 'Main Stage', kind: 'stage', collapsed: false },
    { id: 'lane-side-stage', label: 'Side Stage', kind: 'stage', collapsed: false },
    { id: 'lane-logistics', label: 'Logistics Backline', kind: 'ops', collapsed: false },
  ],
  items: [
    {
      id: 'item-main-check',
      laneId: 'lane-main-stage',
      label: 'Main stage line check',
      kind: 'task',
      segments: [segment('seg-main-check', 'item-main-check', '2026-07-18T14:00:00.000Z', '2026-07-18T15:30:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-audio-main')],
      metadata: { phase: 'Soundcheck' },
    },
    {
      id: 'item-main-headliner',
      laneId: 'lane-main-stage',
      label: 'Headliner set',
      kind: 'task',
      segments: [segment('seg-main-headliner', 'item-main-headliner', '2026-07-19T00:00:00.000Z', '2026-07-19T01:30:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-audio-main')],
      metadata: { phase: 'Showtime' },
    },
    {
      id: 'item-side-opener',
      laneId: 'lane-side-stage',
      label: 'Side stage opener',
      kind: 'task',
      segments: [segment('seg-side-opener', 'item-side-opener', '2026-07-18T22:30:00.000Z', '2026-07-19T00:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-audio-side')],
      metadata: { phase: 'Showtime' },
    },
    {
      id: 'item-side-handoff',
      laneId: 'lane-side-stage',
      label: 'Side stage hand-off set',
      kind: 'task',
      segments: [segment('seg-side-handoff', 'item-side-handoff', '2026-07-19T01:30:00.000Z', '2026-07-19T03:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-audio-side')],
      metadata: { phase: 'Handoff' },
    },
    {
      id: 'item-vendor-delivery',
      laneId: 'lane-logistics',
      label: 'Vendor cold-load',
      kind: 'task',
      segments: [
        segment('seg-vendor-plan', 'item-vendor-delivery', '2026-07-18T15:00:00.000Z', '2026-07-18T18:00:00.000Z', 'planned'),
        segment('seg-vendor-actual', 'item-vendor-delivery', '2026-07-18T15:20:00.000Z', '2026-07-18T18:40:00.000Z', 'actual'),
      ],
      resourceAssignments: [assignment('res-stage-ops')],
      metadata: { phase: 'Logistics' },
    },
  ],
  dependencies: [
    { id: 'dep-event-1', fromId: 'item-main-check', toId: 'item-main-headliner', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-event-2', fromId: 'item-main-headliner', toId: 'item-side-handoff', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-event-3', fromId: 'item-vendor-delivery', toId: 'item-main-headliner', relationship: 'FS', lag: 0, hard: true },
  ],
  resources: [
    { id: 'res-audio-main', label: 'Main stage audio', kind: 'crew', capacity: 1 },
    { id: 'res-audio-side', label: 'Side stage audio', kind: 'crew', capacity: 1 },
    { id: 'res-stage-ops', label: 'Stage ops crew', kind: 'crew', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-curfew',
      label: 'Noise curfew',
      range: { start: '2026-07-19T03:00:00.000Z', end: '2026-07-19T03:30:00.000Z' },
      severity: 'medium',
      kind: 'window',
    },
  ],
};

const constructionPlan = {
  id: 'plan-linear-construction',
  name: 'Linear Highway Construction',
  timeZone: 'UTC',
  range: {
    start: '2026-08-01T00:00:00.000Z',
    end: '2026-08-18T00:00:00.000Z',
  },
  lanes: [
    { id: 'lane-mile-0-5', label: 'Mile 0-5', kind: 'segment', collapsed: false },
    { id: 'lane-mile-5-10', label: 'Mile 5-10', kind: 'segment', collapsed: false },
    { id: 'lane-mile-10-15', label: 'Mile 10-15', kind: 'segment', collapsed: false },
  ],
  items: [
    {
      id: 'item-grade-0-5',
      laneId: 'lane-mile-0-5',
      label: 'Grading crew pass',
      kind: 'task',
      segments: [segment('seg-grade-0-5', 'item-grade-0-5', '2026-08-01T06:00:00.000Z', '2026-08-04T20:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-grade')],
      metadata: { phase: 'Grading' },
    },
    {
      id: 'item-pave-0-5',
      laneId: 'lane-mile-0-5',
      label: 'Paving machine pass',
      kind: 'task',
      segments: [
        segment('seg-pave-0-5-plan', 'item-pave-0-5', '2026-08-05T06:00:00.000Z', '2026-08-08T20:00:00.000Z', 'planned'),
        segment('seg-pave-0-5-proj', 'item-pave-0-5', '2026-08-05T12:00:00.000Z', '2026-08-09T12:00:00.000Z', 'projected'),
      ],
      resourceAssignments: [assignment('res-pave')],
      metadata: { phase: 'Paving' },
    },
    {
      id: 'item-paint-0-5',
      laneId: 'lane-mile-0-5',
      label: 'Striping crew',
      kind: 'task',
      segments: [segment('seg-paint-0-5', 'item-paint-0-5', '2026-08-09T14:00:00.000Z', '2026-08-11T18:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-paint')],
      metadata: { phase: 'Striping' },
    },
    {
      id: 'item-grade-5-10',
      laneId: 'lane-mile-5-10',
      label: 'Grading crew pass',
      kind: 'task',
      segments: [segment('seg-grade-5-10', 'item-grade-5-10', '2026-08-03T06:00:00.000Z', '2026-08-06T20:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-grade')],
      metadata: { phase: 'Grading' },
    },
    {
      id: 'item-pave-5-10',
      laneId: 'lane-mile-5-10',
      label: 'Paving machine pass',
      kind: 'task',
      segments: [segment('seg-pave-5-10', 'item-pave-5-10', '2026-08-09T08:00:00.000Z', '2026-08-12T20:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-pave')],
      metadata: { phase: 'Paving' },
    },
    {
      id: 'item-grade-10-15',
      laneId: 'lane-mile-10-15',
      label: 'Grading crew pass',
      kind: 'task',
      segments: [segment('seg-grade-10-15', 'item-grade-10-15', '2026-08-05T06:00:00.000Z', '2026-08-08T20:00:00.000Z', 'planned')],
      resourceAssignments: [assignment('res-grade')],
      metadata: { phase: 'Grading' },
    },
  ],
  dependencies: [
    { id: 'dep-con-1', fromId: 'item-grade-0-5', toId: 'item-pave-0-5', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-con-2', fromId: 'item-pave-0-5', toId: 'item-paint-0-5', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-con-3', fromId: 'item-grade-5-10', toId: 'item-pave-5-10', relationship: 'FS', lag: 0, hard: true },
    { id: 'dep-con-4', fromId: 'item-pave-0-5', toId: 'item-pave-5-10', relationship: 'FS', lag: 43200000, hard: true },
  ],
  resources: [
    { id: 'res-grade', label: 'Grading crew', kind: 'crew', capacity: 1 },
    { id: 'res-pave', label: 'Paving crew', kind: 'crew', capacity: 1 },
    { id: 'res-paint', label: 'Striping crew', kind: 'crew', capacity: 1 },
  ],
  calendars: [],
  markers: [
    {
      id: 'marker-weather',
      label: 'Storm delay window',
      range: { start: '2026-08-07T00:00:00.000Z', end: '2026-08-08T12:00:00.000Z' },
      severity: 'high',
      kind: 'window',
    },
  ],
};

export const useCaseScenarios = [
  {
    id: 'rolling-mill',
    title: 'Rolling Mill / Assembly Line Sequencing',
    description:
      'Follow workstation hand-offs and detect bottlenecks as rolling delays widen the distance between station completion windows.',
    edge: 'Process rhythm exposed: bottlenecks show up as widening dependency delay.',
    defaultScale: 'hour',
    defaultGroupBy: 'lane',
    plan: rollingMillPlan,
  },
  {
    id: 'sprint-flow',
    title: 'Micro-Level Sprint Planning',
    description:
      'Track rapid ticket hand-offs and context switching across a two-week sprint where small interruptions dominate throughput.',
    edge: 'Context-switch overhead becomes visible instead of hiding inside generic task bars.',
    defaultScale: 'day',
    defaultGroupBy: 'phase',
    plan: sprintPlan,
  },
  {
    id: 'or-scheduling',
    title: 'Hospital OR Scheduling',
    description:
      'Visualize staggered participation across surgeons, turnover crews, and recovery teams to improve operating room utilization.',
    edge: 'Staggered resource entry and exit timing is explicit, so turnover optimization is measurable.',
    defaultScale: 'hour',
    defaultGroupBy: 'resource',
    plan: orSchedulePlan,
  },
  {
    id: 'fleet-routing',
    title: 'Logistics & Fleet Route Optimization',
    description:
      'Model truck movements and dock occupancy on the same timeline to expose loading collisions and idle windows.',
    edge: 'Dock collisions are obvious timeline conflicts, not hidden overlap footnotes.',
    defaultScale: 'hour',
    defaultGroupBy: 'resource',
    plan: logisticsPlan,
  },
  {
    id: 'festival-production',
    title: 'Large-Scale Event Production',
    description:
      'Coordinate stage, logistics, and synchronized audio hand-offs where timing drift can break live transitions.',
    edge: 'Synchronized starts and hand-offs appear as connected flow, not disconnected milestone bars.',
    defaultScale: 'hour',
    defaultGroupBy: 'phase',
    plan: eventProductionPlan,
  },
  {
    id: 'linear-construction',
    title: 'Construction Linear Scheduling',
    description:
      'Track crew progression by mile marker so downstream teams do not start before upstream sections are production-ready.',
    edge: 'Crew movement across distance and time is explicit, preventing early-start collisions.',
    defaultScale: 'day',
    defaultGroupBy: 'lane',
    plan: constructionPlan,
  },
];
