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

## Assumptions Pending Confirmation

- Direct npm installation is the primary distribution target, with CDN/script-tag support required as a second delivery path.
- Interactive mode will use a controlled-event model so hosts can choose whether edits are local-only or persisted externally.
- The initial reference implementation should demonstrate crop planning at the field/block level, but not bake crop-specific rules into the core API.

## Clarifications Needed Before Implementation Starts

1. Should the initial release prioritize local-only editing, host-controlled editing, or both from day one?
2. Which export formats are truly required in v1: `JSON`, `CSV`, `PNG`, `PDF`, or another subset?
3. For crop tracking, do you want the first reference example centered on fields, blocks, varieties, or operational runs?
4. Is direct support for baselines and forecast scenarios mandatory in v1, or acceptable as a phased follow-up after the core planned/actual model lands?
