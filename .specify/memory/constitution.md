# Project Constitution

## Mission

Harmonogram exists to become the planning surface teams reach for when a Gantt chart is too shallow. It must express time-phased work, dependencies, operating windows, capacity, and schedule health in a way that is useful for crop tracking, construction, operations, manufacturing, product delivery, and any other domain with constrained flow over time.

## Product Boundaries

- The core product is domain-neutral. Crop tracking is the first reference implementation, not the shape of the public core API.
- The product must work as an embeddable standards-based web component and must not require consumers to adopt any frontend framework.
- The system must support both read-only visualization and controlled interactive planning without forcing a backend or a specific state manager.

## Code Quality Standards

- TypeScript `strict` mode is mandatory across all source packages.
- Public contracts must use explicit, documented types. Avoid leaking internal classes or implementation-only helpers across package boundaries.
- Business rules, schedule math, and conflict detection must live in pure modules with no DOM, network, or storage dependencies.
- Names must reflect domain intent (`dependency`, `calendarWindow`, `resourceLoad`, `projection`) rather than UI trivia.
- Hidden mutation, global singleton state, and temporal coupling are prohibited.
- Each module should have one reason to change. If a file mixes engine logic, rendering, and I/O concerns, split it.

## Testing Requirements

- Preserve observable behavior during refactors by adding characterization tests before structural rewrites.
- The scheduling kernel must have deterministic unit tests that cover dependency resolution, calendars, split segments, projections, and harmony/risk calculations.
- Custom elements must have browser-level integration tests for rendering, events, keyboard support, and accessibility.
- Performance-sensitive paths must have repeatable benchmarks or smoke tests before optimization claims are accepted.
- Package contract smoke tests must verify the published outputs: ESM import, script-tag/CDN registration bundle, and generated type definitions.

## Architectural Patterns

- Use a layered design:
  1. Headless core: time math, planning rules, derived insights, immutable state transitions.
  2. Element layer: standards-based custom elements that render the planning surface and dispatch semantic events.
  3. Adapters/examples: optional integration helpers and reference apps that sit outside the core runtime.
- The public component API must be composable. Favor smaller custom elements and clear events over one monolithic god component.
- Composition is preferred over inheritance. Strategy/table-driven logic is preferred over sprawling conditionals when it lowers cognitive load.
- Styling must be exposed through CSS custom properties, CSS parts, and slots where appropriate. Consumers should not need to pierce Shadow DOM internals.
- Frameworks may be used for docs or examples, but the shipped runtime cannot require React, Vue, Angular, Lit, or any comparable UI runtime as a peer dependency.

## Technology Stack

- Language: TypeScript.
- Platform: Web Components, Custom Elements, Shadow DOM, standard browser events, standard CSS.
- Packaging: npm as the primary distribution channel, with a browser-ready bundle for direct script-tag/CDN use.
- Build tooling may evolve, but the repo should optimize for boring and inspectable output over clever tooling chains.

## Packaging And Distribution Rules

- Publish typed packages with explicit export maps and semver discipline.
- Ship zero required runtime peer dependencies for consumers.
- Provide at least:
  - an ESM entry for bundlers,
  - a self-registering browser bundle for direct HTML usage,
  - generated `.d.ts` files,
  - public API documentation and examples.
- Keep side effects explicit. If element registration is side-effectful, it must live in a dedicated entry point.

## Accessibility And Interaction

- Keyboard interaction must be first-class, not retrofit work.
- Screen-reader semantics, focus management, hit targets, contrast, and reduced-motion support are required.
- Pointer, touch, and keyboard interactions must reach parity for essential actions.

## Performance Budgets

- The headless core must remain deterministic and performant for large plans.
- The rendered surface must scale to thousands of visible work items through virtualization or equivalent rendering discipline.
- Interaction paths such as drag, resize, pan, and zoom must target smooth feedback on modern desktop hardware.

## Documentation And Decision Hygiene

- Significant product and architecture decisions must be written to spec artifacts, not left in chat history.
- Every implementation slice must trace back to a requirement in `specs/`.
- When debt is accepted intentionally, record the tradeoff and the next cleanup slice.
