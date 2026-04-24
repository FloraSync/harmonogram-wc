import type { DependencyRelationship, Plan, TimeRange } from '@florasync/harmonogram-core';
import {
  BOARD_GROUPING_MODES,
  TIMELINE_SCALES,
  buildBoardViewModel,
  type HarmonogramDependencyPathViewModel,
  type HarmonogramBoardGroupBy,
  type HarmonogramBoardFilters,
  type HarmonogramBoardSelection,
  type HarmonogramBoardView,
  type HarmonogramBoardViewModel,
  type HarmonogramLaneItemViewModel,
  type TimelineScale,
} from './board-view-model.js';

const BOARD_TAG_NAME = 'harmonogram-board';
const DEFAULT_SCALE: TimelineScale = 'week';
const DEFAULT_EDITING_MODE: HarmonogramEditingMode = 'controlled';
const LOCAL_HISTORY_LIMIT = 50;
const LOCAL_MOVE_DELTA_MS = 6 * 60 * 60 * 1000;
const LOCAL_RESIZE_DELTA_MS = 2 * 60 * 60 * 1000;
const LOCAL_CREATE_DURATION_MS = 4 * 60 * 60 * 1000;

const BOARD_STYLES = `
  :host {
    box-sizing: border-box;
    display: block;
    color: var(--harmonogram-board-fg, #0f172a);
    font-family: var(--harmonogram-board-font, "Segoe UI", "Avenir Next", "Helvetica Neue", Arial, sans-serif);
    line-height: 1.35;
    --harmonogram-board-lane-label-width: 11.5rem;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  [part='container'] {
    border: 1px solid var(--harmonogram-board-border, #b8c2cf);
    border-radius: 10px;
    background: var(--harmonogram-board-bg, #ffffff);
    display: grid;
    gap: 0.9rem;
    padding: 1.1rem;
  }

  [part='header'] {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  [part='title'] {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.3;
  }

  [part='mode'] {
    color: var(--harmonogram-board-muted, #334155);
    font-size: 0.92rem;
    margin: 0;
    text-transform: capitalize;
  }

  [part='summary'] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .summary-pill {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 999px;
    font-size: 0.82rem;
    line-height: 1.2;
    padding: 0.25rem 0.6rem;
  }

  [part='timeline'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 8px;
    overflow: hidden;
    background: var(--harmonogram-board-timeline-bg, #f8fafc);
  }

  [part='timeline-header'] {
    display: grid;
    border-bottom: 1px solid var(--harmonogram-board-border, #d0d7de);
  }

  [part='timeline-tick'] {
    border-left: 1px solid var(--harmonogram-board-border, #d0d7de);
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.82rem;
    line-height: 1.2;
    padding: 0.5rem 0.55rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  [part='timeline-tick']:first-child {
    border-left: none;
  }

  [part='timeline-markers'] {
    min-height: 1.9rem;
    position: relative;
    padding: 0.24rem 0.3rem 0.3rem;
  }

  [part='timeline-marker'] {
    background: var(--harmonogram-marker-medium, #f59e0b);
    border-radius: 999px;
    color: #111827;
    font-size: 0.76rem;
    line-height: 1.2;
    overflow: hidden;
    padding: 0.2rem 0.4rem;
    position: absolute;
    top: 0.23rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  [part='timeline-marker'][data-severity='low'] {
    background: var(--harmonogram-marker-low, #9ca3af);
    color: #111827;
  }

  [part='timeline-marker'][data-severity='high'] {
    background: var(--harmonogram-marker-high, #fb923c);
    color: #111827;
  }

  [part='timeline-marker'][data-severity='critical'] {
    background: var(--harmonogram-marker-critical, #dc2626);
    color: #ffffff;
  }

  [part='timeline-empty'],
  [part='lane-empty'],
  [part='segment-empty'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.92rem;
    margin: 0;
    padding: 0.35rem 0.55rem;
  }

  [part='lanes'] {
    display: grid;
    gap: 0.65rem;
  }

  [part='dependency-overlay'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 8px;
    background: var(--harmonogram-board-overlay-bg, #fcfcfd);
    display: grid;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  [part='dependency-header'] {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  [part='dependency-title'] {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
  }

  [part='dependency-count'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.82rem;
  }

  [part='dependency-grid'] {
    --harmonogram-overlay-row-height: 36px;
    --harmonogram-overlay-row-gap: 8px;
    display: grid;
    gap: 0.65rem;
    grid-template-columns: minmax(0, var(--harmonogram-board-lane-label-width)) 1fr;
  }

  [part='dependency-labels'] {
    display: grid;
    gap: var(--harmonogram-overlay-row-gap);
    grid-auto-rows: var(--harmonogram-overlay-row-height);
  }

  [part='dependency-row-label'] {
    align-items: center;
    border-radius: 8px;
    color: var(--harmonogram-board-muted, #596272);
    display: flex;
    font-size: 0.84rem;
    line-height: 1.2;
    padding: 0 0.5rem;
    background: var(--harmonogram-board-track-bg, #f8fafc);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  [part='dependency-track'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 8px;
    background:
      linear-gradient(to bottom, rgba(148, 163, 184, 0.06), rgba(148, 163, 184, 0.06)),
      var(--harmonogram-board-track-bg, #f8fafc);
    overflow: hidden;
    position: relative;
  }

  [part='dependency-svg'] {
    display: block;
    height: 100%;
    width: 100%;
  }

  [part='dependency-guide'] {
    stroke: rgba(89, 98, 114, 0.18);
    stroke-width: 0.8;
    vector-effect: non-scaling-stroke;
  }

  [part='dependency-link'] {
    fill: none;
    stroke: var(--harmonogram-dependency-color, #0f766e);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
  }

  [part='dependency-link'][data-critical='true'] {
    stroke: var(--harmonogram-dependency-critical, #0f766e);
    stroke-width: 2.5;
  }

  [part='dependency-link'][data-satisfied='false'] {
    stroke: var(--harmonogram-dependency-violation, #dc2626);
    stroke-dasharray: 5 4;
  }

  [part='dependency-link'][data-selected='true'] {
    filter: drop-shadow(0 0 0.35rem rgba(15, 118, 110, 0.25));
    stroke-width: 3;
  }

  [part='dependency-hitbox'] {
    cursor: pointer;
    fill: none;
    stroke: transparent;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 12;
    vector-effect: non-scaling-stroke;
  }

  [part='dependency-node'] {
    fill: var(--harmonogram-board-bg, #ffffff);
    stroke: currentColor;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  [part='dependency-inspector'] {
    align-items: center;
    border-top: 1px solid var(--harmonogram-board-border, #d0d7de);
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.65rem;
  }

  [part='dependency-inspector-title'] {
    font-size: 0.84rem;
    font-weight: 600;
  }

  [part='dependency-inspector-empty'],
  [part='dependency-empty'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.88rem;
    margin: 0;
  }

  [part='dependency-pill'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 999px;
    font-size: 0.82rem;
    line-height: 1.1;
    padding: 0.28rem 0.55rem;
  }

  [part='lane'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 8px;
    overflow: hidden;
    background: var(--harmonogram-board-lane-bg, #ffffff);
  }

  [part='lane-header'] {
    align-items: center;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--harmonogram-board-border, #d0d7de);
    background: var(--harmonogram-board-lane-header-bg, #f8fafc);
  }

  [part='lane-identity'] {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    min-width: 0;
  }

  [part='lane-label'] {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    min-width: 0;
  }

  [part='lane-count'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.8rem;
  }

  .lane-toggle {
    font-size: 0.8rem;
    line-height: 1.1;
    padding: 0.35rem 0.55rem;
  }

  [part='lane-grid'] {
    display: grid;
    gap: 0.35rem;
    padding: 0.45rem;
  }

  [part='lane-item'] {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: minmax(0, var(--harmonogram-board-lane-label-width)) 1fr;
    align-items: center;
  }

  [part='item-meta'] {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    min-width: 0;
    flex-wrap: wrap;
  }

  [part='item-actions'] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: flex-end;
  }

  [part='item-track'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 999px;
    min-height: 2.1rem;
    position: relative;
    background: var(--harmonogram-board-track-bg, #f8fafc);
    overflow: hidden;
  }

  [part='item-track'][data-selectable='true'] {
    cursor: pointer;
  }

  [part='item-track'][data-selectable='true']:hover {
    border-color: var(--harmonogram-board-accent, #0f766e);
  }

  [part='item-track'][data-selected='true'] {
    border-color: var(--harmonogram-board-accent, #0f766e);
    box-shadow: inset 0 0 0 1px rgba(15, 118, 110, 0.18);
  }

  [part='segment'] {
    border-radius: 999px;
    cursor: inherit;
    height: 1.25rem;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }

  [part='segment'][data-segment-kind='planned'] {
    background: var(--harmonogram-segment-planned, #0ea5e9);
  }

  [part='segment'][data-segment-kind='actual'] {
    background: var(--harmonogram-segment-actual, #22c55e);
  }

  [part='segment'][data-segment-kind='projected'] {
    background: var(--harmonogram-segment-projected, #9333ea);
  }

  [part='segment'][data-segment-kind='pause'] {
    background: var(--harmonogram-segment-pause, #9ca3af);
    border: 1px dashed var(--harmonogram-board-bg, #ffffff);
  }

  .item-select,
  .item-edit,
  .item-action,
  .action-button {
    appearance: none;
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 8px;
    background: #fff;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 0.88rem;
    line-height: 1.3;
    padding: 0.45rem 0.65rem;
  }

  .item-select {
    flex: 1 1 auto;
    min-width: 10rem;
    text-align: left;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .item-select[aria-pressed='true'] {
    border-color: var(--harmonogram-board-accent, #0f766e);
    color: var(--harmonogram-board-accent, #0f766e);
    font-weight: 600;
  }

  .item-edit[disabled],
  .item-action[disabled],
  .action-button[disabled] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  [part='actions'] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  @media (max-width: 900px) {
    [part='header'] {
      align-items: flex-start;
      flex-direction: column;
    }

    [part='dependency-grid'] {
      grid-template-columns: minmax(0, 1fr);
    }

    [part='lane-item'] {
      grid-template-columns: minmax(0, 1fr);
      align-items: stretch;
    }

    [part='item-meta'],
    [part='item-actions'] {
      justify-content: flex-start;
    }
  }

  @media (max-width: 640px) {
    [part='timeline-tick'] {
      white-space: normal;
      line-height: 1.25;
    }

    .item-select,
    .item-edit,
    .item-action,
    .action-button {
      width: 100%;
      text-align: left;
    }

    [part='item-actions'] {
      width: 100%;
    }
  }

  [part='announcer'] {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

export interface HarmonogramSelectEventDetail {
  itemId?: string;
  dependencyId?: string;
  selection: HarmonogramBoardSelection;
}

export interface HarmonogramHoverEventDetail {
  itemId?: string;
  dependencyId?: string;
  fromId?: string;
  toId?: string;
  relationship?: DependencyRelationship;
}

export interface HarmonogramRangeChangeEventDetail {
  previousRange: TimeRange | null;
  range: TimeRange;
  scale: TimelineScale;
  reason: 'shift-forward' | 'fit-plan';
}

export type HarmonogramEditAction = 'create' | 'update' | 'delete' | 'move' | 'resize' | 'split';
export type HarmonogramEditingMode = 'local' | 'controlled';

export interface HarmonogramEditRequestEventDetail {
  action: HarmonogramEditAction;
  itemId?: string;
  mode: HarmonogramEditingMode;
}

export interface HarmonogramActionEventDetail {
  action:
    | 'zoom-in'
    | 'zoom-out'
    | 'fit-to-range'
    | 'export-state'
    | 'export-json'
    | 'export-csv'
    | 'export-png'
    | 'focus-item'
    | 'undo'
    | 'redo';
  scale: TimelineScale;
  itemId?: string;
  state?: HarmonogramBoardStateSnapshot;
}

export interface HarmonogramBoardStateSnapshot {
  planId: string | null;
  view: HarmonogramBoardView;
  selection: HarmonogramBoardSelection;
  filters: HarmonogramBoardFilters;
  interactive: boolean;
  readonly: boolean;
  editingMode: HarmonogramEditingMode;
  history: {
    canUndo: boolean;
    canRedo: boolean;
    depth: number;
  };
}

function cloneRange(range: TimeRange): TimeRange {
  return {
    start: range.start,
    end: range.end,
  };
}

function shiftRangeForward(range: TimeRange): TimeRange | null {
  const startMs = Date.parse(range.start);
  const endMs = Date.parse(range.end);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }

  const durationMs = endMs - startMs;
  return {
    start: new Date(startMs + durationMs).toISOString(),
    end: new Date(endMs + durationMs).toISOString(),
  };
}

function normalizeScale(scale: TimelineScale | undefined): TimelineScale {
  if (!scale) {
    return DEFAULT_SCALE;
  }

  return TIMELINE_SCALES.includes(scale) ? scale : DEFAULT_SCALE;
}

function normalizeEditingMode(mode: string | null | undefined): HarmonogramEditingMode {
  if (mode === 'local' || mode === 'controlled') {
    return mode;
  }

  return DEFAULT_EDITING_MODE;
}

function uniqueSorted(values: string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const unique = [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
  if (unique.length === 0) {
    return undefined;
  }

  return unique.sort((left, right) => left.localeCompare(right));
}

function normalizeGroupBy(value: HarmonogramBoardGroupBy | string | undefined): HarmonogramBoardGroupBy | undefined {
  if (!value) {
    return undefined;
  }

  return BOARD_GROUPING_MODES.includes(value as HarmonogramBoardGroupBy)
    ? (value as HarmonogramBoardGroupBy)
    : undefined;
}

function normalizeFilters(filters: HarmonogramBoardFilters | null | undefined): HarmonogramBoardFilters | null {
  if (!filters) {
    return null;
  }

  const normalized: HarmonogramBoardFilters = {};
  const laneIds = uniqueSorted(filters.laneIds);
  const itemIds = uniqueSorted(filters.itemIds);
  const resourceIds = uniqueSorted(filters.resourceIds);
  const phases = uniqueSorted(filters.phases);
  const collapsedLaneIds = uniqueSorted(filters.collapsedLaneIds);
  const groupBy = normalizeGroupBy(filters.groupBy);
  const query = filters.query?.trim();
  const focusedItemId = filters.focusedItemId?.trim();

  if (laneIds) {
    normalized.laneIds = laneIds;
  }

  if (itemIds) {
    normalized.itemIds = itemIds;
  }

  if (resourceIds) {
    normalized.resourceIds = resourceIds;
  }

  if (phases) {
    normalized.phases = phases;
  }

  if (collapsedLaneIds) {
    normalized.collapsedLaneIds = collapsedLaneIds;
  }

  if (query && query.length > 0) {
    normalized.query = query;
  }

  if (focusedItemId && focusedItemId.length > 0) {
    normalized.focusedItemId = focusedItemId;
  }

  if (groupBy) {
    normalized.groupBy = groupBy;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function toTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function shiftIso(value: string, deltaMs: number): string {
  const timestamp = toTimestamp(value);

  if (timestamp === null) {
    return value;
  }

  return new Date(timestamp + deltaMs).toISOString();
}

function clonePlan(plan: Plan): Plan {
  if (typeof structuredClone === 'function') {
    return structuredClone(plan);
  }

  return JSON.parse(JSON.stringify(plan)) as Plan;
}

function nextScale(current: TimelineScale, direction: 'in' | 'out'): TimelineScale {
  const currentIndex = TIMELINE_SCALES.indexOf(current);
  const offset = direction === 'in' ? -1 : 1;
  const nextIndex = Math.min(TIMELINE_SCALES.length - 1, Math.max(0, currentIndex + offset));
  return TIMELINE_SCALES[nextIndex];
}

interface LocalEditResult {
  plan: Plan;
  selection: HarmonogramBoardSelection | null;
}

function createUniqueId(prefix: string, existingIds: Set<string>): string {
  let sequence = existingIds.size + 1;

  while (existingIds.has(`${prefix}-${sequence}`)) {
    sequence += 1;
  }

  return `${prefix}-${sequence}`;
}

function selectItem(itemId: string): HarmonogramBoardSelection {
  return { itemIds: [itemId] };
}

function applyLocalCreate(
  plan: Plan,
  selection: HarmonogramBoardSelection | null,
  viewRange: TimeRange | null,
): LocalEditResult | null {
  const selectedItemId = selection?.itemIds[0];
  const selectedItem = selectedItemId ? plan.items.find((item) => item.id === selectedItemId) : undefined;
  const laneIds = new Set(plan.lanes.map((lane) => lane.id));
  const laneId =
    selectedItem?.laneId ??
    (selection?.laneIds ?? []).find((candidateLaneId) => laneIds.has(candidateLaneId)) ??
    plan.lanes[0]?.id;

  if (!laneId) {
    return null;
  }

  const range = viewRange ?? plan.range;
  const startMs = toTimestamp(range.start);
  const endMs = toTimestamp(range.end);

  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }

  let nextEndMs = startMs + LOCAL_CREATE_DURATION_MS;
  if (nextEndMs > endMs) {
    nextEndMs = endMs;
  }

  if (nextEndMs <= startMs) {
    nextEndMs = startMs + LOCAL_CREATE_DURATION_MS;
  }

  const existingItemIds = new Set(plan.items.map((item) => item.id));
  const existingSegmentIds = new Set(plan.items.flatMap((item) => item.segments.map((segment) => segment.id)));
  const itemId = createUniqueId('local-item', existingItemIds);
  const segmentId = createUniqueId('local-segment', existingSegmentIds);
  const labelSuffix = itemId.split('-').pop() ?? 'new';

  const nextItem = {
    id: itemId,
    laneId,
    label: `Local item ${labelSuffix}`,
    kind: 'task',
    segments: [
      {
        id: segmentId,
        workItemId: itemId,
        start: new Date(startMs).toISOString(),
        end: new Date(nextEndMs).toISOString(),
        segmentKind: 'planned',
        locked: false,
      },
    ],
    resourceAssignments: [],
  } satisfies Plan['items'][number];

  const items = [...plan.items, nextItem].sort((left, right) => left.id.localeCompare(right.id));
  return {
    plan: {
      ...plan,
      items,
    },
    selection: selectItem(itemId),
  };
}

function applyLocalUpdate(plan: Plan, itemId: string): LocalEditResult | null {
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const item = plan.items[itemIndex];
  const editedSuffix = ' (edited)';
  const label = item.label.endsWith(editedSuffix) ? item.label : `${item.label}${editedSuffix}`;

  if (label === item.label) {
    return {
      plan,
      selection: selectItem(item.id),
    };
  }

  const items = [...plan.items];
  items[itemIndex] = {
    ...item,
    label,
  };

  return {
    plan: {
      ...plan,
      items,
    },
    selection: selectItem(item.id),
  };
}

function applyLocalMove(plan: Plan, itemId: string): LocalEditResult | null {
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const item = plan.items[itemIndex];
  if (item.segments.length === 0) {
    return null;
  }

  const items = [...plan.items];
  items[itemIndex] = {
    ...item,
    segments: item.segments.map((segment) => ({
      ...segment,
      start: shiftIso(segment.start, LOCAL_MOVE_DELTA_MS),
      end: shiftIso(segment.end, LOCAL_MOVE_DELTA_MS),
    })),
    baseline: item.baseline
      ? {
          start: shiftIso(item.baseline.start, LOCAL_MOVE_DELTA_MS),
          end: shiftIso(item.baseline.end, LOCAL_MOVE_DELTA_MS),
        }
      : undefined,
    actual: item.actual
      ? {
          start: shiftIso(item.actual.start, LOCAL_MOVE_DELTA_MS),
          end: shiftIso(item.actual.end, LOCAL_MOVE_DELTA_MS),
        }
      : undefined,
    projection: item.projection
      ? {
          start: shiftIso(item.projection.start, LOCAL_MOVE_DELTA_MS),
          end: shiftIso(item.projection.end, LOCAL_MOVE_DELTA_MS),
        }
      : undefined,
  };

  return {
    plan: {
      ...plan,
      items,
    },
    selection: selectItem(item.id),
  };
}

function applyLocalResize(plan: Plan, itemId: string): LocalEditResult | null {
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const item = plan.items[itemIndex];
  if (item.segments.length === 0) {
    return null;
  }

  let segmentIndex = -1;
  let latestEnd = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < item.segments.length; index += 1) {
    const segment = item.segments[index];
    const endMs = toTimestamp(segment.end);

    if (endMs !== null && endMs > latestEnd) {
      latestEnd = endMs;
      segmentIndex = index;
    }
  }

  if (segmentIndex === -1) {
    return null;
  }

  const segment = item.segments[segmentIndex];
  const startMs = toTimestamp(segment.start);
  const endMs = toTimestamp(segment.end);

  if (startMs === null || endMs === null) {
    return null;
  }

  const nextEndMs = Math.max(startMs + 1, endMs + LOCAL_RESIZE_DELTA_MS);
  const segments = [...item.segments];
  segments[segmentIndex] = {
    ...segment,
    end: new Date(nextEndMs).toISOString(),
  };

  const items = [...plan.items];
  items[itemIndex] = {
    ...item,
    segments,
  };

  return {
    plan: {
      ...plan,
      items,
    },
    selection: selectItem(item.id),
  };
}

function applyLocalSplit(plan: Plan, itemId: string): LocalEditResult | null {
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const item = plan.items[itemIndex];
  if (item.segments.length === 0) {
    return null;
  }

  let splitIndex = -1;
  let splitPointMs = 0;

  for (let index = 0; index < item.segments.length; index += 1) {
    const segment = item.segments[index];
    const startMs = toTimestamp(segment.start);
    const endMs = toTimestamp(segment.end);

    if (startMs === null || endMs === null) {
      continue;
    }

    if (endMs - startMs < 2) {
      continue;
    }

    splitIndex = index;
    splitPointMs = startMs + Math.floor((endMs - startMs) / 2);
    break;
  }

  if (splitIndex === -1) {
    return null;
  }

  const segment = item.segments[splitIndex];
  const startMs = toTimestamp(segment.start);
  const endMs = toTimestamp(segment.end);

  if (startMs === null || endMs === null || splitPointMs <= startMs || splitPointMs >= endMs) {
    return null;
  }

  const segmentIds = new Set(item.segments.map((candidate) => candidate.id));
  const firstId = createUniqueId(`${segment.id}-part`, segmentIds);
  segmentIds.add(firstId);
  const secondId = createUniqueId(`${segment.id}-part`, segmentIds);

  const segments = [...item.segments];
  segments.splice(
    splitIndex,
    1,
    {
      ...segment,
      id: firstId,
      end: new Date(splitPointMs).toISOString(),
    },
    {
      ...segment,
      id: secondId,
      start: new Date(splitPointMs).toISOString(),
    },
  );

  const items = [...plan.items];
  items[itemIndex] = {
    ...item,
    segments,
  };

  return {
    plan: {
      ...plan,
      items,
    },
    selection: selectItem(item.id),
  };
}

function applyLocalDelete(plan: Plan, itemId: string): LocalEditResult | null {
  const itemIndex = plan.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return null;
  }

  const items = plan.items.filter((item) => item.id !== itemId);
  const dependencies = plan.dependencies.filter((dependency) => dependency.fromId !== itemId && dependency.toId !== itemId);

  return {
    plan: {
      ...plan,
      items,
      dependencies,
    },
    selection: null,
  };
}

export class HarmonogramBoard extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['interactive', 'readonly', 'editing-mode'];
  }

  private _plan: Plan | null = null;
  private _localPlan: Plan | null = null;
  private _view: HarmonogramBoardView | null = null;
  private _selection: HarmonogramBoardSelection | null = null;
  private _filters: HarmonogramBoardFilters | null = null;
  private _interactive = false;
  private _readonly = false;
  private _editingMode: HarmonogramEditingMode = DEFAULT_EDITING_MODE;
  private _historyPast: Plan[] = [];
  private _historyFuture: Plan[] = [];
  private _announcement = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    const nextValue = newValue !== null;

    if (name === 'interactive' && this._interactive !== nextValue) {
      this._interactive = nextValue;
      this.render();
      return;
    }

    if (name === 'readonly' && this._readonly !== nextValue) {
      this._readonly = nextValue;
      this.render();
      return;
    }

    if (name === 'editing-mode') {
      const nextMode = normalizeEditingMode(newValue);
      if (this._editingMode !== nextMode) {
        this._editingMode = nextMode;
        this.resetLocalSession();
        this.render();
      }
    }
  }

  get plan(): Plan | null {
    return this._plan;
  }

  set plan(value: Plan | null) {
    this._plan = value;
    this.resetLocalSession();
    this.render();
  }

  get view(): HarmonogramBoardView | null {
    return this._view;
  }

  set view(value: HarmonogramBoardView | null) {
    this._view = value;
    this.render();
  }

  get selection(): HarmonogramBoardSelection | null {
    return this._selection;
  }

  set selection(value: HarmonogramBoardSelection | null) {
    this._selection = value;
    this.render();
  }

  get filters(): HarmonogramBoardFilters | null {
    return this._filters;
  }

  set filters(value: HarmonogramBoardFilters | null) {
    this._filters = normalizeFilters(value);
    this.render();
  }

  get interactive(): boolean {
    return this._interactive;
  }

  set interactive(value: boolean) {
    const nextValue = Boolean(value);

    if (this._interactive === nextValue) {
      return;
    }

    this._interactive = nextValue;
    this.reflectBooleanAttribute('interactive', nextValue);
    this.render();
  }

  get readonly(): boolean {
    return this._readonly;
  }

  set readonly(value: boolean) {
    const nextValue = Boolean(value);

    if (this._readonly === nextValue) {
      return;
    }

    this._readonly = nextValue;
    this.reflectBooleanAttribute('readonly', nextValue);
    this.render();
  }

  get editingMode(): HarmonogramEditingMode {
    return this._editingMode;
  }

  set editingMode(value: HarmonogramEditingMode) {
    const nextMode = normalizeEditingMode(value);

    if (this._editingMode === nextMode) {
      return;
    }

    this._editingMode = nextMode;
    this.reflectEnumAttribute('editing-mode', nextMode);
    this.resetLocalSession();
    this.render();
  }

  zoomIn(): void {
    this.setScale(nextScale(this.currentScale, 'in'));
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'zoom-in',
      scale: this.currentScale,
    });
  }

  zoomOut(): void {
    this.setScale(nextScale(this.currentScale, 'out'));
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'zoom-out',
      scale: this.currentScale,
    });
  }

  fitToRange(): void {
    const plan = this.activePlan;
    if (!plan) {
      return;
    }

    const previousRange = this._view?.range ? cloneRange(this._view.range) : null;
    const nextRange = cloneRange(plan.range);
    this._view = {
      ...(this._view ?? {}),
      range: nextRange,
    };

    this.dispatchBoardEvent<HarmonogramRangeChangeEventDetail>('harmonogram-range-change', {
      previousRange,
      range: nextRange,
      scale: this.currentScale,
      reason: 'fit-plan',
    });
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'fit-to-range',
      scale: this.currentScale,
    });
    this.announce('Range reset to plan bounds.');
    this.render();
  }

  setGroupBy(groupBy: HarmonogramBoardGroupBy): void {
    const normalizedGroupBy = normalizeGroupBy(groupBy);

    if (!normalizedGroupBy) {
      return;
    }

    this.updateFilters({
      groupBy: normalizedGroupBy,
      collapsedLaneIds: undefined,
    });
  }

  setSearchQuery(query: string): void {
    this.updateFilters({
      query,
    });
  }

  clearFocus(): void {
    if (!this._filters?.focusedItemId) {
      return;
    }

    this.announce('Focus cleared.');
    this.updateFilters({
      focusedItemId: undefined,
    });
  }

  clearFilters(): void {
    if (!this._filters) {
      return;
    }

    this._filters = null;
    this.announce('Filters cleared.');
    this.render();
  }

  toggleLaneCollapse(laneId: string): void {
    const viewModel = this.buildViewModel();
    const lane = viewModel.lanes.find((candidateLane) => candidateLane.id === laneId);

    if (!lane || !lane.collapsible) {
      return;
    }

    const collapsedLaneIds = new Set(this._filters?.collapsedLaneIds ?? []);

    if (collapsedLaneIds.has(laneId)) {
      collapsedLaneIds.delete(laneId);
      this.announce(`Expanded ${lane.label}.`);
    } else {
      collapsedLaneIds.add(laneId);
      this.announce(`Collapsed ${lane.label}.`);
    }

    this.updateFilters({
      collapsedLaneIds: [...collapsedLaneIds],
    });
  }

  focusItem(itemId: string): void {
    const plan = this.activePlan;
    if (!plan || !plan.items.some((item) => item.id === itemId)) {
      return;
    }

    const selection: HarmonogramBoardSelection = { itemIds: [itemId] };
    this._selection = selection;
    this._filters = normalizeFilters({
      ...(this._filters ?? {}),
      focusedItemId: itemId,
    });

    this.dispatchBoardEvent<HarmonogramSelectEventDetail>('harmonogram-select', {
      itemId,
      selection,
    });
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'focus-item',
      scale: this.currentScale,
      itemId,
    });
    this.announce(`Focused item ${itemId}.`);
    this.render();
    this.focusItemButton(itemId);
  }

  exportState(): HarmonogramBoardStateSnapshot {
    const snapshot = this.getStateSnapshot();
    this.publishAction('export-state', 'Exported board state.', {
      state: snapshot,
    });
    return snapshot;
  }

  exportJson(): string {
    const payload = {
      plan: this.activePlan,
      state: this.getStateSnapshot(),
    };
    const output = JSON.stringify(payload, null, 2);

    this.publishAction('export-json', 'Exported JSON payload.');
    return output;
  }

  exportCsv(): string {
    const plan = this.activePlan;
    const header = 'itemId,laneId,label,segmentId,segmentKind,start,end';

    if (!plan) {
      this.publishAction('export-csv', 'Exported CSV payload.');
      return `${header}\n`;
    }

    const rows: string[] = [header];

    for (const item of plan.items) {
      if (item.segments.length === 0) {
        rows.push(
          [
            item.id,
            item.laneId,
            item.label,
            '',
            '',
            '',
            '',
          ]
            .map((value) => this.escapeCsvValue(value))
            .join(','),
        );
        continue;
      }

      for (const segment of item.segments) {
        rows.push(
          [
            item.id,
            item.laneId,
            item.label,
            segment.id,
            segment.segmentKind,
            segment.start,
            segment.end,
          ]
            .map((value) => this.escapeCsvValue(value))
            .join(','),
        );
      }
    }

    this.publishAction('export-csv', 'Exported CSV payload.');
    return `${rows.join('\n')}\n`;
  }

  exportPng(): string | null {
    const viewModel = this.buildViewModel();
    const dataUrl = this.buildPngDataUrl(viewModel);

    this.publishAction('export-png', dataUrl ? 'Exported PNG snapshot.' : 'PNG export unavailable.');

    return dataUrl;
  }

  private get currentScale(): TimelineScale {
    return normalizeScale(this._view?.scale);
  }

  private get canEdit(): boolean {
    return this._interactive && !this._readonly;
  }

  private get activePlan(): Plan | null {
    if (this._editingMode === 'local') {
      return this._localPlan ?? this._plan;
    }

    return this._plan;
  }

  private get canUseLocalHistory(): boolean {
    return this._editingMode === 'local' && this.canEdit;
  }

  private buildViewModel(): HarmonogramBoardViewModel {
    return buildBoardViewModel({
      plan: this.activePlan,
      view: this._view,
      selection: this._selection,
      filters: this._filters,
      interactive: this._interactive,
      readonly: this._readonly,
    });
  }

  private updateFilters(filtersPatch: Partial<HarmonogramBoardFilters>): void {
    this._filters = normalizeFilters({
      ...(this._filters ?? {}),
      ...filtersPatch,
    });
    this.render();
  }

  private announce(message: string): void {
    this._announcement = message;
  }

  private publishAction(
    action: HarmonogramActionEventDetail['action'],
    announcement: string,
    details: Pick<HarmonogramActionEventDetail, 'itemId' | 'state'> = {},
  ): void {
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action,
      scale: this.currentScale,
      ...details,
    });
    this.announce(announcement);
    this.render();
  }

  private focusItemButton(itemId: string): void {
    const buttons = this.shadowRoot?.querySelectorAll<HTMLButtonElement>('[part="item-select"]');
    if (!buttons) {
      return;
    }

    for (const button of buttons) {
      if (button.dataset.itemId === itemId) {
        button.focus();
        return;
      }
    }
  }

  private getFirstSelectedItemId(viewModel: HarmonogramBoardViewModel): string | null {
    const selectedItemId = this._selection?.itemIds[0];

    if (!selectedItemId) {
      return null;
    }

    const visibleItemIds = new Set(viewModel.lanes.flatMap((lane) => lane.items.map((item) => item.id)));
    return visibleItemIds.has(selectedItemId) ? selectedItemId : null;
  }

  private navigateSelection(viewModel: HarmonogramBoardViewModel, direction: 'next' | 'previous' | 'first' | 'last'): void {
    const orderedItemIds = viewModel.lanes.flatMap((lane) => lane.items.map((item) => item.id));

    if (orderedItemIds.length === 0) {
      return;
    }

    const currentItemId = this.getFirstSelectedItemId(viewModel);
    const currentIndex = currentItemId ? orderedItemIds.indexOf(currentItemId) : -1;
    let nextIndex = 0;

    if (direction === 'next') {
      nextIndex = currentIndex >= 0 ? (currentIndex + 1) % orderedItemIds.length : 0;
    } else if (direction === 'previous') {
      nextIndex = currentIndex >= 0 ? (currentIndex - 1 + orderedItemIds.length) % orderedItemIds.length : orderedItemIds.length - 1;
    } else if (direction === 'last') {
      nextIndex = orderedItemIds.length - 1;
    }

    const nextItemId = orderedItemIds[nextIndex];
    this.updateSelection(nextItemId);
    this.focusItemButton(nextItemId);
  }

  private handleBoardKeydown(event: KeyboardEvent, viewModel: HarmonogramBoardViewModel): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.navigateSelection(viewModel, 'next');
        return;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        this.navigateSelection(viewModel, 'previous');
        return;
      case 'Home':
        event.preventDefault();
        this.navigateSelection(viewModel, 'first');
        return;
      case 'End':
        event.preventDefault();
        this.navigateSelection(viewModel, 'last');
        return;
      case 'e':
      case 'E': {
        const selectedItemId = this.getFirstSelectedItemId(viewModel);

        if (this.canEdit && selectedItemId) {
          event.preventDefault();
          this.requestEdit('update', selectedItemId);
        }
        return;
      }
      case 'Delete':
      case 'Backspace': {
        const selectedItemId = this.getFirstSelectedItemId(viewModel);

        if (this.canEdit && selectedItemId) {
          event.preventDefault();
          this.requestEdit('delete', selectedItemId);
        }
        return;
      }
      case 'f':
      case 'F': {
        const selectedItemId = this.getFirstSelectedItemId(viewModel);

        if (selectedItemId) {
          event.preventDefault();
          this.focusItem(selectedItemId);
        }
        return;
      }
      case 'Escape':
        if (this._filters?.focusedItemId) {
          event.preventDefault();
          this.clearFocus();
        }
        return;
      default:
        return;
    }
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""');

    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }

    return escaped;
  }

  private buildPngDataUrl(viewModel: HarmonogramBoardViewModel): string | null {
    const canvas = document.createElement('canvas');
    const width = 1400;
    const headerHeight = 64;
    const laneHeight = 46;
    const laneGap = 10;
    const maxLanes = 24;
    const laneCount = Math.min(maxLanes, viewModel.lanes.length);
    const height = Math.max(220, headerHeight + 24 + laneCount * (laneHeight + laneGap));

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#0f172a';
    context.font = '600 26px system-ui, sans-serif';
    context.fillText(viewModel.title, 24, 38);

    context.fillStyle = '#475569';
    context.font = '500 14px system-ui, sans-serif';
    context.fillText(`Scale: ${viewModel.scale}  Group: ${viewModel.groupBy}  Items: ${viewModel.visibleItemCount}`, 24, 60);

    const laneLabelWidth = 280;
    const timelineX = laneLabelWidth + 30;
    const timelineWidth = width - timelineX - 24;
    let currentY = headerHeight + 20;

    const drawSegments = (segments: HarmonogramLaneItemViewModel['segments'], top: number): void => {
      for (const segment of segments) {
        context.fillStyle =
          segment.kind === 'actual'
            ? '#22c55e'
            : segment.kind === 'projected'
              ? '#9333ea'
              : segment.kind === 'pause'
                ? '#9ca3af'
                : '#0ea5e9';

        const startX = timelineX + (timelineWidth * segment.startPercent) / 100;
        const segmentWidth = Math.max(2, (timelineWidth * segment.widthPercent) / 100);
        context.fillRect(startX, top, segmentWidth, 8);
      }
    };

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      const lane = viewModel.lanes[laneIndex];
      context.fillStyle = '#0f172a';
      context.font = '600 13px system-ui, sans-serif';
      context.fillText(lane.label, 24 + lane.depth * 14, currentY + 14);

      context.fillStyle = '#94a3b8';
      context.font = '500 11px system-ui, sans-serif';
      context.fillText(`${lane.itemCount} item${lane.itemCount === 1 ? '' : 's'}`, 24 + lane.depth * 14, currentY + 30);

      context.strokeStyle = '#cbd5e1';
      context.strokeRect(timelineX, currentY, timelineWidth, laneHeight);

      if (!lane.collapsed) {
        const previewItems = lane.items.slice(0, 2);

        for (let itemIndex = 0; itemIndex < previewItems.length; itemIndex += 1) {
          const item = previewItems[itemIndex];
          drawSegments(item.segments, currentY + 8 + itemIndex * 14);
        }
      }

      currentY += laneHeight + laneGap;
    }

    return canvas.toDataURL('image/png');
  }

  private setScale(scale: TimelineScale): void {
    this._view = {
      ...(this._view ?? {}),
      scale,
    };
    this.render();
  }

  private reflectBooleanAttribute(name: string, value: boolean): void {
    const hasAttribute = this.hasAttribute(name);

    if (value && !hasAttribute) {
      this.setAttribute(name, '');
      return;
    }

    if (!value && hasAttribute) {
      this.removeAttribute(name);
    }
  }

  private reflectEnumAttribute(name: string, value: string): void {
    if (this.getAttribute(name) !== value) {
      this.setAttribute(name, value);
    }
  }

  private resetLocalSession(): void {
    if (this._editingMode === 'local' && this._plan) {
      this._localPlan = clonePlan(this._plan);
    } else {
      this._localPlan = null;
    }

    this._historyPast = [];
    this._historyFuture = [];
    this._selection = this.sanitizeSelection(this._selection, this.activePlan);
  }

  private dispatchBoardEvent<TDetail>(type: string, detail: TDetail): void {
    this.dispatchEvent(
      new CustomEvent<TDetail>(type, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateSelection(itemId: string): HarmonogramBoardSelection {
    const selection: HarmonogramBoardSelection = { itemIds: [itemId] };
    this._selection = selection;
    const itemLabel = this.activePlan?.items.find((item) => item.id === itemId)?.label ?? itemId;
    this.announce(`Selected item ${itemLabel}.`);
    this.dispatchBoardEvent<HarmonogramSelectEventDetail>('harmonogram-select', {
      itemId,
      selection,
    });
    this.render();
    return selection;
  }

  private updateDependencySelection(dependency: HarmonogramDependencyPathViewModel): HarmonogramBoardSelection {
    const selection: HarmonogramBoardSelection = {
      itemIds: [dependency.fromId, dependency.toId],
      dependencyIds: [dependency.id],
    };
    this._selection = selection;
    this.announce(`Selected dependency ${dependency.fromLabel} to ${dependency.toLabel}.`);
    this.dispatchBoardEvent<HarmonogramSelectEventDetail>('harmonogram-select', {
      itemId: dependency.toId,
      dependencyId: dependency.id,
      selection,
    });
    this.render();
    return selection;
  }

  private requestEdit(action: HarmonogramEditAction, itemId?: string): void {
    if (!this.canEdit) {
      return;
    }

    this.dispatchBoardEvent<HarmonogramEditRequestEventDetail>('harmonogram-edit-request', {
      action,
      itemId,
      mode: this._editingMode,
    });
    this.announce(
      itemId ? `Requested ${action} for item ${itemId} in ${this._editingMode} mode.` : `Requested ${action} action.`,
    );

    if (this._editingMode === 'local') {
      this.applyLocalEdit(action, itemId);
    }
  }

  private shiftRange(): void {
    const currentRange = this._view?.range ?? this.activePlan?.range;

    if (!currentRange) {
      return;
    }

    const nextRange = shiftRangeForward(currentRange);

    if (!nextRange) {
      return;
    }

    this._view = {
      ...(this._view ?? {}),
      range: nextRange,
    };

    this.dispatchBoardEvent<HarmonogramRangeChangeEventDetail>('harmonogram-range-change', {
      previousRange: cloneRange(currentRange),
      range: nextRange,
      scale: this.currentScale,
      reason: 'shift-forward',
    });
    this.announce('Range shifted forward.');
    this.render();
  }

  private getStateSnapshot(): HarmonogramBoardStateSnapshot {
    const plan = this.activePlan;
    return {
      planId: plan?.id ?? null,
      view: {
        scale: this.currentScale,
        range: this._view?.range ? cloneRange(this._view.range) : undefined,
      },
      selection: {
        itemIds: [...(this._selection?.itemIds ?? [])],
        laneIds: this._selection?.laneIds ? [...this._selection.laneIds] : undefined,
        dependencyIds: this._selection?.dependencyIds ? [...this._selection.dependencyIds] : undefined,
      },
      filters: {
        laneIds: this._filters?.laneIds ? [...this._filters.laneIds] : undefined,
        itemIds: this._filters?.itemIds ? [...this._filters.itemIds] : undefined,
        resourceIds: this._filters?.resourceIds ? [...this._filters.resourceIds] : undefined,
        phases: this._filters?.phases ? [...this._filters.phases] : undefined,
        collapsedLaneIds: this._filters?.collapsedLaneIds ? [...this._filters.collapsedLaneIds] : undefined,
        query: this._filters?.query,
        focusedItemId: this._filters?.focusedItemId,
        groupBy: this._filters?.groupBy,
      },
      interactive: this._interactive,
      readonly: this._readonly,
      editingMode: this._editingMode,
      history: {
        canUndo: this._historyPast.length > 0,
        canRedo: this._historyFuture.length > 0,
        depth: this._historyPast.length,
      },
    };
  }

  private sanitizeSelection(
    selection: HarmonogramBoardSelection | null,
    plan: Plan | null,
  ): HarmonogramBoardSelection | null {
    if (!selection || !plan) {
      return null;
    }

    const itemIds = new Set(plan.items.map((item) => item.id));
    const laneIds = new Set(plan.lanes.map((lane) => lane.id));
    const dependencyIds = new Set(plan.dependencies.map((dependency) => dependency.id));

    const nextItemIds = selection.itemIds.filter((itemId) => itemIds.has(itemId));
    const nextLaneIds = (selection.laneIds ?? []).filter((laneId) => laneIds.has(laneId));
    const nextDependencyIds = (selection.dependencyIds ?? []).filter((dependencyId) =>
      dependencyIds.has(dependencyId),
    );

    if (nextItemIds.length === 0 && nextLaneIds.length === 0 && nextDependencyIds.length === 0) {
      return null;
    }

    return {
      itemIds: nextItemIds,
      laneIds: nextLaneIds.length > 0 ? nextLaneIds : undefined,
      dependencyIds: nextDependencyIds.length > 0 ? nextDependencyIds : undefined,
    };
  }

  private pushHistorySnapshot(plan: Plan): void {
    this._historyPast.push(clonePlan(plan));
    if (this._historyPast.length > LOCAL_HISTORY_LIMIT) {
      this._historyPast.shift();
    }
    this._historyFuture = [];
  }

  private mutateLocalPlan(plan: Plan, action: HarmonogramEditAction, itemId?: string): LocalEditResult | null {
    switch (action) {
      case 'create':
        return applyLocalCreate(plan, this._selection, this._view?.range ?? plan.range);
      case 'update':
        return itemId ? applyLocalUpdate(plan, itemId) : null;
      case 'move':
        return itemId ? applyLocalMove(plan, itemId) : null;
      case 'resize':
        return itemId ? applyLocalResize(plan, itemId) : null;
      case 'split':
        return itemId ? applyLocalSplit(plan, itemId) : null;
      case 'delete':
        return itemId ? applyLocalDelete(plan, itemId) : null;
      default:
        return null;
    }
  }

  private applyLocalEdit(action: HarmonogramEditAction, itemId?: string): void {
    const plan = this.activePlan;
    if (!plan) {
      return;
    }

    const result = this.mutateLocalPlan(plan, action, itemId);
    if (!result) {
      return;
    }

    if (result.plan !== plan) {
      this.pushHistorySnapshot(plan);
      this._localPlan = result.plan;
    }

    const nextSelection = result.selection ?? this._selection;
    this._selection = this.sanitizeSelection(nextSelection, this.activePlan);
    this.render();
  }

  private undoLocalEdit(): void {
    if (!this.canUseLocalHistory || this._historyPast.length === 0 || !this.activePlan) {
      return;
    }

    const previousPlan = this._historyPast.pop();
    if (!previousPlan) {
      return;
    }

    this._historyFuture.push(clonePlan(this.activePlan));
    this._localPlan = previousPlan;
    this._selection = this.sanitizeSelection(this._selection, this._localPlan);
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'undo',
      scale: this.currentScale,
    });
    this.announce('Undo applied.');
    this.render();
  }

  private redoLocalEdit(): void {
    if (!this.canUseLocalHistory || this._historyFuture.length === 0 || !this.activePlan) {
      return;
    }

    const nextPlan = this._historyFuture.pop();
    if (!nextPlan) {
      return;
    }

    this._historyPast.push(clonePlan(this.activePlan));
    this._localPlan = nextPlan;
    this._selection = this.sanitizeSelection(this._selection, this._localPlan);
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'redo',
      scale: this.currentScale,
    });
    this.announce('Redo applied.');
    this.render();
  }

  private createTimeline(viewModel: HarmonogramBoardViewModel): HTMLElement {
    const timeline = document.createElement('section');
    timeline.setAttribute('part', 'timeline');
    timeline.setAttribute('role', 'region');
    timeline.setAttribute('aria-label', 'Timeline');

    if (!viewModel.range || viewModel.timelineTicks.length === 0) {
      const empty = document.createElement('p');
      empty.setAttribute('part', 'timeline-empty');
      empty.textContent = 'Timeline range unavailable.';
      timeline.append(empty);
      return timeline;
    }

    const header = document.createElement('div');
    header.setAttribute('part', 'timeline-header');
    header.style.gridTemplateColumns = `repeat(${viewModel.timelineTicks.length}, minmax(0, 1fr))`;

    for (const tick of viewModel.timelineTicks) {
      const tickEl = document.createElement('div');
      tickEl.setAttribute('part', 'timeline-tick');
      tickEl.textContent = tick.label;
      tickEl.title = `${tick.start} -> ${tick.end}`;
      header.append(tickEl);
    }

    const markerRail = document.createElement('div');
    markerRail.setAttribute('part', 'timeline-markers');

    if (viewModel.timelineMarkers.length === 0) {
      const emptyMarker = document.createElement('p');
      emptyMarker.setAttribute('part', 'timeline-empty');
      emptyMarker.textContent = 'No markers in view.';
      markerRail.append(emptyMarker);
    } else {
      for (const marker of viewModel.timelineMarkers) {
        const markerEl = document.createElement('span');
        markerEl.setAttribute('part', 'timeline-marker');
        markerEl.dataset.severity = marker.severity;
        markerEl.style.left = `${marker.startPercent}%`;
        markerEl.style.width = `${marker.widthPercent}%`;
        markerEl.textContent = marker.label;
        markerEl.title = `${marker.label} (${marker.severity})`;
        markerRail.append(markerEl);
      }
    }

    timeline.append(header, markerRail);
    return timeline;
  }

  private createSvgElement<K extends keyof SVGElementTagNameMap>(tagName: K): SVGElementTagNameMap[K] {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }

  private createDependencyOverlay(viewModel: HarmonogramBoardViewModel): HTMLElement {
    const overlay = document.createElement('section');
    overlay.setAttribute('part', 'dependency-overlay');
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Dependency relationships');

    const header = document.createElement('header');
    header.setAttribute('part', 'dependency-header');

    const title = document.createElement('h3');
    title.setAttribute('part', 'dependency-title');
    title.textContent = 'Dependencies';

    const count = document.createElement('span');
    count.setAttribute('part', 'dependency-count');
    count.textContent = `${viewModel.dependencyOverlay.paths.length} visible`;

    header.append(title, count);
    overlay.append(header);

    if (viewModel.dependencyOverlay.paths.length === 0) {
      const empty = document.createElement('p');
      empty.setAttribute('part', 'dependency-empty');
      empty.textContent = 'No visible dependencies in the current view.';
      overlay.append(empty);
      return overlay;
    }

    const grid = document.createElement('div');
    grid.setAttribute('part', 'dependency-grid');
    grid.style.setProperty('--harmonogram-overlay-row-height', `${viewModel.dependencyOverlay.rowHeightPx}px`);
    grid.style.setProperty('--harmonogram-overlay-row-gap', `${viewModel.dependencyOverlay.rowGapPx}px`);

    const labels = document.createElement('div');
    labels.setAttribute('part', 'dependency-labels');

    for (const row of viewModel.dependencyOverlay.rows) {
      const label = document.createElement('div');
      label.setAttribute('part', 'dependency-row-label');
      label.dataset.itemId = row.itemId;
      label.textContent = `${row.laneLabel}: ${row.itemLabel}`;
      label.title = `${row.laneLabel} -> ${row.itemLabel}`;
      labels.append(label);
    }

    const track = document.createElement('div');
    track.setAttribute('part', 'dependency-track');
    track.style.height = `${viewModel.dependencyOverlay.heightPx}px`;

    const svg = this.createSvgElement('svg');
    svg.setAttribute('part', 'dependency-svg');
    svg.setAttribute('viewBox', `0 0 100 ${viewModel.dependencyOverlay.heightPx}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    for (let index = 1; index < viewModel.timelineTicks.length; index += 1) {
      const guide = this.createSvgElement('line');
      const x = (index / viewModel.timelineTicks.length) * 100;
      guide.setAttribute('part', 'dependency-guide');
      guide.setAttribute('x1', String(x));
      guide.setAttribute('x2', String(x));
      guide.setAttribute('y1', '0');
      guide.setAttribute('y2', String(viewModel.dependencyOverlay.heightPx));
      svg.append(guide);
    }

    for (const row of viewModel.dependencyOverlay.rows) {
      const guide = this.createSvgElement('line');
      guide.setAttribute('part', 'dependency-guide');
      guide.setAttribute('x1', '0');
      guide.setAttribute('x2', '100');
      guide.setAttribute('y1', String(row.centerY));
      guide.setAttribute('y2', String(row.centerY));
      svg.append(guide);
    }

    for (const dependency of viewModel.dependencyOverlay.paths) {
      const group = this.createSvgElement('g');
      group.dataset.dependencyId = dependency.id;

      const visiblePath = this.createSvgElement('path');
      visiblePath.setAttribute('part', 'dependency-link');
      visiblePath.dataset.relationship = dependency.relationship;
      visiblePath.dataset.critical = String(dependency.critical);
      visiblePath.dataset.satisfied = String(dependency.satisfied);
      visiblePath.dataset.selected = String(dependency.selected);
      visiblePath.setAttribute('d', dependency.path);

      const hitbox = this.createSvgElement('path');
      hitbox.setAttribute('part', 'dependency-hitbox');
      hitbox.dataset.dependencyId = dependency.id;
      hitbox.setAttribute('d', dependency.path);
      hitbox.addEventListener('mouseenter', () => {
        this.dispatchBoardEvent<HarmonogramHoverEventDetail>('harmonogram-hover', {
          dependencyId: dependency.id,
          fromId: dependency.fromId,
          toId: dependency.toId,
          relationship: dependency.relationship,
        });
      });
      hitbox.addEventListener('click', () => {
        this.updateDependencySelection(dependency);
      });

      const startNode = this.createSvgElement('circle');
      startNode.setAttribute('part', 'dependency-node');
      startNode.dataset.selected = String(dependency.selected);
      startNode.setAttribute('cx', String(dependency.startPercent));
      startNode.setAttribute('cy', String(dependency.startY));
      startNode.setAttribute('r', dependency.selected ? '3.5' : '2.5');

      const endNode = this.createSvgElement('circle');
      endNode.setAttribute('part', 'dependency-node');
      endNode.dataset.selected = String(dependency.selected);
      endNode.setAttribute('cx', String(dependency.endPercent));
      endNode.setAttribute('cy', String(dependency.endY));
      endNode.setAttribute('r', dependency.selected ? '3.5' : '2.5');

      const tooltip = this.createSvgElement('title');
      tooltip.textContent = `${dependency.fromLabel} -> ${dependency.toLabel} (${dependency.relationship})`;

      group.append(visiblePath, hitbox, startNode, endNode, tooltip);
      svg.append(group);
    }

    track.append(svg);
    grid.append(labels, track);
    overlay.append(grid);

    const inspector = document.createElement('div');
    inspector.setAttribute('part', 'dependency-inspector');

    if (!viewModel.dependencyOverlay.inspection) {
      const empty = document.createElement('p');
      empty.setAttribute('part', 'dependency-inspector-empty');
      empty.textContent = 'Select a dependency to inspect relationship details.';
      inspector.append(empty);
    } else {
      const inspection = viewModel.dependencyOverlay.inspection;

      const titleValue = document.createElement('span');
      titleValue.setAttribute('part', 'dependency-inspector-title');
      titleValue.textContent = `${inspection.fromLabel} -> ${inspection.toLabel}`;

      inspector.append(titleValue);
      this.appendSummary(inspector, `${inspection.relationship}`, 'dependency-pill');
      this.appendSummary(inspector, inspection.hard ? 'Hard constraint' : 'Soft constraint', 'dependency-pill');
      this.appendSummary(inspector, inspection.critical ? 'Critical' : 'Non-critical', 'dependency-pill');
      this.appendSummary(
        inspector,
        inspection.satisfied ? 'Satisfied' : `Violates by ${inspection.violationMs}ms`,
        'dependency-pill',
      );

      if (inspection.lag !== 0) {
        this.appendSummary(inspector, `Lag ${inspection.lag}ms`, 'dependency-pill');
      }
    }

    overlay.append(inspector);
    return overlay;
  }

  private createLaneItem(item: HarmonogramLaneItemViewModel): HTMLElement {
    const row = document.createElement('article');
    row.setAttribute('part', 'lane-item');
    row.dataset.itemId = item.id;
    row.setAttribute('role', 'listitem');

    const meta = document.createElement('div');
    meta.setAttribute('part', 'item-meta');

    const selectButton = document.createElement('button');
    selectButton.className = 'item-select';
    selectButton.type = 'button';
    selectButton.dataset.itemId = item.id;
    selectButton.setAttribute('part', 'item-select');
    selectButton.setAttribute('aria-pressed', String(item.selected));
    selectButton.textContent = item.label;
    selectButton.addEventListener('click', () => {
      this.updateSelection(item.id);
    });
    selectButton.addEventListener('mouseenter', () => {
      this.dispatchBoardEvent<HarmonogramHoverEventDetail>('harmonogram-hover', { itemId: item.id });
    });

    const actions = document.createElement('div');
    actions.setAttribute('part', 'item-actions');

    const createActionButton = (part: string, label: string, action: HarmonogramEditAction): HTMLButtonElement => {
      const button = document.createElement('button');
      button.className = part === 'item-edit' ? 'item-edit' : 'item-action';
      button.type = 'button';
      button.setAttribute('part', part);
      button.dataset.itemId = item.id;
      button.dataset.action = action;
      button.disabled = !this.canEdit;
      button.textContent = label;
      button.addEventListener('click', () => {
        this.requestEdit(action, item.id);
      });
      return button;
    };

    const editButton = createActionButton('item-edit', 'Update', 'update');
    const moveButton = createActionButton('item-move', 'Move', 'move');
    const resizeButton = createActionButton('item-resize', 'Resize', 'resize');
    const splitButton = createActionButton('item-split', 'Split', 'split');
    const deleteButton = createActionButton('item-delete', 'Delete', 'delete');

    actions.append(editButton, moveButton, resizeButton, splitButton, deleteButton);
    meta.append(selectButton, actions);

    const track = document.createElement('div');
    track.setAttribute('part', 'item-track');
    track.dataset.itemId = item.id;
    track.dataset.selected = String(item.selected);
    track.dataset.selectable = 'true';
    track.title = `${item.label}: click a visible segment to select this item.`;
    track.addEventListener('click', () => {
      this.updateSelection(item.id);
    });
    track.addEventListener('mouseenter', () => {
      this.dispatchBoardEvent<HarmonogramHoverEventDetail>('harmonogram-hover', { itemId: item.id });
    });

    if (item.segments.length === 0) {
      const empty = document.createElement('p');
      empty.setAttribute('part', 'segment-empty');
      empty.textContent = 'No visible segments';
      track.append(empty);
    } else {
      for (const segment of item.segments) {
        const segmentEl = document.createElement('span');
        segmentEl.setAttribute('part', 'segment');
        segmentEl.dataset.itemId = item.id;
        segmentEl.dataset.segmentKind = segment.kind;
        segmentEl.dataset.selected = String(item.selected);
        segmentEl.style.left = `${segment.startPercent}%`;
        segmentEl.style.width = `${segment.widthPercent}%`;
        segmentEl.title = `${segment.kind}: ${segment.start} -> ${segment.end}`;
        track.append(segmentEl);
      }
    }

    row.append(meta, track);
    return row;
  }

  private createLanes(viewModel: HarmonogramBoardViewModel): HTMLElement {
    const lanes = document.createElement('section');
    lanes.setAttribute('part', 'lanes');
    lanes.setAttribute('role', 'list');
    lanes.setAttribute('aria-label', 'Plan lanes');

    if (viewModel.lanes.length === 0) {
      const empty = document.createElement('p');
      empty.setAttribute('part', 'lane-empty');
      empty.textContent = 'No lanes match the current view.';
      lanes.append(empty);
      return lanes;
    }

    for (const lane of viewModel.lanes) {
      const laneEl = document.createElement('section');
      laneEl.setAttribute('part', 'lane');
      laneEl.dataset.laneId = lane.id;
      laneEl.dataset.groupBy = lane.groupBy;
      laneEl.dataset.collapsed = String(lane.collapsed);
      laneEl.setAttribute('role', 'listitem');

      const laneHeader = document.createElement('header');
      laneHeader.setAttribute('part', 'lane-header');
      laneHeader.id = `lane-header-${lane.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

      const identity = document.createElement('div');
      identity.setAttribute('part', 'lane-identity');

      const laneLabel = document.createElement('h3');
      laneLabel.setAttribute('part', 'lane-label');
      laneLabel.textContent = lane.label;
      laneLabel.style.paddingInlineStart = `${lane.depth * 1}rem`;
      laneLabel.dataset.depth = String(lane.depth);

      const laneCount = document.createElement('span');
      laneCount.setAttribute('part', 'lane-count');
      laneCount.textContent = `${lane.itemCount} item${lane.itemCount === 1 ? '' : 's'}`;

      identity.append(laneLabel, laneCount);
      laneHeader.append(identity);

      if (lane.collapsible) {
        const toggleButton = document.createElement('button');
        toggleButton.className = 'lane-toggle action-button';
        toggleButton.type = 'button';
        toggleButton.setAttribute('part', 'lane-collapse-toggle');
        toggleButton.dataset.laneId = lane.id;
        toggleButton.setAttribute('aria-expanded', String(!lane.collapsed));
        toggleButton.textContent = lane.collapsed ? 'Expand' : 'Collapse';
        toggleButton.addEventListener('click', () => {
          this.toggleLaneCollapse(lane.id);
        });
        laneHeader.append(toggleButton);
      }

      const laneGrid = document.createElement('div');
      laneGrid.setAttribute('part', 'lane-grid');
      laneGrid.setAttribute('role', 'list');
      laneGrid.setAttribute('aria-labelledby', laneHeader.id);

      if (lane.collapsed) {
        const collapsed = document.createElement('p');
        collapsed.setAttribute('part', 'lane-empty');
        collapsed.textContent =
          lane.itemCount > 0
            ? `Collapsed (${lane.itemCount} item${lane.itemCount === 1 ? '' : 's'} hidden)`
            : 'Collapsed';
        laneGrid.append(collapsed);
      } else if (lane.items.length === 0) {
        const empty = document.createElement('p');
        empty.setAttribute('part', 'lane-empty');
        empty.textContent = 'No visible work items';
        laneGrid.append(empty);
      } else {
        for (const item of lane.items) {
          laneGrid.append(this.createLaneItem(item));
        }
      }

      if (!lane.collapsed && lane.hiddenItemCount > 0) {
        const hiddenNotice = document.createElement('p');
        hiddenNotice.setAttribute('part', 'lane-empty');
        hiddenNotice.textContent = `Rendering discipline active: showing ${lane.items.length} of ${lane.itemCount} items.`;
        laneGrid.append(hiddenNotice);
      }

      laneEl.append(laneHeader, laneGrid);
      lanes.append(laneEl);
    }

    return lanes;
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const viewModel = this.buildViewModel();

    const style = document.createElement('style');
    style.textContent = BOARD_STYLES;

    const container = document.createElement('section');
    container.setAttribute('part', 'container');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `${viewModel.title} board`);
    container.tabIndex = 0;
    container.addEventListener('keydown', (event) => {
      this.handleBoardKeydown(event, viewModel);
    });

    const header = document.createElement('header');
    header.setAttribute('part', 'header');

    const title = document.createElement('h2');
    title.setAttribute('part', 'title');
    title.textContent = viewModel.title;

    const mode = document.createElement('p');
    mode.setAttribute('part', 'mode');
    mode.textContent = viewModel.modeLabel;

    header.append(title, mode);

    const summary = document.createElement('div');
    summary.setAttribute('part', 'summary');
    this.appendSummary(summary, `Scale: ${viewModel.scale}`);
    this.appendSummary(summary, `Group: ${viewModel.groupBy}`);
    this.appendSummary(summary, `Lanes: ${viewModel.laneCount}`);
    this.appendSummary(summary, `Items: ${viewModel.visibleItemCount}/${viewModel.totalItemCount}`);
    this.appendSummary(summary, `Dependencies: ${viewModel.dependencyOverlay.paths.length}`);
    this.appendSummary(summary, `Editing: ${this._editingMode}`);

    if (this._editingMode === 'local') {
      this.appendSummary(summary, `Undo depth: ${this._historyPast.length}`);
    }

    if (viewModel.range) {
      this.appendSummary(summary, `Range: ${viewModel.range.start} -> ${viewModel.range.end}`);
    }

    if (viewModel.focusedItemId) {
      this.appendSummary(summary, `Focus: ${viewModel.focusedItemId}`);
    }

    const actions = document.createElement('footer');
    actions.setAttribute('part', 'actions');

    const createButton = document.createElement('button');
    createButton.className = 'action-button';
    createButton.type = 'button';
    createButton.setAttribute('part', 'create-item');
    createButton.disabled = !this.canEdit || !this.activePlan || this.activePlan.lanes.length === 0;
    createButton.textContent = 'Create item';
    createButton.addEventListener('click', () => {
      this.requestEdit('create');
    });

    const undoButton = document.createElement('button');
    undoButton.className = 'action-button';
    undoButton.type = 'button';
    undoButton.setAttribute('part', 'undo-edit');
    undoButton.disabled = !this.canUseLocalHistory || this._historyPast.length === 0;
    undoButton.textContent = 'Undo';
    undoButton.addEventListener('click', () => {
      this.undoLocalEdit();
    });

    const redoButton = document.createElement('button');
    redoButton.className = 'action-button';
    redoButton.type = 'button';
    redoButton.setAttribute('part', 'redo-edit');
    redoButton.disabled = !this.canUseLocalHistory || this._historyFuture.length === 0;
    redoButton.textContent = 'Redo';
    redoButton.addEventListener('click', () => {
      this.redoLocalEdit();
    });

    const shiftButton = document.createElement('button');
    shiftButton.className = 'action-button';
    shiftButton.type = 'button';
    shiftButton.setAttribute('part', 'shift-range');
    shiftButton.disabled = !viewModel.range;
    shiftButton.textContent = 'Shift range';
    shiftButton.addEventListener('click', () => {
      this.shiftRange();
    });

    const fitButton = document.createElement('button');
    fitButton.className = 'action-button';
    fitButton.type = 'button';
    fitButton.setAttribute('part', 'fit-range');
    fitButton.disabled = !this.activePlan;
    fitButton.textContent = 'Fit to plan';
    fitButton.addEventListener('click', () => {
      this.fitToRange();
    });

    const exportButton = document.createElement('button');
    exportButton.className = 'action-button';
    exportButton.type = 'button';
    exportButton.setAttribute('part', 'export-state');
    exportButton.textContent = 'Export state';
    exportButton.addEventListener('click', () => {
      this.exportState();
    });

    const exportJsonButton = document.createElement('button');
    exportJsonButton.className = 'action-button';
    exportJsonButton.type = 'button';
    exportJsonButton.setAttribute('part', 'export-json');
    exportJsonButton.disabled = !this.activePlan;
    exportJsonButton.textContent = 'Export JSON';
    exportJsonButton.addEventListener('click', () => {
      this.exportJson();
    });

    const exportCsvButton = document.createElement('button');
    exportCsvButton.className = 'action-button';
    exportCsvButton.type = 'button';
    exportCsvButton.setAttribute('part', 'export-csv');
    exportCsvButton.disabled = !this.activePlan;
    exportCsvButton.textContent = 'Export CSV';
    exportCsvButton.addEventListener('click', () => {
      this.exportCsv();
    });

    const exportPngButton = document.createElement('button');
    exportPngButton.className = 'action-button';
    exportPngButton.type = 'button';
    exportPngButton.setAttribute('part', 'export-png');
    exportPngButton.disabled = !this.activePlan;
    exportPngButton.textContent = 'Export PNG';
    exportPngButton.addEventListener('click', () => {
      this.exportPng();
    });

    const clearFocusButton = document.createElement('button');
    clearFocusButton.className = 'action-button';
    clearFocusButton.type = 'button';
    clearFocusButton.setAttribute('part', 'clear-focus');
    clearFocusButton.disabled = !viewModel.focusedItemId;
    clearFocusButton.textContent = 'Clear focus';
    clearFocusButton.addEventListener('click', () => {
      this.clearFocus();
    });

    const clearFiltersButton = document.createElement('button');
    clearFiltersButton.className = 'action-button';
    clearFiltersButton.type = 'button';
    clearFiltersButton.setAttribute('part', 'clear-filters');
    clearFiltersButton.disabled = !this._filters;
    clearFiltersButton.textContent = 'Clear filters';
    clearFiltersButton.addEventListener('click', () => {
      this.clearFilters();
    });

    const announcer = document.createElement('div');
    announcer.setAttribute('part', 'announcer');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.textContent = this._announcement;

    actions.append(
      createButton,
      undoButton,
      redoButton,
      shiftButton,
      fitButton,
      exportButton,
      exportJsonButton,
      exportCsvButton,
      exportPngButton,
      clearFocusButton,
      clearFiltersButton,
    );
    container.append(
      header,
      summary,
      this.createTimeline(viewModel),
      this.createDependencyOverlay(viewModel),
      this.createLanes(viewModel),
      actions,
      announcer,
    );
    this.shadowRoot.replaceChildren(style, container);
  }

  private appendSummary(container: HTMLElement, text: string, className = 'summary-pill'): void {
    const value = document.createElement('span');
    value.className = className;
    value.textContent = text;
    container.append(value);
  }
}

if (!customElements.get(BOARD_TAG_NAME)) {
  customElements.define(BOARD_TAG_NAME, HarmonogramBoard);
}

declare global {
  interface HTMLElementTagNameMap {
    'harmonogram-board': HarmonogramBoard;
  }
}
