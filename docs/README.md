# Harmonogram Docs

## Current guides

- Elements package API and launch guide: `packages/elements/README.md`
- Core package contract guide: `packages/core/README.md`
- Example integrations: `packages/examples/README.md`
- Publishing playbook: `PUBLISHING.md`

## Testing guides

- Component/unit/browser integration checks: `npm run test`
- Package contract smoke check: `npm run test:smoke`
- Example page E2E checks (Playwright): `npm run test:e2e`

Install Chromium once for local browser-backed checks:

- `npm run playwright:install`
- `npm run playwright:install:deps` on fresh Ubuntu/CI hosts

Playwright outputs:

- HTML report: `playwright-report/`
- Failure traces/media: `test-results/`

## Planned additions

- Expanded API references per package.
- Domain overlay guides (crop tracking begins in WP12).
