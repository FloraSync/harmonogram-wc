export type IsoDateTime = string;
export type MetadataMap = Record<string, unknown>;

export interface TimeRange {
  start: IsoDateTime;
  end: IsoDateTime;
}

export interface Plan {
  id: string;
  name: string;
  timeZone: string;
  range: TimeRange;
  lanes: Lane[];
  items: WorkItem[];
  dependencies: Dependency[];
  resources: Resource[];
  calendars: Calendar[];
  markers: Marker[];
  metadata?: MetadataMap;
}

export interface Lane {
  id: string;
  label: string;
  parentId?: string;
  kind: string;
  resourceId?: string;
  collapsed: boolean;
  metadata?: MetadataMap;
}

export const WORK_ITEM_KINDS = ['task', 'milestone', 'window', 'buffer', 'event'] as const;
export type WorkItemKind = (typeof WORK_ITEM_KINDS)[number];

export interface WorkItemSnapshot {
  start: IsoDateTime;
  end: IsoDateTime;
}

export interface ResourceAssignment {
  resourceId: string;
  units?: number;
  role?: string;
  metadata?: MetadataMap;
}

export interface WorkItem {
  id: string;
  laneId: string;
  label: string;
  kind: WorkItemKind;
  status?: string;
  priority?: number;
  progress?: number;
  segments: Segment[];
  baseline?: WorkItemSnapshot;
  actual?: WorkItemSnapshot;
  projection?: WorkItemSnapshot;
  resourceAssignments: ResourceAssignment[];
  metadata?: MetadataMap;
}

export const SEGMENT_KINDS = ['planned', 'actual', 'projected', 'pause'] as const;
export type SegmentKind = (typeof SEGMENT_KINDS)[number];

export interface Segment {
  id: string;
  workItemId: string;
  start: IsoDateTime;
  end: IsoDateTime;
  segmentKind: SegmentKind;
  locked: boolean;
  metadata?: MetadataMap;
}

export const DEPENDENCY_RELATIONSHIPS = ['FS', 'SS', 'FF', 'SF'] as const;
export type DependencyRelationship = (typeof DEPENDENCY_RELATIONSHIPS)[number];

export interface Dependency {
  id: string;
  fromId: string;
  toId: string;
  relationship: DependencyRelationship;
  lag: number;
  hard: boolean;
  metadata?: MetadataMap;
}

export interface Resource {
  id: string;
  label: string;
  kind: string;
  capacity: number;
  calendarId?: string;
  metadata?: MetadataMap;
}

export interface CalendarWorkingRule {
  id: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  metadata?: MetadataMap;
}

export const CALENDAR_EXCEPTION_KINDS = ['working', 'non-working'] as const;
export type CalendarExceptionKind = (typeof CALENDAR_EXCEPTION_KINDS)[number];

export interface CalendarException {
  id: string;
  start: IsoDateTime;
  end: IsoDateTime;
  kind: CalendarExceptionKind;
  label?: string;
  metadata?: MetadataMap;
}

export interface CalendarWindow {
  id: string;
  start: IsoDateTime;
  end: IsoDateTime;
  kind: string;
  label?: string;
  metadata?: MetadataMap;
}

export interface Calendar {
  id: string;
  label: string;
  timeZone: string;
  workingRules: CalendarWorkingRule[];
  exceptions: CalendarException[];
  windows: CalendarWindow[];
  metadata?: MetadataMap;
}

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export interface Marker {
  id: string;
  label: string;
  range: TimeRange;
  severity: SeverityLevel;
  kind: string;
  metadata?: MetadataMap;
}

export const INSIGHT_KINDS = [
  'overlap',
  'gap',
  'blocked',
  'critical',
  'capacity-conflict',
  'window-risk',
  'drift',
] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];

export interface Insight {
  id: string;
  kind: InsightKind;
  subjectIds: string[];
  severity: SeverityLevel;
  message: string;
  metadata?: MetadataMap;
}
