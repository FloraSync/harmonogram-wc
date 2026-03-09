import type { DependencyRelationship, Plan, TimeRange } from '@harmonogram/core';
import {
  TIMELINE_SCALES,
  buildBoardViewModel,
  type HarmonogramDependencyPathViewModel,
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
    color: var(--harmonogram-board-fg, #1f2937);
    font-family: var(--harmonogram-board-font, system-ui, -apple-system, sans-serif);
    --harmonogram-board-lane-label-width: 12.5rem;
  }

  *, *::before, *::after {
    box-sizing: inherit;
  }

  [part='container'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 10px;
    background: var(--harmonogram-board-bg, #ffffff);
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  [part='header'] {
    align-items: baseline;
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  [part='title'] {
    margin: 0;
    font-size: 1rem;
    line-height: 1.3;
  }

  [part='mode'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.85rem;
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
    font-size: 0.75rem;
    line-height: 1.2;
    padding: 0.2rem 0.55rem;
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
    font-size: 0.72rem;
    line-height: 1.2;
    padding: 0.45rem 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  [part='timeline-tick']:first-child {
    border-left: none;
  }

  [part='timeline-markers'] {
    min-height: 1.65rem;
    position: relative;
    padding: 0.18rem 0.25rem 0.25rem;
  }

  [part='timeline-marker'] {
    background: var(--harmonogram-marker-medium, #f59e0b);
    border-radius: 999px;
    color: #111827;
    font-size: 0.68rem;
    line-height: 1.1;
    overflow: hidden;
    padding: 0.15rem 0.35rem;
    position: absolute;
    top: 0.2rem;
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
    font-size: 0.85rem;
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
    font-size: 0.82rem;
    font-weight: 600;
  }

  [part='dependency-count'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.72rem;
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
    font-size: 0.75rem;
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
    font-size: 0.76rem;
    font-weight: 600;
  }

  [part='dependency-inspector-empty'],
  [part='dependency-empty'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.8rem;
    margin: 0;
  }

  [part='dependency-pill'] {
    border: 1px solid var(--harmonogram-board-border, #d0d7de);
    border-radius: 999px;
    font-size: 0.72rem;
    line-height: 1.1;
    padding: 0.25rem 0.5rem;
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

  [part='lane-label'] {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
  }

  [part='lane-count'] {
    color: var(--harmonogram-board-muted, #596272);
    font-size: 0.7rem;
  }

  [part='lane-grid'] {
    display: grid;
    gap: 0.25rem;
    padding: 0.35rem;
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
    min-height: 1.9rem;
    position: relative;
    background: var(--harmonogram-board-track-bg, #f8fafc);
    overflow: hidden;
  }

  [part='segment'] {
    border-radius: 999px;
    height: 1.15rem;
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
    line-height: 1.2;
    padding: 0.35rem 0.55rem;
  }

  .item-select {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    gap: 0.45rem;
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
  action: 'zoom-in' | 'zoom-out' | 'fit-to-range' | 'export-state' | 'focus-item' | 'undo' | 'redo';
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
    this._filters = value;
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
    this.render();
  }

  focusItem(itemId: string): void {
    const plan = this.activePlan;
    if (!plan || !plan.items.some((item) => item.id === itemId)) {
      return;
    }

    const selection: HarmonogramBoardSelection = { itemIds: [itemId] };
    this._selection = selection;

    this.dispatchBoardEvent<HarmonogramSelectEventDetail>('harmonogram-select', {
      itemId,
      selection,
    });
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'focus-item',
      scale: this.currentScale,
      itemId,
    });
    this.render();
  }

  exportState(): HarmonogramBoardStateSnapshot {
    const snapshot = this.getStateSnapshot();
    this.dispatchBoardEvent<HarmonogramActionEventDetail>('harmonogram-action', {
      action: 'export-state',
      scale: this.currentScale,
      state: snapshot,
    });
    return snapshot;
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
        query: this._filters?.query,
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
    this.render();
  }

  private createTimeline(viewModel: HarmonogramBoardViewModel): HTMLElement {
    const timeline = document.createElement('section');
    timeline.setAttribute('part', 'timeline');

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
        segmentEl.dataset.segmentKind = segment.kind;
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

      const laneHeader = document.createElement('header');
      laneHeader.setAttribute('part', 'lane-header');

      const laneLabel = document.createElement('h3');
      laneLabel.setAttribute('part', 'lane-label');
      laneLabel.textContent = lane.label;

      const laneCount = document.createElement('span');
      laneCount.setAttribute('part', 'lane-count');
      laneCount.textContent = `${lane.itemCount} item${lane.itemCount === 1 ? '' : 's'}`;

      laneHeader.append(laneLabel, laneCount);

      const laneGrid = document.createElement('div');
      laneGrid.setAttribute('part', 'lane-grid');

      if (lane.items.length === 0) {
        const empty = document.createElement('p');
        empty.setAttribute('part', 'lane-empty');
        empty.textContent = 'No visible work items';
        laneGrid.append(empty);
      } else {
        for (const item of lane.items) {
          laneGrid.append(this.createLaneItem(item));
        }
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

    const viewModel = buildBoardViewModel({
      plan: this.activePlan,
      view: this._view,
      selection: this._selection,
      filters: this._filters,
      interactive: this._interactive,
      readonly: this._readonly,
    });

    const style = document.createElement('style');
    style.textContent = BOARD_STYLES;

    const container = document.createElement('section');
    container.setAttribute('part', 'container');

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

    actions.append(createButton, undoButton, redoButton, shiftButton, fitButton, exportButton);
    container.append(
      header,
      summary,
      this.createTimeline(viewModel),
      this.createDependencyOverlay(viewModel),
      this.createLanes(viewModel),
      actions,
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
