# @florasync/harmonogram-examples

Reference examples for the shared `@florasync/harmonogram-elements` public contract.

## Available examples

- `vanilla/`: high-fidelity use-case simulator (6 operational scenarios).
- `framework-host/`: Preact host controlling the same custom element API.
- `crop-tracking/`: legacy planted farm-group reference (kept for historical comparison).

Dependency fixtures in these examples intentionally use non-lexicographic ids so overlay ordering reflects execution sequence rather than id/name sorting.

## Run locally

1. Start from repo root with no-cache static serving:
   - `npm run examples:preview`
2. Open:
   - `http://localhost:4173/packages/examples/vanilla/index.html`
   - `http://localhost:4173/packages/examples/framework-host/index.html`
   - `http://localhost:4173/packages/examples/crop-tracking/index.html` (legacy)

Notes:

- Serving from any directory other than repo root can break `../../elements/dist/...` imports.
- Framework-host imports Preact/HTM from `/node_modules/...`; run examples from repo root so those paths resolve.
- If a page appears blank, hard-refresh once after starting the preview server.

## E2E smoke coverage

Playwright coverage for all three example pages lives in `tests/e2e/`.

From repo root:

- `npm run test:e2e`
- `npm run test:e2e:headed` for local debugging
