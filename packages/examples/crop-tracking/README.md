# Crop Tracking Reference Example

This reference implementation demonstrates the crop workflow with the universal Harmonogram core model.

## Scenario

- Plan scope: planted farm group (`farmGroupId` in `plan.metadata`)
- Lanes: fields (`kind: field`)
- Work items: operations (`soil prep`, `planting`, `scouting`, `harvest`)
- Time overlays: seasonal windows rendered through `markers`
- Timeline states: planned vs actual vs projected segments

## Files

- `index.html`: browser demo shell.
- `main.js`: interaction wiring and grouping controls.
- `plan.js`: crop dataset using the same core contracts as all other examples.

Automation hooks:

- Board root: `[data-e2e="crop-board"]`
- Group controls: `[data-e2e="crop-group-*"]`
- Grouping label: `[data-e2e="crop-mode-label"]`
- Event log: `[data-e2e="crop-event-log"]`

## Core vs Overlay Conventions

Universal core entities (shared across domains):

- `Plan`, `Lane`, `WorkItem`, `Segment`, `Dependency`, `Resource`, `Marker`
- `segmentKind` for planned/actual/projected/pause
- `filters.groupBy` for lane/resource/phase organization

Crop-specific overlay conventions (metadata only):

- `plan.metadata.farmGroupId` and `plan.metadata.season`
- `lane.metadata.fieldId`, `lane.metadata.crop`, `lane.metadata.variety`
- `item.metadata.operationType` and `item.metadata.phase`
- marker `kind: window` + crop-domain metadata

No crop-only runtime logic or API forks are introduced in the core package.
