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
