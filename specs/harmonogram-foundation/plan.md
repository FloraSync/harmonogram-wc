# Implementation Plan: Harmonogram Foundation

## Architecture Overview

The current repository is a starter custom element package. The target architecture should become a layered npm workspace that cleanly separates schedule logic from rendering and package distribution concerns.

### Target Repository Shape

```text
/
+-- .specify/
+-- specs/
+-- packages/
|   +-- core/          # Pure scheduling types, engine, calculators, selectors
|   +-- elements/      # Standards-based custom elements and visual primitives
|   `-- examples/      # Reference apps and domain demos
+-- docs/              # Integrator-facing docs and API references
`-- tooling/           # Shared build/test/release configuration
```

## Technical Direction

### 1. Headless Core

`packages/core` owns:

- domain contracts,
- scheduling calculations,
- dependency resolution,
- harmony/insight derivation,
- state transition helpers,
- serialization boundaries.

This package must remain DOM-free and easy to test.

### 2. Element Layer

`packages/elements` owns:

- the root planning surface element,
- composable presentation primitives,
- event dispatch contracts,
- theming hooks,
- accessibility and interaction wiring,
- viewport/virtualization behavior.

This layer consumes the headless core and should not re-implement planning rules.

### 3. Reference Examples

`packages/examples` owns:

- raw HTML usage,
- at least one framework-hosted usage example,
- a crop-tracking reference scenario centered on planted farm groups, fields, and operations,
- packaging smoke tests and integration fixtures.

Examples are validation tools, not sources of truth.

## Tech Stack

- TypeScript with strict project references across packages.
- Standards-based custom elements and Shadow DOM for the runtime component layer.
- No required runtime framework dependency in published packages.
- A library build pipeline that emits:
  - typed ESM modules,
  - a browser-ready self-registering bundle,
  - clear export maps.
- Browser integration tests plus pure unit tests for the engine.

## Public API Shape

### Core Inputs

The root element should accept typed plan data, view configuration, and mode flags.

- `plan`
- `view`
- `selection`
- `filters`
- `interactive`
- `readonly`

### Core Outputs

The root element should emit semantic events rather than mutating external state invisibly.

- `harmonogram-select`
- `harmonogram-hover`
- `harmonogram-range-change`
- `harmonogram-edit-request`
- `harmonogram-action`

### Imperative Helpers

The root element may expose a small imperative API for host ergonomics.

- `zoomIn()`
- `zoomOut()`
- `fitToRange()`
- `focusItem(id)`
- `exportState()`

## Component Structure

The public surface should be composable rather than singular.

- `<harmonogram-board>`: root orchestrator for data, layout, and events.
- `<harmonogram-toolbar>`: optional controls host.
- `<harmonogram-timeline>`: time scale and markers.
- `<harmonogram-lanes>`: lane and item rendering.
- `<harmonogram-dependencies>`: overlay for relationship lines and critical path emphasis.
- `<harmonogram-inspector>`: optional details panel shell.

The root package can register the canonical set, while advanced consumers may import primitives individually.

## Data Model Summary

See [data-model.md](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/data-model.md).

The core must model:

- plans,
- lanes,
- work items,
- segments,
- dependencies,
- resources,
- calendars,
- markers,
- insights.

## File Organization Within Packages

### `packages/core/src`

- `contracts/`
- `engine/`
- `calculators/`
- `selectors/`
- `state/`
- `validation/`

### `packages/elements/src`

- `components/`
- `layouts/`
- `renderers/`
- `events/`
- `styles/`
- `interaction/`

### `packages/examples`

- `vanilla/`
- `framework-host/`
- `crop-tracking/`

## Dependencies To Introduce

- Workspace management for multi-package development.
- Release/versioning support for package publishing.
- A browser automation/testing layer for interaction and accessibility checks.
- Documentation generation for public custom element and TypeScript APIs.

Runtime dependencies should be kept as close to zero as practical.

## Security Considerations

- Do not render host-provided HTML unsafely.
- Treat external data as untrusted until validated against the public contract.
- Avoid hidden network behavior in the component runtime.
- Keep editing APIs explicit so hosts control persistence and authorization.

## Migration Notes From Current Repo

- The current single-file component is a starter, not the long-term architecture.
- Existing behavior should be captured with characterization tests before moving code.
- The current Lit-based implementation can be retired or wrapped during migration, but the final published runtime must not force Lit as a consumer dependency.
