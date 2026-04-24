# Harmonogram

Harmonogram is a framework-agnostic web-component system for time-phased work, dependencies, operating windows, projections, and schedule harmony.

## Public Contract

The npm launch contract is board-centric:

- Canonical package: `@florasync/harmonogram-elements`
- Companion core contracts package: `@florasync/harmonogram-core`
- Supported GA custom element: `<harmonogram-board>`
- Unsupported pre-GA starter tag: `<harmonogram-wc>`

Integrations should install `@florasync/harmonogram-elements` and mount `<harmonogram-board>`. The old `<harmonogram-wc>` starter tag is not part of the npm launch contract, has no backward-compatibility guarantee, and may be removed or replaced before a stable release.

Weather, calendars, operating windows, and field constraints belong in the plan model as primary planning inputs through calendars, markers, ranges, and metadata. Treating weather as a late overlay weakens the schedule contract and is outside the intended GA usage.

## Workspace Layout

The repository is organized as a multi-package workspace:

- `packages/core`: headless contracts and scheduling engine boundary.
- `packages/elements`: standards-based custom elements; `<harmonogram-board>` is the GA surface.
- `packages/examples`: plain HTML, framework-host, and legacy domain reference examples.
- `docs`: integrator documentation.
- `tooling`: shared tooling and release helpers.

## Start Here

- Elements API and launch guide: [`packages/elements/README.md`](packages/elements/README.md)
- Release notes: [`packages/elements/CHANGELOG.md`](packages/elements/CHANGELOG.md)
- Publishing playbook: [`PUBLISHING.md`](PUBLISHING.md)
- Product spec: [`specs/harmonogram-foundation/spec.md`](specs/harmonogram-foundation/spec.md)
- Decisions and open questions: [`specs/harmonogram-foundation/decisions.md`](specs/harmonogram-foundation/decisions.md)
- Data model: [`specs/harmonogram-foundation/data-model.md`](specs/harmonogram-foundation/data-model.md)
- Technical plan: [`specs/harmonogram-foundation/plan.md`](specs/harmonogram-foundation/plan.md)
- Work packages: [`specs/harmonogram-foundation/tasks.md`](specs/harmonogram-foundation/tasks.md)

## Root Commands

- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run test:e2e`
- `npm run playwright:install`
- `npm run pack:dry`
- `npm run typecheck`
- `npm run release:dry`

`npm run release:dry` is the release gate: typecheck, browser-backed package tests, build, and dry-pack. Do not publish if browser-backed tests fail because of missing Linux/Chromium system dependencies; fix the release environment instead.
