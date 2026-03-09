# @harmonogram/elements

Web component package for Harmonogram UI elements.

`<harmonogram-wc>` is the starter element carried forward during workspace migration.
`<harmonogram-board>` is the new root board element with typed inputs and semantic planning events.

## `<harmonogram-board>` theming hooks

The board exposes stable CSS parts for timeline and lane rendering:

- `container`, `header`, `title`, `mode`, `summary`
- `timeline`, `timeline-header`, `timeline-tick`, `timeline-markers`, `timeline-marker`
- `lanes`, `lane`, `lane-header`, `lane-label`, `lane-count`, `lane-grid`, `lane-item`, `item-meta`, `item-actions`, `item-track`, `segment`
- `item-select`, `item-edit`, `item-move`, `item-resize`, `item-split`, `item-delete`
- `actions`, `create-item`, `undo-edit`, `redo-edit`, `shift-range`, `fit-range`, `export-state`

Key custom properties:

- `--harmonogram-board-bg`, `--harmonogram-board-border`, `--harmonogram-board-fg`, `--harmonogram-board-muted`
- `--harmonogram-board-timeline-bg`, `--harmonogram-board-lane-bg`, `--harmonogram-board-lane-header-bg`
- `--harmonogram-board-track-bg`, `--harmonogram-board-lane-label-width`, `--harmonogram-board-accent`
- `--harmonogram-marker-low`, `--harmonogram-marker-medium`, `--harmonogram-marker-high`, `--harmonogram-marker-critical`
- `--harmonogram-segment-planned`, `--harmonogram-segment-actual`, `--harmonogram-segment-projected`, `--harmonogram-segment-pause`
