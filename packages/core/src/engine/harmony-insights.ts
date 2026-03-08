import type { Dependency, Insight, Plan, SeverityLevel, WorkItem, WorkItemSnapshot } from '../contracts/model.js';
import {
  evaluateDependencyResolution,
  type DependencyResolutionIssue,
  type DependencyResolutionResult,
} from './dependency.js';

const MEDIUM_SEVERITY_RATIO = 0.1;
const HIGH_SEVERITY_RATIO = 0.25;
const CRITICAL_SEVERITY_RATIO = 0.5;

export const HARMONY_INSIGHT_ISSUE_CODES = [
  'dependency-resolution',
  'invalid-time-range',
  'missing-resource',
] as const;
export type HarmonyInsightIssueCode = (typeof HARMONY_INSIGHT_ISSUE_CODES)[number];

export interface HarmonyInsightIssue {
  code: HarmonyInsightIssueCode;
  message: string;
  itemId?: string;
  dependencyId?: string;
  resourceId?: string;
}

export interface CriticalSequenceResult {
  itemIds: string[];
  totalDurationMs: number;
  componentCount: number;
  hasCycle: boolean;
}

export interface HarmonyInsightOptions {
  dependencyResolution?: DependencyResolutionResult;
}

export interface HarmonyInsightsResult {
  insights: Insight[];
  criticalSequence: CriticalSequenceResult | null;
  dependencyResolution: DependencyResolutionResult;
  issues: HarmonyInsightIssue[];
}

interface AnchoredItem {
  item: WorkItem;
  startMs: number;
  endMs: number;
  durationMs: number;
  startIso: string;
  endIso: string;
  source: string;
}

interface DependencyEdge {
  dependencyId: string;
  fromId: string;
  toId: string;
}

interface GraphComponent {
  key: string;
  itemIds: string[];
  weightMs: number;
  hasCycle: boolean;
  outgoing: number[];
}

interface ComponentPath {
  componentIndexes: number[];
  totalDurationMs: number;
  pathKey: string;
}

interface CapacitySegment {
  startMs: number;
  endMs: number;
  itemIds: string[];
  loadUnits: number;
}

interface ResourceInterval {
  itemId: string;
  startMs: number;
  endMs: number;
  units: number;
}

function compareById(left: { id: string }, right: { id: string }): number {
  return left.id.localeCompare(right.id);
}

function sortIds(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function severityFromRatio(value: number): SeverityLevel {
  const ratio = clampRatio(value);

  if (ratio >= CRITICAL_SEVERITY_RATIO) {
    return 'critical';
  }

  if (ratio >= HIGH_SEVERITY_RATIO) {
    return 'high';
  }

  if (ratio >= MEDIUM_SEVERITY_RATIO) {
    return 'medium';
  }

  return 'low';
}

function parseIsoToMillis(value: string): number | undefined {
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : undefined;
}

function formatIso(millis: number): string {
  return new Date(millis).toISOString();
}

function createInsightId(kind: Insight['kind'], subjectIds: string[], key: string): string {
  return `insight:${kind}:${subjectIds.join('|')}:${key}`;
}

function createInsight(params: {
  kind: Insight['kind'];
  subjectIds: string[];
  severity: SeverityLevel;
  message: string;
  key: string;
  metadata: Record<string, unknown>;
}): Insight {
  const subjectIds = sortIds(params.subjectIds);

  return {
    id: createInsightId(params.kind, subjectIds, params.key),
    kind: params.kind,
    subjectIds,
    severity: params.severity,
    message: params.message,
    metadata: params.metadata,
  };
}

function compareIssues(left: HarmonyInsightIssue, right: HarmonyInsightIssue): number {
  const byCode = left.code.localeCompare(right.code);

  if (byCode !== 0) {
    return byCode;
  }

  const leftScope = `${left.itemId ?? ''}|${left.dependencyId ?? ''}|${left.resourceId ?? ''}`;
  const rightScope = `${right.itemId ?? ''}|${right.dependencyId ?? ''}|${right.resourceId ?? ''}`;
  const byScope = leftScope.localeCompare(rightScope);

  if (byScope !== 0) {
    return byScope;
  }

  return left.message.localeCompare(right.message);
}

function addDependencyIssues(
  dependencyIssues: DependencyResolutionIssue[],
  issues: HarmonyInsightIssue[],
): void {
  for (const issue of dependencyIssues) {
    issues.push({
      code: 'dependency-resolution',
      message: issue.message,
      itemId: issue.itemId,
      dependencyId: issue.dependencyId,
    });
  }
}

function addInvalidTimeRangeIssue(
  issues: HarmonyInsightIssue[],
  message: string,
  itemId?: string,
): void {
  issues.push({
    code: 'invalid-time-range',
    message,
    itemId,
  });
}

function collectAnchoredItems(
  items: WorkItem[],
  dependencyResolution: DependencyResolutionResult,
  issues: HarmonyInsightIssue[],
): AnchoredItem[] {
  const anchoredItems: AnchoredItem[] = [];

  for (const item of items) {
    const anchor = dependencyResolution.itemAnchors[item.id];

    if (!anchor) {
      continue;
    }

    const startMs = parseIsoToMillis(anchor.start);
    const endMs = parseIsoToMillis(anchor.end);

    if (startMs === undefined || endMs === undefined) {
      addInvalidTimeRangeIssue(issues, `item anchor for "${item.id}" is not valid ISO date-time`, item.id);
      continue;
    }

    if (startMs > endMs) {
      addInvalidTimeRangeIssue(issues, `item anchor for "${item.id}" starts after it ends`, item.id);
      continue;
    }

    anchoredItems.push({
      item,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      startIso: formatIso(startMs),
      endIso: formatIso(endMs),
      source: anchor.source,
    });
  }

  return anchoredItems;
}

function resolvePlanDurationMs(
  planRange: Plan['range'],
  anchoredItems: AnchoredItem[],
  issues: HarmonyInsightIssue[],
): number {
  const rangeStart = parseIsoToMillis(planRange.start);
  const rangeEnd = parseIsoToMillis(planRange.end);

  if (rangeStart !== undefined && rangeEnd !== undefined && rangeStart < rangeEnd) {
    return rangeEnd - rangeStart;
  }

  addInvalidTimeRangeIssue(issues, 'plan.range must contain valid ISO date-times with start before end');

  if (anchoredItems.length === 0) {
    return 1;
  }

  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = Number.NEGATIVE_INFINITY;

  for (const anchored of anchoredItems) {
    if (anchored.startMs < minStart) {
      minStart = anchored.startMs;
    }

    if (anchored.endMs > maxEnd) {
      maxEnd = anchored.endMs;
    }
  }

  if (minStart < maxEnd) {
    return maxEnd - minStart;
  }

  return 1;
}

function collectBlockedInsights(
  dependencyResolution: DependencyResolutionResult,
  anchoredById: Map<string, AnchoredItem>,
): Insight[] {
  const insights: Insight[] = [];
  const dependencyResultsById = new Map(
    dependencyResolution.dependencyResults.map((dependencyResult) => [dependencyResult.dependencyId, dependencyResult]),
  );
  const blockedItemIds = Object.keys(dependencyResolution.blockedStates).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const itemId of blockedItemIds) {
    const blockedState = dependencyResolution.blockedStates[itemId];

    if (!blockedState || !blockedState.blocked) {
      continue;
    }

    const itemDurationMs = Math.max(anchoredById.get(itemId)?.durationMs ?? 1, 1);
    let dominantViolationMs = 0;

    for (const reason of blockedState.reasons) {
      if (reason.type !== 'violation') {
        continue;
      }

      const dependencyResult = dependencyResultsById.get(reason.dependencyId);
      const violationMs = dependencyResult?.violationMs ?? 0;

      if (violationMs > dominantViolationMs) {
        dominantViolationMs = violationMs;
      }
    }

    const ratio =
      dominantViolationMs > 0
        ? dominantViolationMs / itemDurationMs
        : Math.min(1, blockedState.reasons.length / 4);
    const reasonKey = blockedState.reasons
      .map((reason) => `${reason.dependencyId}:${reason.fromId}:${reason.type}`)
      .join(',');

    insights.push(
      createInsight({
        kind: 'blocked',
        subjectIds: [itemId],
        severity: severityFromRatio(ratio),
        message: `Work item "${itemId}" is blocked by dependency constraints.`,
        key: `${itemId}:${reasonKey}`,
        metadata: {
          itemId,
          dominantViolationMs,
          itemDurationMs,
          ratio: clampRatio(ratio),
          reasons: blockedState.reasons.map((reason) => ({
            dependencyId: reason.dependencyId,
            fromId: reason.fromId,
            type: reason.type,
          })),
        },
      }),
    );
  }

  return insights;
}

function collectOverlapAndGapInsights(anchoredItems: AnchoredItem[]): Insight[] {
  const insights: Insight[] = [];
  const laneItems = new Map<string, AnchoredItem[]>();

  for (const anchored of anchoredItems) {
    const list = laneItems.get(anchored.item.laneId);

    if (list) {
      list.push(anchored);
      continue;
    }

    laneItems.set(anchored.item.laneId, [anchored]);
  }

  const laneIds = [...laneItems.keys()].sort((left, right) => left.localeCompare(right));

  for (const laneId of laneIds) {
    const list = laneItems.get(laneId) ?? [];
    const sorted = [...list].sort((left, right) => {
      if (left.startMs !== right.startMs) {
        return left.startMs - right.startMs;
      }

      if (left.endMs !== right.endMs) {
        return left.endMs - right.endMs;
      }

      return left.item.id.localeCompare(right.item.id);
    });

    for (let index = 0; index < sorted.length; index += 1) {
      const left = sorted[index];

      for (let cursor = index + 1; cursor < sorted.length; cursor += 1) {
        const right = sorted[cursor];

        if (right.startMs >= left.endMs) {
          break;
        }

        const overlapStartMs = Math.max(left.startMs, right.startMs);
        const overlapEndMs = Math.min(left.endMs, right.endMs);

        if (overlapStartMs >= overlapEndMs) {
          continue;
        }

        const overlapDurationMs = overlapEndMs - overlapStartMs;
        const ratio = overlapDurationMs / Math.max(1, Math.min(left.durationMs, right.durationMs));

        insights.push(
          createInsight({
            kind: 'overlap',
            subjectIds: [left.item.id, right.item.id],
            severity: severityFromRatio(ratio),
            message: `Work items "${left.item.id}" and "${right.item.id}" overlap in lane "${laneId}".`,
            key: `${laneId}:${left.item.id}:${right.item.id}:${overlapStartMs}:${overlapEndMs}`,
            metadata: {
              laneId,
              overlapStart: formatIso(overlapStartMs),
              overlapEnd: formatIso(overlapEndMs),
              overlapMs: overlapDurationMs,
              ratio: clampRatio(ratio),
            },
          }),
        );
      }
    }

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (current.startMs <= previous.endMs) {
        continue;
      }

      const gapDurationMs = current.startMs - previous.endMs;
      const ratio = gapDurationMs / Math.max(1, Math.max(previous.durationMs, current.durationMs));

      insights.push(
        createInsight({
          kind: 'gap',
          subjectIds: [previous.item.id, current.item.id],
          severity: severityFromRatio(ratio),
          message: `Idle gap detected in lane "${laneId}" between "${previous.item.id}" and "${current.item.id}".`,
          key: `${laneId}:${previous.item.id}:${current.item.id}:${previous.endMs}:${current.startMs}`,
          metadata: {
            laneId,
            fromItemId: previous.item.id,
            toItemId: current.item.id,
            gapStart: formatIso(previous.endMs),
            gapEnd: formatIso(current.startMs),
            gapMs: gapDurationMs,
            ratio: clampRatio(ratio),
          },
        }),
      );
    }
  }

  return insights;
}

function snapshotDriftDeltaMs(
  anchored: AnchoredItem,
  snapshot: WorkItemSnapshot | undefined,
  snapshotKey: 'baseline' | 'projection',
  issues: HarmonyInsightIssue[],
): number {
  if (!snapshot) {
    return 0;
  }

  const snapshotStartMs = parseIsoToMillis(snapshot.start);
  const snapshotEndMs = parseIsoToMillis(snapshot.end);

  if (snapshotStartMs === undefined || snapshotEndMs === undefined) {
    addInvalidTimeRangeIssue(
      issues,
      `item "${anchored.item.id}" ${snapshotKey} snapshot contains invalid date-time`,
      anchored.item.id,
    );
    return 0;
  }

  if (snapshotStartMs > snapshotEndMs) {
    addInvalidTimeRangeIssue(
      issues,
      `item "${anchored.item.id}" ${snapshotKey} snapshot starts after it ends`,
      anchored.item.id,
    );
    return 0;
  }

  return Math.max(
    Math.abs(anchored.startMs - snapshotStartMs),
    Math.abs(anchored.endMs - snapshotEndMs),
  );
}

function collectDriftInsights(anchoredItems: AnchoredItem[], issues: HarmonyInsightIssue[]): Insight[] {
  const insights: Insight[] = [];

  for (const anchored of anchoredItems) {
    const baselineDeltaMs = snapshotDriftDeltaMs(anchored, anchored.item.baseline, 'baseline', issues);
    const projectionDeltaMs = snapshotDriftDeltaMs(anchored, anchored.item.projection, 'projection', issues);
    const dominantDeltaMs = Math.max(baselineDeltaMs, projectionDeltaMs);

    if (dominantDeltaMs <= 0) {
      continue;
    }

    const dominantSource = baselineDeltaMs >= projectionDeltaMs ? 'baseline' : 'projection';
    const ratio = dominantDeltaMs / Math.max(1, anchored.durationMs);

    insights.push(
      createInsight({
        kind: 'drift',
        subjectIds: [anchored.item.id],
        severity: severityFromRatio(ratio),
        message: `Work item "${anchored.item.id}" drifted from ${dominantSource} timing.`,
        key: `${anchored.item.id}:${baselineDeltaMs}:${projectionDeltaMs}`,
        metadata: {
          itemId: anchored.item.id,
          anchorSource: anchored.source,
          baselineDeltaMs,
          projectionDeltaMs,
          dominantDeltaMs,
          dominantSource,
          ratio: clampRatio(ratio),
        },
      }),
    );
  }

  return insights;
}

function collectCapacityConflictInsights(
  resources: Plan['resources'],
  anchoredItems: AnchoredItem[],
  issues: HarmonyInsightIssue[],
): Insight[] {
  const insights: Insight[] = [];
  const resourcesSorted = [...resources].sort(compareById);
  const resourceById = new Map(resourcesSorted.map((resource) => [resource.id, resource]));
  const intervalsByResource = new Map<string, ResourceInterval[]>();

  for (const anchored of anchoredItems) {
    const assignments = [...anchored.item.resourceAssignments].sort((left, right) =>
      left.resourceId.localeCompare(right.resourceId),
    );

    for (const assignment of assignments) {
      const resource = resourceById.get(assignment.resourceId);

      if (!resource) {
        issues.push({
          code: 'missing-resource',
          message: `item "${anchored.item.id}" references unknown resource "${assignment.resourceId}"`,
          itemId: anchored.item.id,
          resourceId: assignment.resourceId,
        });
        continue;
      }

      const units = assignment.units ?? 1;

      if (units <= 0 || anchored.startMs >= anchored.endMs) {
        continue;
      }

      const existing = intervalsByResource.get(resource.id);
      const interval: ResourceInterval = {
        itemId: anchored.item.id,
        startMs: anchored.startMs,
        endMs: anchored.endMs,
        units,
      };

      if (existing) {
        existing.push(interval);
      } else {
        intervalsByResource.set(resource.id, [interval]);
      }
    }
  }

  for (const resource of resourcesSorted) {
    const intervals = intervalsByResource.get(resource.id) ?? [];

    if (intervals.length === 0) {
      continue;
    }

    const boundaries = [...new Set(intervals.flatMap((interval) => [interval.startMs, interval.endMs]))].sort(
      (left, right) => left - right,
    );
    const conflictSegments: CapacitySegment[] = [];

    for (let index = 0; index < boundaries.length - 1; index += 1) {
      const startMs = boundaries[index];
      const endMs = boundaries[index + 1];

      if (startMs >= endMs) {
        continue;
      }

      const active = intervals
        .filter((interval) => interval.startMs < endMs && interval.endMs > startMs)
        .sort((left, right) => left.itemId.localeCompare(right.itemId));

      if (active.length === 0) {
        continue;
      }

      const loadUnits = active.reduce((total, interval) => total + interval.units, 0);

      if (loadUnits <= resource.capacity) {
        continue;
      }

      const itemIds = sortIds(active.map((interval) => interval.itemId));
      const previous = conflictSegments[conflictSegments.length - 1];

      if (
        previous &&
        previous.endMs === startMs &&
        previous.loadUnits === loadUnits &&
        previous.itemIds.join('|') === itemIds.join('|')
      ) {
        previous.endMs = endMs;
        continue;
      }

      conflictSegments.push({
        startMs,
        endMs,
        itemIds,
        loadUnits,
      });
    }

    for (const segment of conflictSegments) {
      const overloadUnits = segment.loadUnits - resource.capacity;
      const ratio = resource.capacity > 0 ? overloadUnits / resource.capacity : 1;

      insights.push(
        createInsight({
          kind: 'capacity-conflict',
          subjectIds: [resource.id, ...segment.itemIds],
          severity: severityFromRatio(ratio),
          message: `Resource "${resource.id}" exceeds capacity by ${overloadUnits} unit(s).`,
          key: `${resource.id}:${segment.startMs}:${segment.endMs}:${segment.itemIds.join(',')}`,
          metadata: {
            resourceId: resource.id,
            conflictStart: formatIso(segment.startMs),
            conflictEnd: formatIso(segment.endMs),
            loadUnits: segment.loadUnits,
            capacity: resource.capacity,
            overloadUnits,
            itemIds: segment.itemIds,
            ratio: clampRatio(ratio),
          },
        }),
      );
    }
  }

  return insights;
}

function buildHardDependencyEdges(
  dependencies: Dependency[],
  anchoredById: Map<string, AnchoredItem>,
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  for (const dependency of dependencies) {
    if (!dependency.hard) {
      continue;
    }

    if (!anchoredById.has(dependency.fromId) || !anchoredById.has(dependency.toId)) {
      continue;
    }

    edges.push({
      dependencyId: dependency.id,
      fromId: dependency.fromId,
      toId: dependency.toId,
    });
  }

  return edges.sort((left, right) => {
    const byFrom = left.fromId.localeCompare(right.fromId);

    if (byFrom !== 0) {
      return byFrom;
    }

    const byTo = left.toId.localeCompare(right.toId);

    if (byTo !== 0) {
      return byTo;
    }

    return left.dependencyId.localeCompare(right.dependencyId);
  });
}

function buildAdjacency(nodes: string[], edges: DependencyEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node, []);
  }

  for (const edge of edges) {
    const list = adjacency.get(edge.fromId);

    if (!list || list.includes(edge.toId)) {
      continue;
    }

    list.push(edge.toId);
  }

  for (const [node, list] of adjacency.entries()) {
    adjacency.set(
      node,
      [...list].sort((left, right) => left.localeCompare(right)),
    );
  }

  return adjacency;
}

function computeStronglyConnectedComponents(nodes: string[], adjacency: Map<string, string[]>): string[][] {
  const components: string[][] = [];
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indexByNode = new Map<string, number>();
  const lowLinkByNode = new Map<string, number>();
  let index = 0;

  function strongConnect(node: string): void {
    indexByNode.set(node, index);
    lowLinkByNode.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    const neighbors = adjacency.get(node) ?? [];

    for (const neighbor of neighbors) {
      if (!indexByNode.has(neighbor)) {
        strongConnect(neighbor);
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node) ?? 0, lowLinkByNode.get(neighbor) ?? 0));
      } else if (onStack.has(neighbor)) {
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node) ?? 0, indexByNode.get(neighbor) ?? 0));
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) {
      return;
    }

    const component: string[] = [];

    while (stack.length > 0) {
      const popped = stack.pop();

      if (!popped) {
        break;
      }

      onStack.delete(popped);
      component.push(popped);

      if (popped === node) {
        break;
      }
    }

    components.push(component.sort((left, right) => left.localeCompare(right)));
  }

  for (const node of nodes) {
    if (!indexByNode.has(node)) {
      strongConnect(node);
    }
  }

  return components;
}

function buildPathKey(componentIndexes: number[], components: GraphComponent[]): string {
  return componentIndexes
    .flatMap((componentIndex) => components[componentIndex].itemIds)
    .join('|');
}

function createComponentPath(componentIndexes: number[], components: GraphComponent[]): ComponentPath {
  const totalDurationMs = componentIndexes.reduce(
    (total, componentIndex) => total + components[componentIndex].weightMs,
    0,
  );

  return {
    componentIndexes,
    totalDurationMs,
    pathKey: buildPathKey(componentIndexes, components),
  };
}

function isCandidateBetterPath(candidate: ComponentPath, current: ComponentPath | undefined): boolean {
  if (!current) {
    return true;
  }

  if (candidate.totalDurationMs !== current.totalDurationMs) {
    return candidate.totalDurationMs > current.totalDurationMs;
  }

  return candidate.pathKey.localeCompare(current.pathKey) < 0;
}

function insertAvailableComponent(
  queue: number[],
  componentIndex: number,
  components: GraphComponent[],
): void {
  queue.push(componentIndex);
  queue.sort((left, right) => components[left].key.localeCompare(components[right].key));
}

function topologicalSortComponents(components: GraphComponent[]): number[] {
  const indegree = new Array<number>(components.length).fill(0);

  for (const component of components) {
    for (const outgoingIndex of component.outgoing) {
      indegree[outgoingIndex] += 1;
    }
  }

  const queue: number[] = [];

  for (let index = 0; index < components.length; index += 1) {
    if (indegree[index] === 0) {
      insertAvailableComponent(queue, index, components);
    }
  }

  const order: number[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined) {
      continue;
    }

    order.push(current);

    for (const outgoingIndex of components[current].outgoing) {
      indegree[outgoingIndex] -= 1;

      if (indegree[outgoingIndex] === 0) {
        insertAvailableComponent(queue, outgoingIndex, components);
      }
    }
  }

  return order;
}

function deriveCriticalSequence(
  anchoredById: Map<string, AnchoredItem>,
  dependencies: Dependency[],
): CriticalSequenceResult | null {
  const nodes = [...anchoredById.keys()].sort((left, right) => left.localeCompare(right));

  if (nodes.length === 0) {
    return null;
  }

  const edges = buildHardDependencyEdges(dependencies, anchoredById);
  const adjacency = buildAdjacency(nodes, edges);
  const componentsRaw = computeStronglyConnectedComponents(nodes, adjacency).sort((left, right) =>
    left.join('|').localeCompare(right.join('|')),
  );
  const itemToComponentIndex = new Map<string, number>();

  for (let index = 0; index < componentsRaw.length; index += 1) {
    const itemIds = componentsRaw[index];

    for (const itemId of itemIds) {
      itemToComponentIndex.set(itemId, index);
    }
  }

  const selfLoopNodes = new Set(
    edges.filter((edge) => edge.fromId === edge.toId).map((edge) => edge.fromId),
  );
  const components: GraphComponent[] = componentsRaw.map((itemIds) => ({
    key: itemIds.join('|'),
    itemIds,
    weightMs: itemIds.reduce((total, itemId) => total + (anchoredById.get(itemId)?.durationMs ?? 0), 0),
    hasCycle: itemIds.length > 1 || selfLoopNodes.has(itemIds[0]),
    outgoing: [],
  }));

  const outgoingSets = Array.from({ length: components.length }, () => new Set<number>());

  for (const edge of edges) {
    const fromComponentIndex = itemToComponentIndex.get(edge.fromId);
    const toComponentIndex = itemToComponentIndex.get(edge.toId);

    if (
      fromComponentIndex === undefined ||
      toComponentIndex === undefined ||
      fromComponentIndex === toComponentIndex
    ) {
      continue;
    }

    outgoingSets[fromComponentIndex].add(toComponentIndex);
  }

  for (let index = 0; index < components.length; index += 1) {
    components[index].outgoing = [...outgoingSets[index]].sort((left, right) =>
      components[left].key.localeCompare(components[right].key),
    );
  }

  const topologicalOrder = topologicalSortComponents(components);
  const bestPaths: Array<ComponentPath | undefined> = new Array(components.length).fill(undefined);

  for (const componentIndex of topologicalOrder) {
    const basePath = bestPaths[componentIndex] ?? createComponentPath([componentIndex], components);
    bestPaths[componentIndex] = basePath;

    for (const outgoingIndex of components[componentIndex].outgoing) {
      const candidate = createComponentPath(
        [...basePath.componentIndexes, outgoingIndex],
        components,
      );

      if (isCandidateBetterPath(candidate, bestPaths[outgoingIndex])) {
        bestPaths[outgoingIndex] = candidate;
      }
    }
  }

  let bestPath: ComponentPath | undefined;

  for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
    const candidate = bestPaths[componentIndex] ?? createComponentPath([componentIndex], components);

    if (isCandidateBetterPath(candidate, bestPath)) {
      bestPath = candidate;
    }
  }

  if (!bestPath) {
    return null;
  }

  const itemIds = bestPath.componentIndexes.flatMap((componentIndex) => components[componentIndex].itemIds);
  const hasCycle = bestPath.componentIndexes.some((componentIndex) => components[componentIndex].hasCycle);

  return {
    itemIds,
    totalDurationMs: bestPath.totalDurationMs,
    componentCount: bestPath.componentIndexes.length,
    hasCycle,
  };
}

function collectCriticalInsight(
  criticalSequence: CriticalSequenceResult | null,
  planDurationMs: number,
): Insight | null {
  if (!criticalSequence || criticalSequence.itemIds.length === 0) {
    return null;
  }

  const ratio = criticalSequence.totalDurationMs / Math.max(1, planDurationMs);

  return createInsight({
    kind: 'critical',
    subjectIds: criticalSequence.itemIds,
    severity: severityFromRatio(ratio),
    message: `Critical sequence spans ${criticalSequence.itemIds.length} work item(s).`,
    key: criticalSequence.itemIds.join('>'),
    metadata: {
      orderedItemIds: criticalSequence.itemIds,
      totalDurationMs: criticalSequence.totalDurationMs,
      componentCount: criticalSequence.componentCount,
      hasCycle: criticalSequence.hasCycle,
      ratio: clampRatio(ratio),
    },
  });
}

export function deriveHarmonyInsights(
  plan: Pick<Plan, 'range' | 'items' | 'dependencies' | 'resources'>,
  options: HarmonyInsightOptions = {},
): HarmonyInsightsResult {
  const items = [...plan.items].sort(compareById);
  const dependencies = [...plan.dependencies].sort(compareById);
  const resources = [...plan.resources].sort(compareById);
  const dependencyResolution =
    options.dependencyResolution ?? evaluateDependencyResolution({ items, dependencies });
  const issues: HarmonyInsightIssue[] = [];

  addDependencyIssues(dependencyResolution.issues, issues);

  const anchoredItems = collectAnchoredItems(items, dependencyResolution, issues);
  const anchoredById = new Map(anchoredItems.map((anchored) => [anchored.item.id, anchored]));
  const planDurationMs = resolvePlanDurationMs(plan.range, anchoredItems, issues);
  const insights: Insight[] = [];

  insights.push(...collectBlockedInsights(dependencyResolution, anchoredById));
  insights.push(...collectOverlapAndGapInsights(anchoredItems));
  insights.push(...collectDriftInsights(anchoredItems, issues));
  insights.push(...collectCapacityConflictInsights(resources, anchoredItems, issues));

  const criticalSequence = deriveCriticalSequence(anchoredById, dependencies);
  const criticalInsight = collectCriticalInsight(criticalSequence, planDurationMs);

  if (criticalInsight) {
    insights.push(criticalInsight);
  }

  return {
    insights: [...insights].sort((left, right) => left.id.localeCompare(right.id)),
    criticalSequence,
    dependencyResolution,
    issues: [...issues].sort(compareIssues),
  };
}
