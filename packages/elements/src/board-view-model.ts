import type {
  DependencyRelationship,
  Lane,
  Marker,
  Plan,
  Segment,
  TimeRange,
  WorkItem,
} from '@harmonogram/core';
import { deriveHarmonyInsights, splitRangeByScale } from '@harmonogram/core';

export const TIMELINE_SCALES = ['hour', 'day', 'week', 'month', 'season'] as const;
export type TimelineScale = (typeof TIMELINE_SCALES)[number];

const MIN_VISIBLE_SEGMENT_WIDTH_PERCENT = 0.8;
const DEPENDENCY_OVERLAY_ROW_HEIGHT_PX = 36;
const DEPENDENCY_OVERLAY_ROW_GAP_PX = 8;
const DEPENDENCY_PATH_GUTTER_PERCENT = 4;

type BoundaryKind = 'start' | 'end';

const DEPENDENCY_BOUNDARIES: Record<
  DependencyRelationship,
  { fromBoundary: BoundaryKind; toBoundary: BoundaryKind }
> = {
  FS: { fromBoundary: 'end', toBoundary: 'start' },
  SS: { fromBoundary: 'start', toBoundary: 'start' },
  FF: { fromBoundary: 'end', toBoundary: 'end' },
  SF: { fromBoundary: 'start', toBoundary: 'end' },
};

interface RangeMetrics {
  startMs: number;
  endMs: number;
  durationMs: number;
}

export interface HarmonogramBoardView {
  scale?: TimelineScale;
  range?: TimeRange;
}

export interface HarmonogramBoardSelection {
  itemIds: string[];
  laneIds?: string[];
  dependencyIds?: string[];
}

export interface HarmonogramBoardFilters {
  laneIds?: string[];
  itemIds?: string[];
  query?: string;
}

export interface HarmonogramTimelineTickViewModel {
  id: string;
  start: string;
  end: string;
  label: string;
}

export interface HarmonogramTimelineMarkerViewModel {
  id: string;
  label: string;
  severity: string;
  startPercent: number;
  widthPercent: number;
}

export interface HarmonogramSegmentViewModel {
  id: string;
  kind: Segment['segmentKind'];
  start: string;
  end: string;
  startPercent: number;
  widthPercent: number;
}

export interface HarmonogramLaneItemViewModel {
  id: string;
  label: string;
  selected: boolean;
  segments: HarmonogramSegmentViewModel[];
}

export interface HarmonogramLaneViewModel {
  id: string;
  label: string;
  itemCount: number;
  items: HarmonogramLaneItemViewModel[];
}

export interface HarmonogramDependencyOverlayRowViewModel {
  itemId: string;
  itemLabel: string;
  laneId: string;
  laneLabel: string;
  rowIndex: number;
  centerY: number;
}

export interface HarmonogramDependencyPathViewModel {
  id: string;
  fromId: string;
  fromLabel: string;
  toId: string;
  toLabel: string;
  relationship: DependencyRelationship;
  lag: number;
  hard: boolean;
  satisfied: boolean;
  violationMs: number;
  critical: boolean;
  selected: boolean;
  startPercent: number;
  endPercent: number;
  startY: number;
  endY: number;
  path: string;
}

export interface HarmonogramDependencyInspectionViewModel {
  id: string;
  fromLabel: string;
  toLabel: string;
  relationship: DependencyRelationship;
  lag: number;
  hard: boolean;
  satisfied: boolean;
  violationMs: number;
  critical: boolean;
}

export interface HarmonogramDependencyOverlayViewModel {
  rowHeightPx: number;
  rowGapPx: number;
  heightPx: number;
  rows: HarmonogramDependencyOverlayRowViewModel[];
  paths: HarmonogramDependencyPathViewModel[];
  inspection: HarmonogramDependencyInspectionViewModel | null;
}

export interface HarmonogramBoardViewModel {
  title: string;
  modeLabel: string;
  scale: TimelineScale;
  range: TimeRange | null;
  laneCount: number;
  totalItemCount: number;
  visibleItemCount: number;
  visibleItems: WorkItem[];
  selectedItemIds: string[];
  selectedDependencyIds: string[];
  timelineTicks: HarmonogramTimelineTickViewModel[];
  timelineMarkers: HarmonogramTimelineMarkerViewModel[];
  lanes: HarmonogramLaneViewModel[];
  dependencyOverlay: HarmonogramDependencyOverlayViewModel;
}

export interface BuildBoardViewModelInput {
  plan: Plan | null;
  view: HarmonogramBoardView | null;
  selection: HarmonogramBoardSelection | null;
  filters: HarmonogramBoardFilters | null;
  interactive: boolean;
  readonly: boolean;
}

function toTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function resolveRangeMetrics(range: TimeRange | null): RangeMetrics | null {
  if (!range) {
    return null;
  }

  const startMs = toTimestamp(range.start);
  const endMs = toTimestamp(range.end);

  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }

  return {
    startMs,
    endMs,
    durationMs: endMs - startMs,
  };
}

function sortItems(items: WorkItem[]): WorkItem[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function resolveRange(plan: Plan | null, view: HarmonogramBoardView | null): TimeRange | null {
  if (view?.range) {
    return view.range;
  }

  if (plan?.range) {
    return plan.range;
  }

  return null;
}

function resolveScale(view: HarmonogramBoardView | null): TimelineScale {
  if (!view?.scale) {
    return 'week';
  }

  return TIMELINE_SCALES.includes(view.scale) ? view.scale : 'week';
}

function toSet(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) {
    return null;
  }

  return new Set(values);
}

function applyFilters(items: WorkItem[], filters: HarmonogramBoardFilters | null): WorkItem[] {
  const laneSet = toSet(filters?.laneIds);
  const itemSet = toSet(filters?.itemIds);
  const query = filters?.query?.trim().toLocaleLowerCase();

  return sortItems(
    items.filter((item) => {
      if (laneSet && !laneSet.has(item.laneId)) {
        return false;
      }

      if (itemSet && !itemSet.has(item.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return item.label.toLocaleLowerCase().includes(query) || item.id.toLocaleLowerCase().includes(query);
    }),
  );
}

function resolveModeLabel(interactive: boolean, readonly: boolean): string {
  if (readonly) {
    return 'read-only';
  }

  return interactive ? 'interactive' : 'inspection';
}

function formatTickLabel(startIso: string, endIso: string, scale: TimelineScale, timeZone: string): string {
  const startMs = toTimestamp(startIso);
  const endMs = toTimestamp(endIso);

  if (startMs === null || endMs === null) {
    return startIso;
  }

  const start = new Date(startMs);
  const inclusiveEnd = new Date(Math.max(startMs, endMs - 1));

  if (scale === 'hour') {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    }).format(start);
  }

  if (scale === 'day') {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      month: 'short',
      day: 'numeric',
    }).format(start);
  }

  if (scale === 'month') {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      month: 'short',
      year: 'numeric',
    }).format(start);
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: 'short',
    day: 'numeric',
  });

  return `${formatter.format(start)} - ${formatter.format(inclusiveEnd)}`;
}

function buildTimelineTicks(
  range: TimeRange | null,
  scale: TimelineScale,
  timeZone: string,
): HarmonogramTimelineTickViewModel[] {
  if (!range) {
    return [];
  }

  try {
    const slices = splitRangeByScale(range, scale, timeZone);
    return slices.map((slice) => ({
      id: `${slice.start}:${slice.end}`,
      start: slice.start,
      end: slice.end,
      label: formatTickLabel(slice.start, slice.end, scale, timeZone),
    }));
  } catch {
    return [];
  }
}

function buildGeometry(
  startIso: string,
  endIso: string,
  rangeMetrics: RangeMetrics,
): { startPercent: number; widthPercent: number } | null {
  const startMs = toTimestamp(startIso);
  const endMs = toTimestamp(endIso);

  if (startMs === null || endMs === null || endMs <= startMs) {
    return null;
  }

  const clippedStart = Math.max(startMs, rangeMetrics.startMs);
  const clippedEnd = Math.min(endMs, rangeMetrics.endMs);

  if (clippedEnd <= clippedStart) {
    return null;
  }

  const startPercent = ((clippedStart - rangeMetrics.startMs) / rangeMetrics.durationMs) * 100;
  const widthPercent = Math.max(
    ((clippedEnd - clippedStart) / rangeMetrics.durationMs) * 100,
    MIN_VISIBLE_SEGMENT_WIDTH_PERCENT,
  );

  return {
    startPercent: Math.min(100, Math.max(0, startPercent)),
    widthPercent: Math.min(100, Math.max(0, widthPercent)),
  };
}

function buildPointPercent(pointIso: string, rangeMetrics: RangeMetrics): number | null {
  const pointMs = toTimestamp(pointIso);

  if (pointMs === null) {
    return null;
  }

  const rawPercent = ((pointMs - rangeMetrics.startMs) / rangeMetrics.durationMs) * 100;
  return Math.min(100, Math.max(0, rawPercent));
}

function sortMarkers(markers: Marker[]): Marker[] {
  return [...markers].sort((left, right) => {
    const leftStart = toTimestamp(left.range.start) ?? 0;
    const rightStart = toTimestamp(right.range.start) ?? 0;

    if (leftStart === rightStart) {
      return left.id.localeCompare(right.id);
    }

    return leftStart - rightStart;
  });
}

function buildTimelineMarkers(
  markers: Marker[],
  rangeMetrics: RangeMetrics | null,
): HarmonogramTimelineMarkerViewModel[] {
  if (!rangeMetrics) {
    return [];
  }

  const visibleMarkers: HarmonogramTimelineMarkerViewModel[] = [];

  for (const marker of sortMarkers(markers)) {
    const geometry = buildGeometry(marker.range.start, marker.range.end, rangeMetrics);

    if (!geometry) {
      continue;
    }

    visibleMarkers.push({
      id: marker.id,
      label: marker.label,
      severity: marker.severity,
      startPercent: geometry.startPercent,
      widthPercent: geometry.widthPercent,
    });
  }

  return visibleMarkers;
}

function resolveVisibleLanes(
  plan: Plan | null,
  visibleItems: WorkItem[],
  filters: HarmonogramBoardFilters | null,
): Lane[] {
  if (!plan) {
    return [];
  }

  const laneSet = toSet(filters?.laneIds);
  const hasItemScopedFilter = Boolean(filters?.itemIds?.length || filters?.query?.trim());
  const visibleCountsByLane = new Map<string, number>();

  for (const item of visibleItems) {
    const current = visibleCountsByLane.get(item.laneId) ?? 0;
    visibleCountsByLane.set(item.laneId, current + 1);
  }

  return plan.lanes.filter((lane) => {
    if (laneSet && !laneSet.has(lane.id)) {
      return false;
    }

    if (laneSet) {
      return true;
    }

    if (!hasItemScopedFilter) {
      return true;
    }

    return (visibleCountsByLane.get(lane.id) ?? 0) > 0;
  });
}

function sortSegments(segments: Segment[]): Segment[] {
  return [...segments].sort((left, right) => {
    const leftStart = toTimestamp(left.start) ?? 0;
    const rightStart = toTimestamp(right.start) ?? 0;

    if (leftStart === rightStart) {
      return left.id.localeCompare(right.id);
    }

    return leftStart - rightStart;
  });
}

function itemStartTimestamp(item: WorkItem): number {
  let earliest = Number.POSITIVE_INFINITY;

  for (const segment of item.segments) {
    const start = toTimestamp(segment.start);

    if (start !== null && start < earliest) {
      earliest = start;
    }
  }

  return Number.isFinite(earliest) ? earliest : Number.MAX_SAFE_INTEGER;
}

function sortLaneItems(items: WorkItem[]): WorkItem[] {
  return [...items].sort((left, right) => {
    const leftStart = itemStartTimestamp(left);
    const rightStart = itemStartTimestamp(right);

    if (leftStart === rightStart) {
      return left.id.localeCompare(right.id);
    }

    return leftStart - rightStart;
  });
}

function buildLaneRows(
  lanes: Lane[],
  visibleItems: WorkItem[],
  selectedItemIds: string[],
  rangeMetrics: RangeMetrics | null,
): HarmonogramLaneViewModel[] {
  const itemsByLane = new Map<string, WorkItem[]>();
  const selectedSet = new Set(selectedItemIds);

  for (const item of visibleItems) {
    const laneItems = itemsByLane.get(item.laneId);

    if (laneItems) {
      laneItems.push(item);
      continue;
    }

    itemsByLane.set(item.laneId, [item]);
  }

  return lanes.map((lane) => {
    const laneItems = sortLaneItems(itemsByLane.get(lane.id) ?? []);
    const items: HarmonogramLaneItemViewModel[] = laneItems.map((item) => ({
      id: item.id,
      label: item.label,
      selected: selectedSet.has(item.id),
      segments: rangeMetrics
        ? sortSegments(item.segments)
            .map((segment) => {
              const geometry = buildGeometry(segment.start, segment.end, rangeMetrics);

              if (!geometry) {
                return null;
              }

              return {
                id: segment.id,
                kind: segment.segmentKind,
                start: segment.start,
                end: segment.end,
                startPercent: geometry.startPercent,
                widthPercent: geometry.widthPercent,
              };
            })
            .filter((segment): segment is HarmonogramSegmentViewModel => Boolean(segment))
        : [],
    }));

    return {
      id: lane.id,
      label: lane.label,
      itemCount: items.length,
      items,
    };
  });
}

function buildDependencyRows(lanes: HarmonogramLaneViewModel[]): HarmonogramDependencyOverlayRowViewModel[] {
  const rows: HarmonogramDependencyOverlayRowViewModel[] = [];

  for (const lane of lanes) {
    for (const item of lane.items) {
      const rowIndex = rows.length;
      const centerY =
        rowIndex * (DEPENDENCY_OVERLAY_ROW_HEIGHT_PX + DEPENDENCY_OVERLAY_ROW_GAP_PX) +
        DEPENDENCY_OVERLAY_ROW_HEIGHT_PX / 2;

      rows.push({
        itemId: item.id,
        itemLabel: item.label,
        laneId: lane.id,
        laneLabel: lane.label,
        rowIndex,
        centerY,
      });
    }
  }

  return rows;
}

function resolveBoundaryIso(
  anchor: { start: string; end: string },
  boundary: BoundaryKind,
): string {
  return boundary === 'start' ? anchor.start : anchor.end;
}

function buildDependencyPath(startPercent: number, endPercent: number, startY: number, endY: number): string {
  if (startY === endY) {
    return `M ${startPercent} ${startY} L ${endPercent} ${endY}`;
  }

  const elbowX = Math.min(99, Math.max(startPercent, endPercent) + DEPENDENCY_PATH_GUTTER_PERCENT);
  return `M ${startPercent} ${startY} L ${elbowX} ${startY} L ${elbowX} ${endY} L ${endPercent} ${endY}`;
}

function buildCriticalDependencyIds(
  dependencies: Plan['dependencies'],
  criticalItemIds: string[] | undefined,
): Set<string> {
  if (!criticalItemIds || criticalItemIds.length < 2) {
    return new Set<string>();
  }

  const indexByItemId = new Map(criticalItemIds.map((itemId, index) => [itemId, index]));
  const criticalIds = new Set<string>();

  for (const dependency of dependencies) {
    if (!dependency.hard) {
      continue;
    }

    const fromIndex = indexByItemId.get(dependency.fromId);
    const toIndex = indexByItemId.get(dependency.toId);

    if (fromIndex === undefined || toIndex === undefined) {
      continue;
    }

    if (toIndex === fromIndex + 1) {
      criticalIds.add(dependency.id);
    }
  }

  return criticalIds;
}

function buildDependencyOverlay(
  plan: Plan | null,
  lanes: HarmonogramLaneViewModel[],
  selection: HarmonogramBoardSelection | null,
  rangeMetrics: RangeMetrics | null,
): HarmonogramDependencyOverlayViewModel {
  const rows = buildDependencyRows(lanes);
  const heightPx =
    rows.length === 0
      ? DEPENDENCY_OVERLAY_ROW_HEIGHT_PX
      : rows.length * DEPENDENCY_OVERLAY_ROW_HEIGHT_PX + (rows.length - 1) * DEPENDENCY_OVERLAY_ROW_GAP_PX;

  if (!plan || rows.length === 0 || !rangeMetrics) {
    return {
      rowHeightPx: DEPENDENCY_OVERLAY_ROW_HEIGHT_PX,
      rowGapPx: DEPENDENCY_OVERLAY_ROW_GAP_PX,
      heightPx,
      rows,
      paths: [],
      inspection: null,
    };
  }

  const harmony = deriveHarmonyInsights({
    range: plan.range,
    items: plan.items,
    dependencies: plan.dependencies,
    resources: plan.resources,
  });
  const selectedDependencySet = new Set(selection?.dependencyIds ?? []);
  const rowByItemId = new Map(rows.map((row) => [row.itemId, row]));
  const criticalDependencyIds = buildCriticalDependencyIds(plan.dependencies, harmony.criticalSequence?.itemIds);
  const paths: HarmonogramDependencyPathViewModel[] = [];

  for (const dependency of [...plan.dependencies].sort((left, right) => left.id.localeCompare(right.id))) {
    const fromRow = rowByItemId.get(dependency.fromId);
    const toRow = rowByItemId.get(dependency.toId);
    const evaluation = harmony.dependencyResolution.dependencyResults.find(
      (dependencyResult) => dependencyResult.dependencyId === dependency.id,
    );

    if (!fromRow || !toRow || !evaluation) {
      continue;
    }

    const fromAnchor = harmony.dependencyResolution.itemAnchors[dependency.fromId];
    const toAnchor = harmony.dependencyResolution.itemAnchors[dependency.toId];
    const boundaryRule = DEPENDENCY_BOUNDARIES[dependency.relationship];

    if (!fromAnchor || !toAnchor || !boundaryRule) {
      continue;
    }

    const startPercent = buildPointPercent(
      resolveBoundaryIso(fromAnchor, boundaryRule.fromBoundary),
      rangeMetrics,
    );
    const endPercent = buildPointPercent(resolveBoundaryIso(toAnchor, boundaryRule.toBoundary), rangeMetrics);

    if (startPercent === null || endPercent === null) {
      continue;
    }

    paths.push({
      id: dependency.id,
      fromId: dependency.fromId,
      fromLabel: fromRow.itemLabel,
      toId: dependency.toId,
      toLabel: toRow.itemLabel,
      relationship: dependency.relationship,
      lag: dependency.lag,
      hard: dependency.hard,
      satisfied: evaluation.satisfied,
      violationMs: evaluation.violationMs,
      critical: criticalDependencyIds.has(dependency.id),
      selected: selectedDependencySet.has(dependency.id),
      startPercent,
      endPercent,
      startY: fromRow.centerY,
      endY: toRow.centerY,
      path: buildDependencyPath(startPercent, endPercent, fromRow.centerY, toRow.centerY),
    });
  }

  paths.sort((left, right) => left.id.localeCompare(right.id));

  const firstSelectedDependency = paths.find((path) => selectedDependencySet.has(path.id)) ?? null;

  return {
    rowHeightPx: DEPENDENCY_OVERLAY_ROW_HEIGHT_PX,
    rowGapPx: DEPENDENCY_OVERLAY_ROW_GAP_PX,
    heightPx,
    rows,
    paths,
    inspection: firstSelectedDependency
      ? {
          id: firstSelectedDependency.id,
          fromLabel: firstSelectedDependency.fromLabel,
          toLabel: firstSelectedDependency.toLabel,
          relationship: firstSelectedDependency.relationship,
          lag: firstSelectedDependency.lag,
          hard: firstSelectedDependency.hard,
          satisfied: firstSelectedDependency.satisfied,
          violationMs: firstSelectedDependency.violationMs,
          critical: firstSelectedDependency.critical,
        }
      : null,
  };
}

export function buildBoardViewModel(input: BuildBoardViewModelInput): HarmonogramBoardViewModel {
  const items = input.plan?.items ?? [];
  const visibleItems = applyFilters(items, input.filters);
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const selected = (input.selection?.itemIds ?? [])
    .filter((itemId) => visibleIds.has(itemId))
    .sort((left, right) => left.localeCompare(right));
  const scale = resolveScale(input.view);
  const range = resolveRange(input.plan, input.view);
  const rangeMetrics = resolveRangeMetrics(range);
  const timeZone = input.plan?.timeZone ?? 'UTC';
  const visibleLanes = resolveVisibleLanes(input.plan, visibleItems, input.filters);
  const lanes = buildLaneRows(visibleLanes, visibleItems, selected, rangeMetrics);
  const selectedDependencyIds = [...(input.selection?.dependencyIds ?? [])].sort((left, right) =>
    left.localeCompare(right),
  );
  const dependencyOverlay = buildDependencyOverlay(input.plan, lanes, input.selection, rangeMetrics);
  const visibleDependencyIdSet = new Set(dependencyOverlay.paths.map((path) => path.id));

  return {
    title: input.plan?.name ?? 'Harmonogram',
    modeLabel: resolveModeLabel(input.interactive, input.readonly),
    scale,
    range,
    laneCount: visibleLanes.length,
    totalItemCount: items.length,
    visibleItemCount: visibleItems.length,
    visibleItems,
    selectedItemIds: selected,
    selectedDependencyIds: selectedDependencyIds.filter((dependencyId) => visibleDependencyIdSet.has(dependencyId)),
    timelineTicks: buildTimelineTicks(range, scale, timeZone),
    timelineMarkers: buildTimelineMarkers(input.plan?.markers ?? [], rangeMetrics),
    lanes,
    dependencyOverlay,
  };
}
