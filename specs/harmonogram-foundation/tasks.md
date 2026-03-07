# Task Breakdown: Harmonogram Foundation

## Work Package 0: Governance And Scaffold Reset
**Status**: available
**Owner**: none
**Dependencies**: []
**Estimated Effort**: 60-90 min

### Tasks:
- [ ] Create the multi-package workspace scaffold under `packages/`, `docs/`, and shared tooling directories.
- [ ] Preserve the current starter component behind characterization tests before moving files.
- [ ] Add or update scripts for workspace build, lint, test, and type-check flows.
- [ ] Wire package publishing expectations into repo structure and metadata.

**Verification**: Workspace installs cleanly, root scripts run, and starter behavior remains covered by tests.

---

## Work Package 1: Public Contracts And Validation Layer
**Status**: available
**Owner**: none
**Dependencies**: [WP0]
**Estimated Effort**: 60-90 min

### Tasks:
- [ ] Define the core public TypeScript contracts for plans, lanes, work items, segments, dependencies, resources, calendars, markers, and insights.
- [ ] Add structural validation/parsing helpers for external data input.
- [ ] Create contract-focused unit tests for valid and invalid payloads.

**Verification**: Contract tests pass and invalid inputs fail with actionable errors.

---

## Work Package 2: Calendar And Range Engine
**Status**: available
**Owner**: none
**Dependencies**: [WP1]
**Estimated Effort**: 60-120 min

### Tasks:
- [ ] Implement time-range primitives for sub-day through seasonal scales.
- [ ] Implement calendar rules, blackout windows, and exception handling.
- [ ] Add deterministic tests for time-zone and boundary behavior.

**Verification**: Calendar/range tests pass for edge cases, exceptions, and multiple scales.

---

## Work Package 3: Dependency Resolution Kernel
**Status**: available
**Owner**: none
**Dependencies**: [WP1, WP2]
**Estimated Effort**: 60-120 min

### Tasks:
- [ ] Implement dependency relationship modeling with offsets/buffers.
- [ ] Derive blocked-state and violation calculations.
- [ ] Add tests for relationship types and chain behavior.

**Verification**: Dependency engine tests pass for `FS`, `SS`, `FF`, `SF`, and lag scenarios.

---

## Work Package 4: Harmony Insights And Critical Sequence
**Status**: available
**Owner**: none
**Dependencies**: [WP2, WP3]
**Estimated Effort**: 60-120 min

### Tasks:
- [ ] Implement derived insights for gaps, overlaps, blocked work, drift, and capacity conflicts.
- [ ] Implement critical-sequence detection for plan interpretation.
- [ ] Add unit tests that prove deterministic insight output from fixed inputs.

**Verification**: Insight and critical-sequence tests pass on representative datasets.

---

## Work Package 5: Root Element And View Model [PARALLEL_OK]
**Status**: available
**Owner**: none
**Dependencies**: [WP1, WP2]
**Estimated Effort**: 60-120 min

### Tasks:
- [ ] Create the root `<harmonogram-board>` element with typed inputs and semantic event outputs.
- [ ] Implement read-only and interactive mode boundaries.
- [ ] Add browser tests for registration, rendering, and public event dispatch.

**Verification**: Browser integration tests confirm element registration, data binding, and public events.

---

## Work Package 6: Timeline, Lanes, And Segmented Item Rendering
**Status**: available
**Owner**: none
**Dependencies**: [WP5]
**Estimated Effort**: 90-120 min

### Tasks:
- [ ] Render multi-scale timeline headers and markers.
- [ ] Render lanes and segmented work items from core view state.
- [ ] Expose CSS parts/custom properties for theming without leaking internals.

**Verification**: Visual/browser tests pass for multi-scale timeline rendering and segmented items.

---

## Work Package 7: Dependency Overlay And Inspection [PARALLEL_OK]
**Status**: available
**Owner**: none
**Dependencies**: [WP3, WP5, WP6]
**Estimated Effort**: 60-90 min

### Tasks:
- [ ] Render dependency paths and critical-sequence emphasis.
- [ ] Support hover/selection inspection for dependency relationships.
- [ ] Add tests for overlay updates when selection or data changes.

**Verification**: Overlay tests pass for relationship rendering and interaction state updates.

---

## Work Package 8: Controlled Editing And Local History
**Status**: available
**Owner**: none
**Dependencies**: [WP4, WP5, WP6]
**Estimated Effort**: 90-120 min

### Tasks:
- [ ] Implement edit-request flows for move, resize, split, create, and delete actions.
- [ ] Add local undo/redo history for interactive sessions.
- [ ] Verify controlled-mode behavior so hosts remain authoritative over persistence.

**Verification**: Interaction tests confirm edit requests, local history, and controlled-state boundaries.

---

## Work Package 9: Organizing Views, Filters, And Hierarchy [PARALLEL_OK]
**Status**: available
**Owner**: none
**Dependencies**: [WP5, WP6]
**Estimated Effort**: 90-120 min

### Tasks:
- [ ] Implement hierarchical grouping and collapse/expand behavior.
- [ ] Implement filtering, search, and focus tools.
- [ ] Add tests for resource, phase, and hierarchy-based reorganization.

**Verification**: Browser and unit tests pass for filtering and hierarchy state changes.

---

## Work Package 10: Accessibility And Performance Hardening
**Status**: available
**Owner**: none
**Dependencies**: [WP6, WP7, WP8, WP9]
**Estimated Effort**: 90-120 min

### Tasks:
- [ ] Add keyboard navigation for the essential inspection and editing flows.
- [ ] Add accessibility coverage for focus, semantics, and announcements.
- [ ] Implement virtualization or equivalent rendering discipline for large datasets.

**Verification**: Accessibility checks pass and large-plan performance smoke tests meet agreed thresholds.

---

## Work Package 11: Packaging, Examples, And Release Readiness
**Status**: available
**Owner**: none
**Dependencies**: [WP5, WP6]
**Estimated Effort**: 60-120 min

### Tasks:
- [ ] Ship typed ESM outputs and a self-registering browser bundle.
- [ ] Create raw HTML and framework-host examples that use the same public contract.
- [ ] Create publishing and package-contract smoke tests.
- [ ] Document installation, usage, theming, and extension points.

**Verification**: Package smoke tests pass for npm import and script-tag usage, and examples render successfully.

---

## Work Package 12: Crop Tracking Reference Implementation
**Status**: available
**Owner**: none
**Dependencies**: [WP4, WP9, WP11]
**Estimated Effort**: 90-120 min

### Tasks:
- [ ] Create a crop-tracking example dataset organized by field/block or the confirmed planning grain.
- [ ] Demonstrate planned vs actual vs projected operations and seasonal windows.
- [ ] Document which parts are universal core and which parts are crop-specific overlay conventions.

**Verification**: The reference example demonstrates crop planning without core API forks or crop-only runtime code.
