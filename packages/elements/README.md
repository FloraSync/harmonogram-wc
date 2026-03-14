# @harmonogram/elements

Standards-based custom elements for Harmonogram.

## Component status

- `harmonogram-board` is the primary planning surface and receives active feature work.
- `harmonogram-wc` is a legacy starter element kept for backward compatibility/characterization coverage.
- New integrations should target `harmonogram-board`.

## Install

```bash
npm install @harmonogram/core @harmonogram/elements
```

## Package entrypoints

- `@harmonogram/elements`: typed ESM exports for board/view-model APIs.
- `@harmonogram/elements/register`: side-effect registration for `harmonogram-board` and `harmonogram-wc`.
- `@harmonogram/elements/bundle`: self-registering browser bundle output (`dist/harmonogram-elements.js`).

## Quick usage (ESM)

```ts
import '@harmonogram/elements/register';
import type { Plan } from '@harmonogram/core';

const board = document.createElement('harmonogram-board');
const plan: Plan = {
  id: 'plan-1',
  name: 'Demo',
  timeZone: 'UTC',
  range: { start: '2026-03-01T00:00:00.000Z', end: '2026-03-02T00:00:00.000Z' },
  lanes: [{ id: 'lane-1', label: 'Lane 1', kind: 'track', collapsed: false }],
  items: [],
  dependencies: [],
  resources: [],
  calendars: [],
  markers: [],
};

board.plan = plan;
board.view = { scale: 'day' };
board.filters = { groupBy: 'lane' };
document.body.append(board);
```

## Browser bundle usage

```html
<script src="./dist/harmonogram-elements.js"></script>
<harmonogram-board id="board"></harmonogram-board>
<script>
  const board = document.getElementById('board');
  board.plan = /* your plan object */;
</script>
```

## Export flows

`harmonogram-board` supports three built-in export flows:

- `board.exportJson()` -> serialized JSON payload for plan + board state.
- `board.exportCsv()` -> flattened item/segment rows.
- `board.exportPng()` -> PNG data URL of the current board projection.

## Events

- `harmonogram-select`
- `harmonogram-hover`
- `harmonogram-range-change`
- `harmonogram-edit-request`
- `harmonogram-action`

## Dependency overlay ordering

Dependency links are ordered deterministically by execution sequence to improve scanability:

1. Required boundary time for the relationship (`FS`/`SS`/`FF`/`SF`, including lag).
2. Actual dependent boundary time.
3. Source row index, then target row index.
4. Dependency id as the final tie-break.

## Extension points

- Typed inputs: `plan`, `view`, `selection`, `filters`, `interactive`, `readonly`, `editingMode`.
- Imperative helpers: `zoomIn()`, `zoomOut()`, `fitToRange()`, `focusItem()`, `clearFocus()`, `clearFilters()`.
- View organization: `filters.groupBy` in `lane|hierarchy|resource|phase`.
- Styling via CSS parts and custom properties.

## Theming hooks

Main parts:

- `container`, `header`, `title`, `mode`, `summary`
- `timeline`, `timeline-header`, `timeline-tick`, `timeline-markers`, `timeline-marker`
- `dependency-overlay`, `dependency-grid`, `dependency-link`, `dependency-hitbox`, `dependency-inspector`
- `lanes`, `lane`, `lane-header`, `lane-identity`, `lane-label`, `lane-count`, `lane-grid`, `lane-item`
- `item-select`, `item-edit`, `item-move`, `item-resize`, `item-split`, `item-delete`
- `lane-collapse-toggle`, `clear-focus`, `clear-filters`, `announcer`

Key custom properties:

- `--harmonogram-board-bg`, `--harmonogram-board-border`, `--harmonogram-board-fg`, `--harmonogram-board-muted`
- `--harmonogram-board-timeline-bg`, `--harmonogram-board-lane-bg`, `--harmonogram-board-lane-header-bg`
- `--harmonogram-board-track-bg`, `--harmonogram-board-lane-label-width`, `--harmonogram-board-accent`
- `--harmonogram-marker-low`, `--harmonogram-marker-medium`, `--harmonogram-marker-high`, `--harmonogram-marker-critical`
- `--harmonogram-segment-planned`, `--harmonogram-segment-actual`, `--harmonogram-segment-projected`, `--harmonogram-segment-pause`

## Smoke checks

```bash
npm run test:smoke --workspace @harmonogram/elements
```

## E2E checks (example pages)

From repo root:

```bash
npm run test:e2e
```
