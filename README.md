# harmonogram-wc

Harmonogram is being reshaped into a universal planning surface: a framework-agnostic web-component system for time-phased work, dependencies, operating windows, projections, and schedule harmony.

## Workspace Layout

WP0 introduces a multi-package workspace scaffold:

- `packages/core`: headless contracts and scheduling engine boundary.
- `packages/elements`: standards-based custom elements (current starter component lives here).
- `packages/examples`: integration and domain reference examples scaffold.
- `docs`: integrator documentation.
- `tooling`: shared tooling and release helpers.

## Start Here

- Constitution: [`.specify/memory/constitution.md`](/Users/shoe/Code/harmonogram-wc/.specify/memory/constitution.md)
- Product spec: [`specs/harmonogram-foundation/spec.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/spec.md)
- Decisions and open questions: [`specs/harmonogram-foundation/decisions.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/decisions.md)
- Data model: [`specs/harmonogram-foundation/data-model.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/data-model.md)
- Technical plan: [`specs/harmonogram-foundation/plan.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/plan.md)
- Work packages: [`specs/harmonogram-foundation/tasks.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/tasks.md)

## Root Commands

- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run typecheck`

All root commands delegate to workspace packages.
