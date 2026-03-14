# Framework Host Example

This example uses Preact as a host framework while still driving the same web-component contract.

- Entry: `index.html`
- Runtime script: `main.js`
- Data contract: `../shared/sample-plan.js`

Notes:

- The host imports Preact/HTM from local `/node_modules/...` paths for deterministic offline-capable test runs.

Automation hooks:

- Board root: `[data-e2e="framework-board"]`
- Group controls: `[data-e2e="framework-group-*"]`
- Host event label: `[data-e2e="framework-last-event"]`
