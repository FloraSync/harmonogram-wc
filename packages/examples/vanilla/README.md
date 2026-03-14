# High-Fidelity Use-Case Simulator

This example mounts `<harmonogram-board>` directly in HTML and lets you switch between six detailed scheduling scenarios:

1. Rolling mill / assembly line sequencing
2. Micro-level sprint planning
3. Hospital OR scheduling
4. Logistics and fleet routing
5. Large-scale event production
6. Linear construction scheduling

Files:

- Entry: `index.html`
- Runtime script: `main.js`
- Scenario data: `use-case-plans.js`

Automation hooks:

- Scenario list: `[data-e2e="scenario-list"]`
- Scenario selector: `[data-e2e="scenario-select"]`
- Grouping selector: `[data-e2e="group-by-select"]`
- Scale selector: `[data-e2e="scale-select"]`
- Board root: `[data-e2e="vanilla-board"]`
- Event log: `[data-e2e="vanilla-event-log"]`
