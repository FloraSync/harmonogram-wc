import {
  CALENDAR_EXCEPTION_KINDS,
  DEPENDENCY_RELATIONSHIPS,
  INSIGHT_KINDS,
  SEGMENT_KINDS,
  SEVERITY_LEVELS,
  WORK_ITEM_KINDS,
} from '../contracts/model.js';
import type {
  Calendar,
  CalendarException,
  CalendarWindow,
  CalendarWorkingRule,
  Dependency,
  Insight,
  Lane,
  Marker,
  MetadataMap,
  Plan,
  Resource,
  ResourceAssignment,
  Segment,
  TimeRange,
  WorkItem,
  WorkItemSnapshot,
} from '../contracts/model.js';
import { ValidationError } from './error.js';
import type { ValidationIssue, ValidationResult } from './types.js';

type UnknownRecord = Record<string, unknown>;

interface StringOptions {
  optional?: boolean;
  allowEmpty?: boolean;
}

interface NumberOptions {
  optional?: boolean;
  min?: number;
  max?: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pushIssue(issues: ValidationIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function readRecord(value: unknown, path: string, issues: ValidationIssue[]): UnknownRecord {
  if (!isRecord(value)) {
    pushIssue(issues, path, 'must be an object');
    return {};
  }

  return value;
}

function readString(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: StringOptions = {},
): string | undefined {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (value === undefined) {
    if (options.optional) {
      return undefined;
    }

    pushIssue(issues, fieldPath, 'is required');
    return '';
  }

  if (typeof value !== 'string') {
    pushIssue(issues, fieldPath, 'must be a string');
    return '';
  }

  if (!options.allowEmpty && value.trim().length === 0) {
    pushIssue(issues, fieldPath, 'must not be empty');
  }

  return value;
}

function readBoolean(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  optional = false,
): boolean | undefined {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (value === undefined) {
    if (optional) {
      return undefined;
    }

    pushIssue(issues, fieldPath, 'is required');
    return false;
  }

  if (typeof value !== 'boolean') {
    pushIssue(issues, fieldPath, 'must be a boolean');
    return false;
  }

  return value;
}

function readNumber(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  options: NumberOptions = {},
): number | undefined {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (value === undefined) {
    if (options.optional) {
      return undefined;
    }

    pushIssue(issues, fieldPath, 'is required');
    return 0;
  }

  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    pushIssue(issues, fieldPath, 'must be a finite number');
    return 0;
  }

  if (options.min !== undefined && value < options.min) {
    pushIssue(issues, fieldPath, `must be greater than or equal to ${options.min}`);
  }

  if (options.max !== undefined && value > options.max) {
    pushIssue(issues, fieldPath, `must be less than or equal to ${options.max}`);
  }

  return value;
}

function readStringArray(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string[] {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (!Array.isArray(value)) {
    pushIssue(issues, fieldPath, 'must be an array');
    return [];
  }

  return value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      pushIssue(issues, `${fieldPath}[${index}]`, 'must be a non-empty string');
      return '';
    }

    return entry;
  });
}

function readEnum<T extends string>(
  parent: UnknownRecord,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T {
  const raw = readString(parent, key, path, issues);
  const fieldPath = `${path}.${key}`;

  if (raw !== undefined && allowed.includes(raw as T)) {
    return raw as T;
  }

  pushIssue(issues, fieldPath, `must be one of: ${allowed.join(', ')}`);
  return allowed[0];
}

function isIsoDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function validateDateTime(value: string, path: string, issues: ValidationIssue[]): void {
  if (!isIsoDateTime(value)) {
    pushIssue(issues, path, 'must be a valid ISO-8601 date-time string');
  }
}

function parseTimeRange(value: unknown, path: string, issues: ValidationIssue[]): TimeRange {
  const record = readRecord(value, path, issues);
  const start = readString(record, 'start', path, issues) ?? '';
  const end = readString(record, 'end', path, issues) ?? '';

  validateDateTime(start, `${path}.start`, issues);
  validateDateTime(end, `${path}.end`, issues);

  const startTime = Date.parse(start);
  const endTime = Date.parse(end);

  if (Number.isFinite(startTime) && Number.isFinite(endTime) && startTime > endTime) {
    pushIssue(issues, path, 'start must be before or equal to end');
  }

  return { start, end };
}

function parseMetadata(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): MetadataMap | undefined {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    pushIssue(issues, fieldPath, 'must be an object');
    return undefined;
  }

  return { ...value };
}

function parseSnapshot(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
): WorkItemSnapshot | undefined {
  const value = parent[key];

  if (value === undefined) {
    return undefined;
  }

  return parseTimeRange(value, `${path}.${key}`, issues);
}

function parseResourceAssignment(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): ResourceAssignment {
  const record = readRecord(value, path, issues);

  return {
    resourceId: readString(record, 'resourceId', path, issues) ?? '',
    units: readNumber(record, 'units', path, issues, { optional: true, min: 0 }),
    role: readString(record, 'role', path, issues, { optional: true }),
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseSegment(value: unknown, path: string, issues: ValidationIssue[]): Segment {
  const record = readRecord(value, path, issues);
  const start = readString(record, 'start', path, issues) ?? '';
  const end = readString(record, 'end', path, issues) ?? '';

  validateDateTime(start, `${path}.start`, issues);
  validateDateTime(end, `${path}.end`, issues);

  if (Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(start) > Date.parse(end)) {
    pushIssue(issues, path, 'start must be before or equal to end');
  }

  return {
    id: readString(record, 'id', path, issues) ?? '',
    workItemId: readString(record, 'workItemId', path, issues) ?? '',
    start,
    end,
    segmentKind: readEnum(record, 'segmentKind', path, SEGMENT_KINDS, issues),
    locked: readBoolean(record, 'locked', path, issues) ?? false,
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseWorkItem(value: unknown, path: string, issues: ValidationIssue[]): WorkItem {
  const record = readRecord(value, path, issues);
  const segmentsRaw = record['segments'];
  const assignmentsRaw = record['resourceAssignments'];

  const segments = Array.isArray(segmentsRaw)
    ? segmentsRaw.map((entry, index) => parseSegment(entry, `${path}.segments[${index}]`, issues))
    : (() => {
        pushIssue(issues, `${path}.segments`, 'must be an array');
        return [];
      })();

  const resourceAssignments = Array.isArray(assignmentsRaw)
    ? assignmentsRaw.map((entry, index) =>
        parseResourceAssignment(entry, `${path}.resourceAssignments[${index}]`, issues),
      )
    : (() => {
        pushIssue(issues, `${path}.resourceAssignments`, 'must be an array');
        return [];
      })();

  return {
    id: readString(record, 'id', path, issues) ?? '',
    laneId: readString(record, 'laneId', path, issues) ?? '',
    label: readString(record, 'label', path, issues) ?? '',
    kind: readEnum(record, 'kind', path, WORK_ITEM_KINDS, issues),
    status: readString(record, 'status', path, issues, { optional: true }),
    priority: readNumber(record, 'priority', path, issues, { optional: true }),
    progress: readNumber(record, 'progress', path, issues, { optional: true, min: 0, max: 100 }),
    segments,
    baseline: parseSnapshot(record, 'baseline', path, issues),
    actual: parseSnapshot(record, 'actual', path, issues),
    projection: parseSnapshot(record, 'projection', path, issues),
    resourceAssignments,
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseLane(value: unknown, path: string, issues: ValidationIssue[]): Lane {
  const record = readRecord(value, path, issues);

  return {
    id: readString(record, 'id', path, issues) ?? '',
    label: readString(record, 'label', path, issues) ?? '',
    parentId: readString(record, 'parentId', path, issues, { optional: true }),
    kind: readString(record, 'kind', path, issues) ?? '',
    resourceId: readString(record, 'resourceId', path, issues, { optional: true }),
    collapsed: readBoolean(record, 'collapsed', path, issues) ?? false,
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseDependency(value: unknown, path: string, issues: ValidationIssue[]): Dependency {
  const record = readRecord(value, path, issues);

  return {
    id: readString(record, 'id', path, issues) ?? '',
    fromId: readString(record, 'fromId', path, issues) ?? '',
    toId: readString(record, 'toId', path, issues) ?? '',
    relationship: readEnum(record, 'relationship', path, DEPENDENCY_RELATIONSHIPS, issues),
    lag: readNumber(record, 'lag', path, issues) ?? 0,
    hard: readBoolean(record, 'hard', path, issues) ?? false,
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseResource(value: unknown, path: string, issues: ValidationIssue[]): Resource {
  const record = readRecord(value, path, issues);

  return {
    id: readString(record, 'id', path, issues) ?? '',
    label: readString(record, 'label', path, issues) ?? '',
    kind: readString(record, 'kind', path, issues) ?? '',
    capacity: readNumber(record, 'capacity', path, issues, { min: 0 }) ?? 0,
    calendarId: readString(record, 'calendarId', path, issues, { optional: true }),
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseWorkingRule(value: unknown, path: string, issues: ValidationIssue[]): CalendarWorkingRule {
  const record = readRecord(value, path, issues);
  const daysRaw = record['daysOfWeek'];

  const daysOfWeek = Array.isArray(daysRaw)
    ? daysRaw.map((entry, index) => {
        if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 0 || entry > 6) {
          pushIssue(issues, `${path}.daysOfWeek[${index}]`, 'must be an integer between 0 and 6');
          return 0;
        }

        return entry;
      })
    : (() => {
        pushIssue(issues, `${path}.daysOfWeek`, 'must be an array');
        return [];
      })();

  return {
    id: readString(record, 'id', path, issues) ?? '',
    daysOfWeek,
    startTime: readString(record, 'startTime', path, issues) ?? '',
    endTime: readString(record, 'endTime', path, issues) ?? '',
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseCalendarException(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): CalendarException {
  const record = readRecord(value, path, issues);
  const start = readString(record, 'start', path, issues) ?? '';
  const end = readString(record, 'end', path, issues) ?? '';

  validateDateTime(start, `${path}.start`, issues);
  validateDateTime(end, `${path}.end`, issues);

  if (Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(start) > Date.parse(end)) {
    pushIssue(issues, path, 'start must be before or equal to end');
  }

  return {
    id: readString(record, 'id', path, issues) ?? '',
    start,
    end,
    kind: readEnum(record, 'kind', path, CALENDAR_EXCEPTION_KINDS, issues),
    label: readString(record, 'label', path, issues, { optional: true }),
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseCalendarWindow(value: unknown, path: string, issues: ValidationIssue[]): CalendarWindow {
  const record = readRecord(value, path, issues);
  const start = readString(record, 'start', path, issues) ?? '';
  const end = readString(record, 'end', path, issues) ?? '';

  validateDateTime(start, `${path}.start`, issues);
  validateDateTime(end, `${path}.end`, issues);

  if (Number.isFinite(Date.parse(start)) && Number.isFinite(Date.parse(end)) && Date.parse(start) > Date.parse(end)) {
    pushIssue(issues, path, 'start must be before or equal to end');
  }

  return {
    id: readString(record, 'id', path, issues) ?? '',
    start,
    end,
    kind: readString(record, 'kind', path, issues) ?? '',
    label: readString(record, 'label', path, issues, { optional: true }),
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseCalendar(value: unknown, path: string, issues: ValidationIssue[]): Calendar {
  const record = readRecord(value, path, issues);
  const workingRulesRaw = record['workingRules'];
  const exceptionsRaw = record['exceptions'];
  const windowsRaw = record['windows'];

  const workingRules = Array.isArray(workingRulesRaw)
    ? workingRulesRaw.map((entry, index) => parseWorkingRule(entry, `${path}.workingRules[${index}]`, issues))
    : (() => {
        pushIssue(issues, `${path}.workingRules`, 'must be an array');
        return [];
      })();

  const exceptions = Array.isArray(exceptionsRaw)
    ? exceptionsRaw.map((entry, index) =>
        parseCalendarException(entry, `${path}.exceptions[${index}]`, issues),
      )
    : (() => {
        pushIssue(issues, `${path}.exceptions`, 'must be an array');
        return [];
      })();

  const windows = Array.isArray(windowsRaw)
    ? windowsRaw.map((entry, index) => parseCalendarWindow(entry, `${path}.windows[${index}]`, issues))
    : (() => {
        pushIssue(issues, `${path}.windows`, 'must be an array');
        return [];
      })();

  return {
    id: readString(record, 'id', path, issues) ?? '',
    label: readString(record, 'label', path, issues) ?? '',
    timeZone: readString(record, 'timeZone', path, issues) ?? '',
    workingRules,
    exceptions,
    windows,
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseMarker(value: unknown, path: string, issues: ValidationIssue[]): Marker {
  const record = readRecord(value, path, issues);

  return {
    id: readString(record, 'id', path, issues) ?? '',
    label: readString(record, 'label', path, issues) ?? '',
    range: parseTimeRange(record['range'], `${path}.range`, issues),
    severity: readEnum(record, 'severity', path, SEVERITY_LEVELS, issues),
    kind: readString(record, 'kind', path, issues) ?? '',
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseInsight(value: unknown, path: string, issues: ValidationIssue[]): Insight {
  const record = readRecord(value, path, issues);

  return {
    id: readString(record, 'id', path, issues) ?? '',
    kind: readEnum(record, 'kind', path, INSIGHT_KINDS, issues),
    subjectIds: readStringArray(record, 'subjectIds', path, issues),
    severity: readEnum(record, 'severity', path, SEVERITY_LEVELS, issues),
    message: readString(record, 'message', path, issues) ?? '',
    metadata: parseMetadata(record, 'metadata', path, issues),
  };
}

function parseEntityArray<T>(
  parent: UnknownRecord,
  key: string,
  path: string,
  issues: ValidationIssue[],
  parse: (value: unknown, path: string, issues: ValidationIssue[]) => T,
): T[] {
  const fieldPath = `${path}.${key}`;
  const value = parent[key];

  if (!Array.isArray(value)) {
    pushIssue(issues, fieldPath, 'must be an array');
    return [];
  }

  return value.map((entry, index) => parse(entry, `${fieldPath}[${index}]`, issues));
}

function parsePlanValue(input: unknown, issues: ValidationIssue[]): Plan {
  const record = readRecord(input, 'plan', issues);

  return {
    id: readString(record, 'id', 'plan', issues) ?? '',
    name: readString(record, 'name', 'plan', issues) ?? '',
    timeZone: readString(record, 'timeZone', 'plan', issues) ?? '',
    range: parseTimeRange(record['range'], 'plan.range', issues),
    lanes: parseEntityArray(record, 'lanes', 'plan', issues, parseLane),
    items: parseEntityArray(record, 'items', 'plan', issues, parseWorkItem),
    dependencies: parseEntityArray(record, 'dependencies', 'plan', issues, parseDependency),
    resources: parseEntityArray(record, 'resources', 'plan', issues, parseResource),
    calendars: parseEntityArray(record, 'calendars', 'plan', issues, parseCalendar),
    markers: parseEntityArray(record, 'markers', 'plan', issues, parseMarker),
    metadata: parseMetadata(record, 'metadata', 'plan', issues),
  };
}

export function validatePlan(input: unknown): ValidationResult<Plan> {
  const issues: ValidationIssue[] = [];
  const value = parsePlanValue(input, issues);

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value,
    issues: [],
  };
}

export function parsePlan(input: unknown): Plan {
  const result = validatePlan(input);

  if (!result.ok) {
    throw new ValidationError('Invalid Harmonogram plan payload', result.issues);
  }

  return result.value;
}

export function validateInsights(input: unknown): ValidationResult<Insight[]> {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(input)) {
    return {
      ok: false,
      issues: [{ path: 'insights', message: 'must be an array' }],
    };
  }

  const value = input.map((entry, index) => parseInsight(entry, `insights[${index}]`, issues));

  if (issues.length > 0) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value,
    issues: [],
  };
}
