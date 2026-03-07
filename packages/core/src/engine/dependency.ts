import type { DependencyRelationship, Plan, Segment, WorkItem, WorkItemSnapshot } from '../contracts/model.js';

type BoundaryKind = 'start' | 'end';

export type DependencyAnchorSource = 'planned-segments' | 'baseline' | 'projection' | 'actual' | 'segments-envelope';

export interface DependencyAnchorRange {
  start: string;
  end: string;
  source: DependencyAnchorSource;
}

export interface DependencyEvaluation {
  dependencyId: string;
  fromId: string;
  toId: string;
  relationship: DependencyRelationship;
  lag: number;
  hard: boolean;
  requiredBoundary: string;
  actualBoundary: string;
  satisfied: boolean;
  violationMs: number;
}

export type BlockedReasonType = 'violation' | 'upstream-blocked';

export interface BlockedReason {
  dependencyId: string;
  fromId: string;
  type: BlockedReasonType;
}

export interface ItemBlockedState {
  itemId: string;
  blocked: boolean;
  reasons: BlockedReason[];
}

export type DependencyResolutionIssueCode = 'missing-item' | 'missing-time-range' | 'invalid-time-range' | 'invalid-relationship';

export interface DependencyResolutionIssue {
  code: DependencyResolutionIssueCode;
  message: string;
  dependencyId?: string;
  itemId?: string;
}

export interface DependencyResolutionResult {
  itemAnchors: Record<string, DependencyAnchorRange>;
  dependencyResults: DependencyEvaluation[];
  blockedStates: Record<string, ItemBlockedState>;
  blockedItemIds: string[];
  issues: DependencyResolutionIssue[];
}

interface AnchorRangeMs {
  startMs: number;
  endMs: number;
  source: DependencyAnchorSource;
}

interface RelationshipRule {
  fromBoundary: BoundaryKind;
  toBoundary: BoundaryKind;
}

interface DependencyEdge {
  dependencyId: string;
  fromId: string;
  toId: string;
}

interface BlockedStateMutable {
  reasons: BlockedReason[];
}

const RELATIONSHIP_RULES: Record<DependencyRelationship, RelationshipRule> = {
  FS: { fromBoundary: 'end', toBoundary: 'start' },
  SS: { fromBoundary: 'start', toBoundary: 'start' },
  FF: { fromBoundary: 'end', toBoundary: 'end' },
  SF: { fromBoundary: 'start', toBoundary: 'end' },
};

function compareById(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id);
}

function toIso(millis: number): string {
  return new Date(millis).toISOString();
}

function parseIsoMillis(
  value: string,
  issueContext: { itemId: string; issues: DependencyResolutionIssue[]; path: string },
): number | undefined {
  const millis = Date.parse(value);

  if (!Number.isFinite(millis)) {
    issueContext.issues.push({
      code: 'invalid-time-range',
      itemId: issueContext.itemId,
      message: `${issueContext.path} must be a valid ISO-8601 date-time string`,
    });
    return undefined;
  }

  return millis;
}

function parseRange(
  start: string,
  end: string,
  issueContext: { itemId: string; issues: DependencyResolutionIssue[]; path: string },
): { startMs: number; endMs: number } | undefined {
  const startMs = parseIsoMillis(start, issueContext);
  const endMs = parseIsoMillis(end, issueContext);

  if (startMs === undefined || endMs === undefined) {
    return undefined;
  }

  if (startMs > endMs) {
    issueContext.issues.push({
      code: 'invalid-time-range',
      itemId: issueContext.itemId,
      message: `${issueContext.path} start must be before or equal to end`,
    });
    return undefined;
  }

  return { startMs, endMs };
}

function parseSegmentRanges(item: WorkItem, issues: DependencyResolutionIssue[]): Array<{ startMs: number; endMs: number; kind: Segment['segmentKind'] }> {
  const ranges: Array<{ startMs: number; endMs: number; kind: Segment['segmentKind'] }> = [];

  for (const [index, segment] of item.segments.entries()) {
    const parsed = parseRange(segment.start, segment.end, {
      itemId: item.id,
      issues,
      path: `items[${item.id}].segments[${index}]`,
    });

    if (!parsed) {
      continue;
    }

    ranges.push({
      startMs: parsed.startMs,
      endMs: parsed.endMs,
      kind: segment.segmentKind,
    });
  }

  return ranges;
}

function envelopeRange(
  ranges: Array<{ startMs: number; endMs: number }>,
  source: DependencyAnchorSource,
): AnchorRangeMs | undefined {
  if (ranges.length === 0) {
    return undefined;
  }

  let startMs = Number.POSITIVE_INFINITY;
  let endMs = Number.NEGATIVE_INFINITY;

  for (const range of ranges) {
    if (range.startMs < startMs) {
      startMs = range.startMs;
    }

    if (range.endMs > endMs) {
      endMs = range.endMs;
    }
  }

  return {
    startMs,
    endMs,
    source,
  };
}

function snapshotRange(
  item: WorkItem,
  snapshot: WorkItemSnapshot | undefined,
  source: DependencyAnchorSource,
  issues: DependencyResolutionIssue[],
): AnchorRangeMs | undefined {
  if (!snapshot) {
    return undefined;
  }

  const parsed = parseRange(snapshot.start, snapshot.end, {
    itemId: item.id,
    issues,
    path: `items[${item.id}].${source}`,
  });

  if (!parsed) {
    return undefined;
  }

  return {
    startMs: parsed.startMs,
    endMs: parsed.endMs,
    source,
  };
}

function resolveItemAnchor(item: WorkItem, issues: DependencyResolutionIssue[]): AnchorRangeMs | undefined {
  const segmentRanges = parseSegmentRanges(item, issues);
  const plannedRanges = segmentRanges.filter((segment) => segment.kind === 'planned' || segment.kind === 'pause');
  const plannedEnvelope = envelopeRange(plannedRanges, 'planned-segments');

  if (plannedEnvelope) {
    return plannedEnvelope;
  }

  const baseline = snapshotRange(item, item.baseline, 'baseline', issues);

  if (baseline) {
    return baseline;
  }

  const projection = snapshotRange(item, item.projection, 'projection', issues);

  if (projection) {
    return projection;
  }

  const actual = snapshotRange(item, item.actual, 'actual', issues);

  if (actual) {
    return actual;
  }

  return envelopeRange(segmentRanges, 'segments-envelope');
}

function boundaryMillis(range: AnchorRangeMs, boundary: BoundaryKind): number {
  return boundary === 'start' ? range.startMs : range.endMs;
}

function addBlockedReason(state: BlockedStateMutable, reason: BlockedReason): boolean {
  const duplicate = state.reasons.some((existing) => {
    return (
      existing.dependencyId === reason.dependencyId &&
      existing.fromId === reason.fromId &&
      existing.type === reason.type
    );
  });

  if (duplicate) {
    return false;
  }

  state.reasons.push(reason);
  return true;
}

function sortReasons(reasons: BlockedReason[]): BlockedReason[] {
  return [...reasons].sort((left, right) => {
    const byDependency = left.dependencyId.localeCompare(right.dependencyId);

    if (byDependency !== 0) {
      return byDependency;
    }

    const byType = left.type.localeCompare(right.type);

    if (byType !== 0) {
      return byType;
    }

    return left.fromId.localeCompare(right.fromId);
  });
}

export function evaluateDependencyResolution(
  plan: Pick<Plan, 'items' | 'dependencies'>,
): DependencyResolutionResult {
  const issues: DependencyResolutionIssue[] = [];
  const items = [...plan.items].sort(compareById);
  const dependencies = [...plan.dependencies].sort(compareById);
  const itemLookup = new Map<string, WorkItem>();
  const itemAnchorsMs = new Map<string, AnchorRangeMs>();
  const itemAnchors: Record<string, DependencyAnchorRange> = {};

  for (const item of items) {
    itemLookup.set(item.id, item);

    const anchor = resolveItemAnchor(item, issues);

    if (!anchor) {
      continue;
    }

    itemAnchorsMs.set(item.id, anchor);
    itemAnchors[item.id] = {
      start: toIso(anchor.startMs),
      end: toIso(anchor.endMs),
      source: anchor.source,
    };
  }

  const blockedStatesMutable = new Map<string, BlockedStateMutable>();

  for (const item of items) {
    blockedStatesMutable.set(item.id, { reasons: [] });
  }

  const dependencyResults: DependencyEvaluation[] = [];
  const hardEdges: DependencyEdge[] = [];

  for (const dependency of dependencies) {
    const fromItem = itemLookup.get(dependency.fromId);
    const toItem = itemLookup.get(dependency.toId);

    if (!fromItem) {
      issues.push({
        code: 'missing-item',
        dependencyId: dependency.id,
        itemId: dependency.fromId,
        message: `dependency ${dependency.id} references missing from item "${dependency.fromId}"`,
      });
      continue;
    }

    if (!toItem) {
      issues.push({
        code: 'missing-item',
        dependencyId: dependency.id,
        itemId: dependency.toId,
        message: `dependency ${dependency.id} references missing to item "${dependency.toId}"`,
      });
      continue;
    }

    const fromAnchor = itemAnchorsMs.get(dependency.fromId);
    const toAnchor = itemAnchorsMs.get(dependency.toId);

    if (!fromAnchor) {
      issues.push({
        code: 'missing-time-range',
        dependencyId: dependency.id,
        itemId: dependency.fromId,
        message: `dependency ${dependency.id} cannot evaluate because from item "${dependency.fromId}" has no usable time range`,
      });
      continue;
    }

    if (!toAnchor) {
      issues.push({
        code: 'missing-time-range',
        dependencyId: dependency.id,
        itemId: dependency.toId,
        message: `dependency ${dependency.id} cannot evaluate because to item "${dependency.toId}" has no usable time range`,
      });
      continue;
    }

    const rule = RELATIONSHIP_RULES[dependency.relationship];

    if (!rule) {
      issues.push({
        code: 'invalid-relationship',
        dependencyId: dependency.id,
        message: `dependency ${dependency.id} uses unsupported relationship "${dependency.relationship}"`,
      });
      continue;
    }

    const requiredBoundaryMs = boundaryMillis(fromAnchor, rule.fromBoundary) + dependency.lag;
    const actualBoundaryMs = boundaryMillis(toAnchor, rule.toBoundary);
    const satisfied = actualBoundaryMs >= requiredBoundaryMs;
    const violationMs = satisfied ? 0 : requiredBoundaryMs - actualBoundaryMs;

    dependencyResults.push({
      dependencyId: dependency.id,
      fromId: dependency.fromId,
      toId: dependency.toId,
      relationship: dependency.relationship,
      lag: dependency.lag,
      hard: dependency.hard,
      requiredBoundary: toIso(requiredBoundaryMs),
      actualBoundary: toIso(actualBoundaryMs),
      satisfied,
      violationMs,
    });

    if (dependency.hard) {
      hardEdges.push({
        dependencyId: dependency.id,
        fromId: dependency.fromId,
        toId: dependency.toId,
      });
    }

    if (dependency.hard && !satisfied) {
      const blockedState = blockedStatesMutable.get(dependency.toId);

      if (blockedState) {
        addBlockedReason(blockedState, {
          dependencyId: dependency.id,
          fromId: dependency.fromId,
          type: 'violation',
        });
      }
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of hardEdges) {
      const fromState = blockedStatesMutable.get(edge.fromId);
      const toState = blockedStatesMutable.get(edge.toId);

      if (!fromState || !toState || fromState.reasons.length === 0) {
        continue;
      }

      const added = addBlockedReason(toState, {
        dependencyId: edge.dependencyId,
        fromId: edge.fromId,
        type: 'upstream-blocked',
      });

      if (added) {
        changed = true;
      }
    }
  }

  const blockedStates: Record<string, ItemBlockedState> = {};
  const blockedItemIds: string[] = [];

  for (const item of items) {
    const mutable = blockedStatesMutable.get(item.id) ?? { reasons: [] };
    const reasons = sortReasons(mutable.reasons);
    const blocked = reasons.length > 0;

    blockedStates[item.id] = {
      itemId: item.id,
      blocked,
      reasons,
    };

    if (blocked) {
      blockedItemIds.push(item.id);
    }
  }

  return {
    itemAnchors,
    dependencyResults,
    blockedStates,
    blockedItemIds,
    issues,
  };
}
