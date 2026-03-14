import type {
  DependencyRelationship,
  Lane,
  Marker,
  MetadataMap,
  Plan,
  Segment,
  TimeRange,
  WorkItem,
} from '@harmonogram/core';
import { deriveHarmonyInsights, splitRangeByScale } from '@harmonogram/core';

export const TIMELINE_SCALES = ['hour', 'day', 'week', 'month', 'season'] as const;
export type TimelineScale = (typeof TIMELINE_SCALES)[number];

export const BOARD_GROUPING_MODES = ['lane', 'hierarchy', 'resource', 'phase'] as const;
export type HarmonogramBoardGroupBy = (typeof BOARD_GROUPING_MODES)[number];

const MIN_VISIBLE_SEGMENT_WIDTH_PERCENT = 0.8;
const DEPENDENCY_OVERLAY_ROW_HEIGHT_PX = 36;
const DEPENDENCY_OVERLAY_ROW_GAP_PX = 8;
const DEPENDENCY_PATH_GUTTER_PERCENT = 4;
const MAX_RENDERED_ITEMS = 400;
const MAX_RENDERED_ITEMS_PER_LANE = 80;
const ROOT_LANE_ID = '__root__';
const DEFAULT_GROUP_BY: HarmonogramBoardGroupBy = 'lane';
const UNASSIGNED_RESOURCE_GROUP_ID = 'resource:unassigned';
const UNASSIGNED_RESOURCE_LABEL = 'Unassigned resource';
const UNASSIGNED_RESOURCE_FILTER = 'unassigned';
const UNSPECIFIED_PHASE_GROUP_ID = 'phase:unspecified';
const UNSPECIFIED_PHASE_LABEL = 'Unspecified phase';

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

interface LaneGroupDescriptor {
  id: string;
  label: string;
  depth: number;
  collapsible: boolean;
  collapsed: boolean;
  groupBy: HarmonogramBoardGroupBy;
  items: WorkItem[];
}

interface GroupBucket {
  id: string;
  label: string;
  items: WorkItem[];
}

interface DependencyPathOrderingKey {
  requiredBoundaryMs: number | null;
  actualBoundaryMs: number | null;
  fromRowIndex: number;
  toRowIndex: number;
  id: string;
}

interface DependencyPathOrderingEntry {
  path: HarmonogramDependencyPathViewModel;
  key: DependencyPathOrderingKey;
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
  resourceIds?: string[];
  phases?: string[];
  collapsedLaneIds?: string[];
  query?: string;
  focusedItemId?: string;
  groupBy?: HarmonogramBoardGroupBy;
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
  hiddenItemCount: number;
  depth: number;
  collapsible: boolean;
  collapsed: boolean;
  groupBy: HarmonogramBoardGroupBy;
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
  groupBy: HarmonogramBoardGroupBy;
  focusedItemId: string | null;
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

function resolveGroupBy(filters: HarmonogramBoardFilters | null): HarmonogramBoardGroupBy {
  const groupBy = filters?.groupBy;

  if (!groupBy || !BOARD_GROUPING_MODES.includes(groupBy)) {
    return DEFAULT_GROUP_BY;
  }

  return groupBy;
}

function toSet(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) {
    return null;
  }

  return new Set(values);
}

function normalizeFacet(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function toNormalizedSet(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) {
    return null;
  }

  const normalizedValues = values.map((value) => normalizeFacet(value)).filter((value) => value.length > 0);

  if (normalizedValues.length === 0) {
    return null;
  }

  return new Set(normalizedValues);
}

function readMetadataString(metadata: MetadataMap | undefined, key: string): string | null {
  const raw = metadata?.[key];

  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveItemPhase(item: WorkItem, laneById: Map<string, Lane>): string | null {
  const itemPhase = readMetadataString(item.metadata, 'phase') ?? readMetadataString(item.metadata, 'operationPhase');

  if (itemPhase) {
    return itemPhase;
  }

  const lane = laneById.get(item.laneId);
  return readMetadataString(lane?.metadata, 'phase') ?? readMetadataString(lane?.metadata, 'operationPhase');
}

function resolvePrimaryResourceId(item: WorkItem): string | null {
  const resourceId = item.resourceAssignments[0]?.resourceId;

  if (typeof resourceId !== 'string') {
    return null;
  }

  const trimmed = resourceId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasItemScopedFilter(filters: HarmonogramBoardFilters | null): boolean {
  return Boolean(
    filters?.itemIds?.length ||
      filters?.query?.trim() ||
      filters?.resourceIds?.length ||
      filters?.phases?.length ||
      filters?.focusedItemId?.trim(),
  );
}

function applyFilters(plan: Plan | null, items: WorkItem[], filters: HarmonogramBoardFilters | null): WorkItem[] {
  const laneSet = toSet(filters?.laneIds);
  const itemSet = toSet(filters?.itemIds);
  const resourceSet = toNormalizedSet(filters?.resourceIds);
  const phaseSet = toNormalizedSet(filters?.phases);
  const query = filters?.query?.trim().toLocaleLowerCase();
  const laneById = new Map((plan?.lanes ?? []).map((lane) => [lane.id, lane]));

  return sortItems(
    items.filter((item) => {
      if (laneSet && !laneSet.has(item.laneId)) {
        return false;
      }

      if (itemSet && !itemSet.has(item.id)) {
        return false;
      }

      if (resourceSet) {
        const itemResourceFacets = item.resourceAssignments.map((assignment) => normalizeFacet(assignment.resourceId));
        const hasResourceMatch =
          itemResourceFacets.some((resourceFacet) => resourceSet.has(resourceFacet)) ||
          (itemResourceFacets.length === 0 && resourceSet.has(UNASSIGNED_RESOURCE_FILTER));

        if (!hasResourceMatch) {
          return false;
        }
      }

      if (phaseSet) {
        const phaseFacet = normalizeFacet(resolveItemPhase(item, laneById) ?? UNSPECIFIED_PHASE_LABEL);

        if (!phaseSet.has(phaseFacet)) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      return item.label.toLocaleLowerCase().includes(query) || item.id.toLocaleLowerCase().includes(query);
    }),
  );
}

function applyFocusFilter(
  items: WorkItem[],
  focusedItemId: string | undefined,
  dependencies: Plan['dependencies'],
): WorkItem[] {
  if (!focusedItemId) {
    return items;
  }

  const visibleIds = new Set(items.map((item) => item.id));
  if (!visibleIds.has(focusedItemId)) {
    return items;
  }

  const focusedIds = new Set<string>([focusedItemId]);

  for (const dependency of dependencies) {
    if (dependency.fromId === focusedItemId && visibleIds.has(dependency.toId)) {
      focusedIds.add(dependency.toId);
    }

    if (dependency.toId === focusedItemId && visibleIds.has(dependency.fromId)) {
      focusedIds.add(dependency.fromId);
    }
  }

  return items.filter((item) => focusedIds.has(item.id));
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

function buildCollapsedLaneIds(plan: Plan | null, filters: HarmonogramBoardFilters | null): Set<string> {
  const collapsedIds = new Set(filters?.collapsedLaneIds ?? []);

  if (!plan) {
    return collapsedIds;
  }

  for (const lane of plan.lanes) {
    if (lane.collapsed) {
      collapsedIds.add(lane.id);
    }
  }

  return collapsedIds;
}

function buildLaneOrderMap(plan: Plan): Map<string, number> {
  return new Map(plan.lanes.map((lane, index) => [lane.id, index]));
}

function sortLanesByPlanOrder(lanes: Lane[], laneOrderMap: Map<string, number>): Lane[] {
  return [...lanes].sort((left, right) => {
    const leftOrder = laneOrderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = laneOrderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder === rightOrder) {
      return left.id.localeCompare(right.id);
    }

    return leftOrder - rightOrder;
  });
}

function resolveLinearVisibleLanes(
  plan: Plan | null,
  visibleItems: WorkItem[],
  filters: HarmonogramBoardFilters | null,
): Lane[] {
  if (!plan) {
    return [];
  }

  const laneSet = toSet(filters?.laneIds);
  const itemScopedFilter = hasItemScopedFilter(filters);
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

    if (!itemScopedFilter) {
      return true;
    }

    return (visibleCountsByLane.get(lane.id) ?? 0) > 0;
  });
}

function buildLaneGroupDescriptors(
  plan: Plan | null,
  visibleItems: WorkItem[],
  filters: HarmonogramBoardFilters | null,
  collapsedLaneIds: Set<string>,
): LaneGroupDescriptor[] {
  if (!plan) {
    return [];
  }

  const visibleLanes = resolveLinearVisibleLanes(plan, visibleItems, filters);
  const itemsByLaneId = new Map<string, WorkItem[]>();

  for (const item of visibleItems) {
    const laneItems = itemsByLaneId.get(item.laneId);

    if (laneItems) {
      laneItems.push(item);
      continue;
    }

    itemsByLaneId.set(item.laneId, [item]);
  }

  return visibleLanes.map((lane) => {
    const laneItems = sortLaneItems(itemsByLaneId.get(lane.id) ?? []);

    return {
      id: lane.id,
      label: lane.label,
      depth: 0,
      collapsed: collapsedLaneIds.has(lane.id),
      collapsible: laneItems.length > 0,
      groupBy: 'lane',
      items: laneItems,
    };
  });
}

function addLaneWithAncestors(laneById: Map<string, Lane>, laneId: string, collector: Set<string>): void {
  let current: Lane | undefined = laneById.get(laneId);

  while (current) {
    if (collector.has(current.id)) {
      return;
    }

    collector.add(current.id);
    current = current.parentId ? laneById.get(current.parentId) : undefined;
  }
}

function buildHierarchyLaneGroupDescriptors(
  plan: Plan | null,
  visibleItems: WorkItem[],
  filters: HarmonogramBoardFilters | null,
  collapsedLaneIds: Set<string>,
): LaneGroupDescriptor[] {
  if (!plan) {
    return [];
  }

  const laneById = new Map(plan.lanes.map((lane) => [lane.id, lane]));
  const laneOrderMap = buildLaneOrderMap(plan);
  const laneFilterSet = toSet(filters?.laneIds);
  const itemScopedFilter = hasItemScopedFilter(filters);
  const laneIdsToInclude = new Set<string>();

  if (!laneFilterSet && !itemScopedFilter) {
    for (const lane of plan.lanes) {
      laneIdsToInclude.add(lane.id);
    }
  } else {
    const seedLaneIds = laneFilterSet
      ? [...laneFilterSet]
      : [...new Set(visibleItems.map((item) => item.laneId))];

    for (const laneId of seedLaneIds) {
      addLaneWithAncestors(laneById, laneId, laneIdsToInclude);
    }
  }

  const filteredLanes = plan.lanes.filter((lane) => laneIdsToInclude.has(lane.id));
  const childrenByParent = new Map<string, Lane[]>();

  for (const lane of filteredLanes) {
    const parentId = lane.parentId && laneIdsToInclude.has(lane.parentId) ? lane.parentId : ROOT_LANE_ID;
    const siblings = childrenByParent.get(parentId);

    if (siblings) {
      siblings.push(lane);
      continue;
    }

    childrenByParent.set(parentId, [lane]);
  }

  for (const [parentId, siblings] of childrenByParent.entries()) {
    childrenByParent.set(parentId, sortLanesByPlanOrder(siblings, laneOrderMap));
  }

  const itemsByLaneId = new Map<string, WorkItem[]>();
  for (const item of visibleItems) {
    const laneItems = itemsByLaneId.get(item.laneId);

    if (laneItems) {
      laneItems.push(item);
      continue;
    }

    itemsByLaneId.set(item.laneId, [item]);
  }

  const groups: LaneGroupDescriptor[] = [];

  const visitLane = (lane: Lane, depth: number): void => {
    const children = childrenByParent.get(lane.id) ?? [];
    const laneItems = sortLaneItems(itemsByLaneId.get(lane.id) ?? []);
    const collapsible = children.length > 0;
    const collapsed = collapsible && collapsedLaneIds.has(lane.id);

    groups.push({
      id: lane.id,
      label: lane.label,
      depth,
      collapsed,
      collapsible,
      groupBy: 'hierarchy',
      items: laneItems,
    });

    if (collapsed) {
      return;
    }

    for (const child of children) {
      visitLane(child, depth + 1);
    }
  };

  for (const rootLane of childrenByParent.get(ROOT_LANE_ID) ?? []) {
    visitLane(rootLane, 0);
  }

  return groups;
}

function sortGroupBuckets(buckets: GroupBucket[]): GroupBucket[] {
  return [...buckets].sort((left, right) => {
    const labelOrder = left.label.localeCompare(right.label);

    if (labelOrder !== 0) {
      return labelOrder;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildResourceLaneGroupDescriptors(
  plan: Plan | null,
  visibleItems: WorkItem[],
  collapsedLaneIds: Set<string>,
): LaneGroupDescriptor[] {
  const resourceLabelById = new Map((plan?.resources ?? []).map((resource) => [resource.id, resource.label]));
  const bucketsById = new Map<string, GroupBucket>();

  for (const item of visibleItems) {
    const resourceId = resolvePrimaryResourceId(item);
    const groupId = resourceId ? `resource:${resourceId}` : UNASSIGNED_RESOURCE_GROUP_ID;
    const label = resourceId ? (resourceLabelById.get(resourceId) ?? `Resource ${resourceId}`) : UNASSIGNED_RESOURCE_LABEL;
    const bucket = bucketsById.get(groupId);

    if (bucket) {
      bucket.items.push(item);
      continue;
    }

    bucketsById.set(groupId, {
      id: groupId,
      label,
      items: [item],
    });
  }

  return sortGroupBuckets([...bucketsById.values()]).map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    depth: 0,
    collapsed: collapsedLaneIds.has(bucket.id),
    collapsible: bucket.items.length > 0,
    groupBy: 'resource',
    items: sortLaneItems(bucket.items),
  }));
}

function toSlug(value: string): string {
  const normalized = value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized.length > 0 ? normalized : 'unspecified';
}

function buildPhaseLaneGroupDescriptors(
  plan: Plan | null,
  visibleItems: WorkItem[],
  collapsedLaneIds: Set<string>,
): LaneGroupDescriptor[] {
  const laneById = new Map((plan?.lanes ?? []).map((lane) => [lane.id, lane]));
  const bucketsByKey = new Map<string, GroupBucket>();

  for (const item of visibleItems) {
    const phaseLabel = resolveItemPhase(item, laneById) ?? UNSPECIFIED_PHASE_LABEL;
    const phaseKey = normalizeFacet(phaseLabel);
    const groupId = phaseKey === normalizeFacet(UNSPECIFIED_PHASE_LABEL) ? UNSPECIFIED_PHASE_GROUP_ID : `phase:${toSlug(phaseLabel)}`;
    const bucket = bucketsByKey.get(phaseKey);

    if (bucket) {
      bucket.items.push(item);
      continue;
    }

    bucketsByKey.set(phaseKey, {
      id: groupId,
      label: phaseLabel,
      items: [item],
    });
  }

  return sortGroupBuckets([...bucketsByKey.values()]).map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    depth: 0,
    collapsed: collapsedLaneIds.has(bucket.id),
    collapsible: bucket.items.length > 0,
    groupBy: 'phase',
    items: sortLaneItems(bucket.items),
  }));
}

function buildLaneDescriptors(
  plan: Plan | null,
  visibleItems: WorkItem[],
  filters: HarmonogramBoardFilters | null,
  groupBy: HarmonogramBoardGroupBy,
): LaneGroupDescriptor[] {
  const collapsedLaneIds = buildCollapsedLaneIds(plan, filters);

  if (groupBy === 'hierarchy') {
    return buildHierarchyLaneGroupDescriptors(plan, visibleItems, filters, collapsedLaneIds);
  }

  if (groupBy === 'resource') {
    return buildResourceLaneGroupDescriptors(plan, visibleItems, collapsedLaneIds);
  }

  if (groupBy === 'phase') {
    return buildPhaseLaneGroupDescriptors(plan, visibleItems, collapsedLaneIds);
  }

  return buildLaneGroupDescriptors(plan, visibleItems, filters, collapsedLaneIds);
}

function buildLaneRows(
  laneGroups: LaneGroupDescriptor[],
  selectedItemIds: string[],
  focusedItemId: string | undefined,
  rangeMetrics: RangeMetrics | null,
): HarmonogramLaneViewModel[] {
  const selectedSet = new Set(selectedItemIds);
  const mandatoryItemIds = new Set(selectedItemIds);

  if (focusedItemId && focusedItemId.length > 0) {
    mandatoryItemIds.add(focusedItemId);
  }

  const mandatoryItemTotal = laneGroups.reduce((total, laneGroup) => {
    let mandatoryCount = 0;

    for (const item of laneGroup.items) {
      if (mandatoryItemIds.has(item.id)) {
        mandatoryCount += 1;
      }
    }

    return total + mandatoryCount;
  }, 0);

  let remainingGlobalBudget = Math.max(MAX_RENDERED_ITEMS, mandatoryItemTotal);

  return laneGroups.map((laneGroup) => {
    const laneItems = sortLaneItems(laneGroup.items);
    const visibleLaneItems: WorkItem[] = [];

    if (!laneGroup.collapsed) {
      const laneBudget = Math.max(0, Math.min(MAX_RENDERED_ITEMS_PER_LANE, remainingGlobalBudget));
      const visibleLaneItemIds = new Set<string>();

      for (const item of laneItems) {
        if (!mandatoryItemIds.has(item.id) || visibleLaneItems.length >= laneBudget) {
          continue;
        }

        visibleLaneItems.push(item);
        visibleLaneItemIds.add(item.id);
      }

      for (const item of laneItems) {
        if (visibleLaneItems.length >= laneBudget) {
          break;
        }

        if (visibleLaneItemIds.has(item.id)) {
          continue;
        }

        visibleLaneItems.push(item);
        visibleLaneItemIds.add(item.id);
      }

      remainingGlobalBudget = Math.max(0, remainingGlobalBudget - visibleLaneItems.length);
    }

    const items: HarmonogramLaneItemViewModel[] = visibleLaneItems.map((item) => ({
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
      id: laneGroup.id,
      label: laneGroup.label,
      itemCount: laneItems.length,
      hiddenItemCount: laneItems.length - visibleLaneItems.length,
      depth: laneGroup.depth,
      collapsible: laneGroup.collapsible,
      collapsed: laneGroup.collapsed,
      groupBy: laneGroup.groupBy,
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

function resolveBoundaryIso(anchor: { start: string; end: string }, boundary: BoundaryKind): string {
  return boundary === 'start' ? anchor.start : anchor.end;
}

function compareSortableTimestamp(left: number | null, right: number | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
}

function compareDependencyPathOrdering(left: DependencyPathOrderingEntry, right: DependencyPathOrderingEntry): number {
  const requiredBoundaryOrder = compareSortableTimestamp(left.key.requiredBoundaryMs, right.key.requiredBoundaryMs);

  if (requiredBoundaryOrder !== 0) {
    return requiredBoundaryOrder;
  }

  const actualBoundaryOrder = compareSortableTimestamp(left.key.actualBoundaryMs, right.key.actualBoundaryMs);

  if (actualBoundaryOrder !== 0) {
    return actualBoundaryOrder;
  }

  if (left.key.fromRowIndex !== right.key.fromRowIndex) {
    return left.key.fromRowIndex - right.key.fromRowIndex;
  }

  if (left.key.toRowIndex !== right.key.toRowIndex) {
    return left.key.toRowIndex - right.key.toRowIndex;
  }

  return left.key.id.localeCompare(right.key.id);
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
  const dependencyEvaluationById = new Map(
    harmony.dependencyResolution.dependencyResults.map((dependencyResult) => [dependencyResult.dependencyId, dependencyResult]),
  );
  const pathEntries: DependencyPathOrderingEntry[] = [];

  for (const dependency of plan.dependencies) {
    const fromRow = rowByItemId.get(dependency.fromId);
    const toRow = rowByItemId.get(dependency.toId);
    const evaluation = dependencyEvaluationById.get(dependency.id);

    if (!fromRow || !toRow || !evaluation) {
      continue;
    }

    const fromAnchor = harmony.dependencyResolution.itemAnchors[dependency.fromId];
    const toAnchor = harmony.dependencyResolution.itemAnchors[dependency.toId];
    const boundaryRule = DEPENDENCY_BOUNDARIES[dependency.relationship];

    if (!fromAnchor || !toAnchor || !boundaryRule) {
      continue;
    }

    const startPercent = buildPointPercent(resolveBoundaryIso(fromAnchor, boundaryRule.fromBoundary), rangeMetrics);
    const endPercent = buildPointPercent(resolveBoundaryIso(toAnchor, boundaryRule.toBoundary), rangeMetrics);

    if (startPercent === null || endPercent === null) {
      continue;
    }

    pathEntries.push({
      path: {
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
      },
      key: {
        requiredBoundaryMs: toTimestamp(evaluation.requiredBoundary),
        actualBoundaryMs: toTimestamp(evaluation.actualBoundary),
        fromRowIndex: fromRow.rowIndex,
        toRowIndex: toRow.rowIndex,
        id: dependency.id,
      },
    });
  }

  pathEntries.sort(compareDependencyPathOrdering);
  const paths = pathEntries.map((entry) => entry.path);
  const pathById = new Map(paths.map((path) => [path.id, path]));
  const firstSelectedDependencyId = [...selectedDependencySet]
    .sort((left, right) => left.localeCompare(right))
    .find((dependencyId) => pathById.has(dependencyId));
  const firstSelectedDependency = firstSelectedDependencyId ? pathById.get(firstSelectedDependencyId) ?? null : null;

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
  const groupBy = resolveGroupBy(input.filters);
  const filteredItems = applyFilters(input.plan, items, input.filters);
  const visibleItems = applyFocusFilter(
    filteredItems,
    input.filters?.focusedItemId,
    input.plan?.dependencies ?? [],
  );
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const selected = (input.selection?.itemIds ?? [])
    .filter((itemId) => visibleIds.has(itemId))
    .sort((left, right) => left.localeCompare(right));
  const scale = resolveScale(input.view);
  const range = resolveRange(input.plan, input.view);
  const rangeMetrics = resolveRangeMetrics(range);
  const timeZone = input.plan?.timeZone ?? 'UTC';
  const laneDescriptors = buildLaneDescriptors(input.plan, visibleItems, input.filters, groupBy);
  const lanes = buildLaneRows(laneDescriptors, selected, input.filters?.focusedItemId, rangeMetrics);
  const selectedDependencyIds = [...(input.selection?.dependencyIds ?? [])].sort((left, right) =>
    left.localeCompare(right),
  );
  const dependencyOverlay = buildDependencyOverlay(input.plan, lanes, input.selection, rangeMetrics);
  const visibleDependencyIdSet = new Set(dependencyOverlay.paths.map((path) => path.id));
  const focusedItemId = input.filters?.focusedItemId?.trim();

  return {
    title: input.plan?.name ?? 'Harmonogram',
    modeLabel: resolveModeLabel(input.interactive, input.readonly),
    scale,
    range,
    groupBy,
    focusedItemId: focusedItemId && visibleIds.has(focusedItemId) ? focusedItemId : null,
    laneCount: lanes.length,
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
