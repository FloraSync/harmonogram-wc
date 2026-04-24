# @florasync/harmonogram-elements

Standards-based custom elements for Harmonogram.

## Production Contract

Use `<harmonogram-board>` for every new production integration.

`@florasync/harmonogram-elements` is the canonical npm package for custom elements. `@florasync/harmonogram-core` carries the shared plan contracts consumed by the board.

Supported production tag:

| Tag                   | Status                            | Support boundary                                                                                                                                          |
| --------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<harmonogram-board>` | GA surface                        | Active feature work, typed plan/view/filter inputs, interaction events, export helpers, theming hooks, and example coverage.                              |

`<harmonogram-wc>` is an unsupported pre-GA starter tag. It is not a wrapper around `<harmonogram-board>`, is not part of the npm launch contract, has no backward-compatibility guarantee, and may be removed or replaced before a stable release.

## Install

```bash
npm install @florasync/harmonogram-elements
```

The elements package brings in `@florasync/harmonogram-core` for the board contracts and scheduling primitives. Install `@florasync/harmonogram-core` directly only when you are building against the headless API without the web components.

## Package entrypoints

- `@florasync/harmonogram-elements`: typed ESM exports for board/view-model APIs.
- `@florasync/harmonogram-elements/register`: side-effect registration for current package elements. `<harmonogram-board>` is the only GA-supported tag.
- `@florasync/harmonogram-elements/bundle`: self-registering browser bundle output (`dist/harmonogram-elements.js`).

## Quick usage (ESM)

```ts
import "@florasync/harmonogram-elements/register";
import type { Plan } from "@florasync/harmonogram-elements";

const board = document.createElement("harmonogram-board");
const plan: Plan = {
  id: "plan-1",
  name: "Demo",
  timeZone: "UTC",
  range: { start: "2026-03-01T00:00:00.000Z", end: "2026-03-02T00:00:00.000Z" },
  lanes: [{ id: "lane-1", label: "Lane 1", kind: "track", collapsed: false }],
  items: [],
  dependencies: [],
  resources: [],
  calendars: [],
  markers: [],
};

board.plan = plan;
board.view = { scale: "day" };
board.filters = { groupBy: "lane" };
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

## Supported board inputs

Set these properties directly on `<harmonogram-board>`:

- `plan: Plan | null`
- `view: HarmonogramBoardView | null`
- `selection: HarmonogramBoardSelection | null`
- `filters: HarmonogramBoardFilters | null`
- `interactive: boolean`
- `readonly: boolean`
- `editingMode: 'local' | 'controlled'`

The board expects weather, operating windows, field constraints, blackout periods, and other grower context to arrive as first-class plan data through calendars, markers, ranges, and metadata. Do not bolt weather on as an external visual afterthought if the schedule outcome depends on it.

## Export flows

`harmonogram-board` supports three built-in export flows:

- `board.exportJson()` -> serialized JSON payload for plan + board state.
- `board.exportCsv()` -> flattened item/segment rows.
- `board.exportPng()` -> PNG data URL of the current board projection.

## Events

All board events bubble and are composed so framework hosts can listen at their boundary:

- `harmonogram-select`: emits the current item/lane/dependency selection.
- `harmonogram-hover`: emits transient item/lane/dependency hover context.
- `harmonogram-range-change`: emits previous and next visible ranges after zoom, shift, or fit actions.
- `harmonogram-edit-request`: emits create/update/delete/move/resize/split intent for controlled editing.
- `harmonogram-action`: emits board actions such as export, focus, filter, edit, undo, and redo.

TypeScript consumers can import event detail types from the package root.

```ts
import type {
  HarmonogramActionEventDetail,
  HarmonogramEditRequestEventDetail,
  HarmonogramRangeChangeEventDetail,
  HarmonogramSelectEventDetail,
} from "@florasync/harmonogram-elements";
```

## Imperative helpers

- `zoomIn()` / `zoomOut()`
- `fitToRange()`
- `focusItem(itemId)`
- `clearFocus()`
- `clearFilters()`
- `exportJson()` / `exportCsv()` / `exportPng()`

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

## Retiring harmonogram-wc

`<harmonogram-wc>` was a pre-GA flat-list starter:

```ts
type HarmonogramTask = {
  id: string;
  label: string;
  start: string;
  end: string;
};
```

It is limited to:

- `title: string`
- `tasks: HarmonogramTask[]`
- `harmonogram-task-click`
- CSS parts: `container`, `header`, `grid`, `task`
- CSS custom properties: `--harmonogram-primary-color`, `--harmonogram-font-family`

Do not build new integrations against this tag. Convert any internal flat-list usage into a `Plan` with at least one lane, one work item, and planned segments, then render `<harmonogram-board>`.

## Smoke checks

```bash
npm run test:smoke --workspace @florasync/harmonogram-elements
```

## E2E checks (example pages)

From repo root:

```bash
npm run test:e2e
```
