# Design Decisions

## Decision 1: Product Scope Stays Universal

**Date**: 2026-03-07  
**Decision**: Harmonogram will be positioned as a universal planning surface, with crop tracking treated as the first reference implementation rather than the core domain model.  
**Rationale**: This keeps the public contract broadly useful while still allowing a strong real-world use case to shape the design.  
**Alternatives Considered**: Building a crop-only planner first; building a generic project-management clone.

## Decision 2: Public Runtime Must Be Framework-Agnostic

**Date**: 2026-03-07  
**Decision**: The product will ship as standards-based web components with no required framework runtime for consumers.  
**Rationale**: Adoption friction drops sharply when the component works in raw HTML and in any framework host without wrappers being mandatory.  
**Alternatives Considered**: React-first component library; Lit as a public peer dependency; framework-specific packages.

## Decision 3: Separate Product Requirements From Delivery Order

**Date**: 2026-03-07  
**Decision**: The old PRD's work-package list is replaced by a product-first specification plus a dedicated implementation plan and work-package breakdown.  
**Rationale**: The original document mixed "what we are building" with "how we might code it," which made prioritization and architecture drift harder to manage.  
**Alternatives Considered**: Keeping a single blended PRD/implementation doc.

## Decision 4: Headless Scheduling Logic Is A Required Architectural Boundary

**Date**: 2026-03-07  
**Decision**: Schedule math, dependency logic, and harmony insight generation will live in a headless core separate from rendering and element composition.  
**Rationale**: This keeps the hardest logic testable, reusable, and independent of DOM concerns.  
**Alternatives Considered**: A single custom element owning both schedule logic and rendering.

## Decision 5: Initial Release Focuses On Embeddable Planning Value

**Date**: 2026-03-07  
**Decision**: Initial release scope prioritizes embeddable planning, visual insight, editing hooks, packaging quality, and one reference implementation over deep collaboration or broad third-party integrations.  
**Rationale**: The fastest path to a credible product is a great core surface with clean contracts, not a large integration matrix.  
**Alternatives Considered**: Building collaboration and external connectors into v1.

## Decision 6: V1 Supports Both Local And Host-Controlled Editing

**Date**: 2026-03-07  
**Decision**: Interactive mode in v1 will support both local-only planning sessions and host-controlled edit flows.  
**Rationale**: This lets teams prototype and inspect edits in isolation while still supporting serious product integrations where the host owns persistence and policy.  
**Alternatives Considered**: Local-only editing; host-controlled editing only.

## Decision 7: Initial Export Set Is Narrow And Practical

**Date**: 2026-03-07  
**Decision**: The required v1 export formats are `JSON`, `CSV`, and `PNG`.  
**Rationale**: These cover structured interchange, spreadsheet/report workflows, and visual sharing without bloating the first release.  
**Alternatives Considered**: Adding `PDF` in v1; supporting every listed export from the start.

## Decision 8: Crop Reference Example Uses Farm Group -> Field -> Operation

**Date**: 2026-03-07  
**Decision**: The crop-tracking reference implementation will model a planted farm group as the overall plan, use fields as the primary planning lanes, and represent operations as work items within those fields.  
**Rationale**: This matches the user-described planning grain closely while preserving a universal data model.  
**Alternatives Considered**: Block-first planning; operation-run-only lanes; crop-specific core entities.

## Decision 9: V1 Includes Baseline And A Single Active Projection

**Date**: 2026-03-07  
**Decision**: The initial release will support a baseline/planned state, actual execution state, and one active projected state, while deferring multi-scenario forecasting to a later phase.  
**Rationale**: This preserves the core value of drift and risk visibility without dragging v1 into complex scenario-management UX and data contracts.  
**Alternatives Considered**: Deferring projections entirely; building multi-scenario forecasting into v1.

## Decision 10: WP4 Insight Semantics Are Deterministic And Resource-Centric

**Date**: 2026-03-08  
**Decision**: WP4 will implement `gap`, `overlap`, `blocked`, `drift`, `capacity-conflict`, and `critical` insights only; capacity conflicts are computed from resource assignment units against `resource.capacity` with missing units defaulting to `1`; severity uses deterministic ratio tiers (`<10% low`, `10-24.99% medium`, `25-49.99% high`, `>=50% critical`).  
**Rationale**: This keeps WP4 aligned with current task scope while ensuring deterministic, testable outputs and actionable capacity behavior without introducing domain-specific overrides.  
**Alternatives Considered**: Including `window-risk` in WP4; lane-only capacity rules; fixed severity by kind.

## Decision 11: WP6 Uses A Pure View-Model Projection For Timeline And Segment Geometry

**Date**: 2026-03-08  
**Decision**: Timeline ticks, marker placement, lane grouping, and segment geometry are derived in `board-view-model.ts` as pure functions; `<harmonogram-board>` consumes this projection and focuses on DOM/event wiring only.  
**Rationale**: This preserves deterministic rendering behavior, keeps DOM logic simple, and makes timeline/segment behavior easy to test without UI coupling.  
**Alternatives Considered**: Computing geometry directly inside element render loops; introducing canvas-based rendering in WP6.

## Decision 12: WP7 Keeps Dependency Semantics In The View Model And Expands Selection To Relationships

**Date**: 2026-03-08  
**Decision**: Dependency overlay geometry, satisfaction state, and critical-sequence emphasis are derived in `board-view-model.ts` from the core dependency/harmony engine; the board selection contract now optionally carries `dependencyIds` so relationship inspection can be externally controlled without adding a second selection channel.  
**Rationale**: This keeps scheduling logic out of the custom element, preserves a single semantic selection surface for hosts, and makes dependency rendering/inspection easy to verify with browser tests.  
**Alternatives Considered**: Measuring DOM positions to compute overlay geometry inside the element; introducing a separate dependency-specific selection API; deferring selection-controlled inspection until a later work package.

## Decision 13: WP8 Uses Explicit Editing Modes With Event-First Local Mutations

**Date**: 2026-03-08  
**Decision**: `<harmonogram-board>` now supports an explicit `editingMode` (`controlled` default, `local` optional). In both modes, edit intents dispatch `harmonogram-edit-request`; local mode applies deterministic in-element mutations (`create`, `update`, `move`, `resize`, `split`, `delete`) and records bounded undo/redo snapshots, while controlled mode never mutates plan state and leaves persistence authoritative to the host.  
**Rationale**: This keeps a single semantic edit channel, preserves host authority by default, and still enables standalone local planning sessions with predictable history behavior for demos and exploratory workflows.  
**Alternatives Considered**: Local-only edits without emitted requests; controlled-only edits with no local history path; separate APIs/events for local vs controlled editing.

## Decision 14: WP9 Keeps Organizing/Filtering Semantics In The Pure Board View Model

**Date**: 2026-03-09  
**Decision**: Organizing modes (`lane`, `hierarchy`, `resource`, `phase`), collapse state (`collapsedLaneIds`), and focus/search filters (`query`, `resourceIds`, `phases`, `focusedItemId`) are derived in `board-view-model.ts` as pure projection logic; `<harmonogram-board>` only orchestrates filter state and DOM controls/events (including collapse toggles and focus/filter actions).  
**Rationale**: This preserves deterministic behavior, keeps grouping/filter complexity testable without DOM coupling, and avoids mixing schedule-view semantics with rendering concerns.  
**Alternatives Considered**: Building grouping/collapse logic directly inside render methods; splitting resource/phase grouping into separate board components; deferring focus scoping until WP10.

## Decision 15: WP10 Uses Keyboard-First Interaction And Bounded Rendering Budgets

**Date**: 2026-03-09  
**Decision**: `<harmonogram-board>` now supports keyboard-driven inspection/edit shortcuts (`Arrow` navigation, `Home/End`, `E`, `Delete/Backspace`, `F`, `Escape`) with live announcements via a polite `aria-live` region, and `board-view-model.ts` enforces bounded rendering budgets (`MAX_RENDERED_ITEMS` and `MAX_RENDERED_ITEMS_PER_LANE`) while preserving full logical counts for analysis.  
**Rationale**: This delivers essential keyboard parity and screen-reader feedback without coupling business logic to DOM behavior, and keeps large-plan rendering predictable by capping DOM pressure while retaining complete derived-state visibility.  
**Alternatives Considered**: Postponing keyboard parity until a later package; relying on pointer-only interactions; full viewport virtualization before data-volume evidence.

## Decision 16: WP11 Separates Typed ESM, Side-Effect Registration, And Browser Bundle Contracts

**Date**: 2026-03-09  
**Decision**: `@harmonogram/elements` now publishes three explicit contracts: typed ESM (`.`), side-effect registration (`./register`), and a self-registering browser bundle (`./bundle` -> `dist/harmonogram-elements.js`), validated by dedicated package smoke tests (`npm run test:smoke --workspace @harmonogram/elements`).  
**Rationale**: This keeps integrator expectations explicit across bundler and script-tag environments, reduces accidental side-effect ambiguity, and gives release checks a deterministic package-level quality gate.  
**Alternatives Considered**: Single entrypoint only; no browser bundle contract; manual release checks without automated smoke tests.

## Decision 17: WP12 Models Crop Tracking As Metadata Conventions On Universal Contracts

**Date**: 2026-03-09  
**Decision**: The crop reference implementation maps farm group -> field -> operation entirely through existing universal model entities, with crop semantics encoded in metadata (`farmGroupId`, `fieldId`, `crop`, `variety`, `operationType`, `phase`) and seasonal windows represented as standard markers.  
**Rationale**: This proves crop tracking can be first-class without introducing crop-only core types or runtime forks, preserving cross-domain portability while still delivering realistic field operations behavior.  
**Alternatives Considered**: Adding crop-specific core entities; embedding agronomic domain rules in core runtime; lane models coupled to crop-only identifiers.

## Decision 18: WP13 Uses First-Class Playwright E2E Coverage As A Required CI Gate

**Date**: 2026-03-09  
**Decision**: The repository will add root-level Playwright (`@playwright/test`) E2E coverage for `vanilla`, `framework-host`, and `crop-tracking` example pages, and make that suite a required pull-request CI gate with trace/report artifacts on failure.  
**Rationale**: Existing browser integration tests validate component internals, but they do not validate full-page integrations or host wiring. A dedicated E2E gate closes that gap and directly protects integrator-facing examples.  
**Alternatives Considered**: Continue with Web Test Runner-only integration coverage; manual example smoke checks without CI enforcement; visual-only snapshot checks without runtime interaction assertions.

## Confirmed Assumptions

- Direct npm installation is the primary distribution target, with CDN/script-tag support required as a second delivery path.
- Interactive mode will use a controlled-event model so hosts can choose whether edits are local-only or persisted externally.
- The initial reference implementation should demonstrate crop planning around a planted farm group, with fields as primary lanes and operations as work items, without baking crop-specific rules into the core API.

## Current Planning Position

There are no blocking clarification gaps for the foundation phase. The current plan assumes:

- baseline/planned, actual, and single-projection support in v1,
- both local and host-controlled editing flows,
- `JSON`, `CSV`, and `PNG` as the initial export set,
- a crop reference example modeled as farm group -> field -> operation.
