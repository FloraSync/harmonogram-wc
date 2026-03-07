# Data Model: Harmonogram Foundation

## Modeling Principle

The core data model must stay domain-neutral and typed, with metadata hooks for domain overlays. Crop tracking should map onto the model cleanly, but the model must also serve non-agricultural planning domains.

## Core Entities

### Plan

Represents one coherent planning dataset.

- `id`
- `name`
- `timeZone`
- `range`
- `lanes`
- `items`
- `dependencies`
- `resources`
- `calendars`
- `markers`
- `metadata`

### Lane

A visual or logical track used to group work.

- `id`
- `label`
- `parentId`
- `kind`
- `resourceId`
- `collapsed`
- `metadata`

Examples:
- Crop planning: field, block, crew, machine, phase
- Non-crop planning: team, workstation, stream, job site

### Work Item

A unit of planned work or time-based significance.

- `id`
- `laneId`
- `label`
- `kind` (`task`, `milestone`, `window`, `buffer`, `event`)
- `status`
- `priority`
- `progress`
- `segments`
- `baseline`
- `actual`
- `projection`
- `resourceAssignments`
- `metadata`

### Segment

Represents a contiguous time range for a work item.

- `id`
- `workItemId`
- `start`
- `end`
- `segmentKind` (`planned`, `actual`, `projected`, `pause`)
- `locked`
- `metadata`

This is what allows interrupted, split, resumed, or phased work to exist without flattening everything into one bar.

### Dependency

Represents directional influence between two work items or segments.

- `id`
- `fromId`
- `toId`
- `relationship` (`FS`, `SS`, `FF`, `SF`)
- `lag`
- `hard`
- `metadata`

### Resource

Represents a capacity-bearing actor or asset.

- `id`
- `label`
- `kind`
- `capacity`
- `calendarId`
- `metadata`

### Calendar

Represents time rules that affect display and schedule interpretation.

- `id`
- `label`
- `timeZone`
- `workingRules`
- `exceptions`
- `windows`
- `metadata`

### Marker

Represents a note, threshold, milestone, observation, or external signal rendered against time.

- `id`
- `label`
- `range`
- `severity`
- `kind`
- `metadata`

### Insight

A derived, read-only object representing schedule interpretation.

- `id`
- `kind` (`overlap`, `gap`, `blocked`, `critical`, `capacity-conflict`, `window-risk`, `drift`)
- `subjectIds`
- `severity`
- `message`
- `metadata`

## Domain Overlay Strategy

Domain-specific meaning lives in typed adapter layers or metadata conventions above the core model.

Examples for crop tracking:

- `plan.metadata.farmGroupId`
- `plan.metadata.farmGroupName`
- `lane.metadata.fieldId`
- `lane.metadata.blockName`
- `item.metadata.crop`
- `item.metadata.variety`
- `item.metadata.operationType`
- `marker.metadata.weatherRisk`

The core package may validate structural contracts, but it should not hardcode crop-only assumptions such as phenology stages or chemical rules into the universal model.

## State Layers

The system should distinguish between:

- Source state: data provided by the host.
- Derived state: computed ranges, dependency violations, insights, critical sequence.
- UI state: selection, hover, zoom, scroll, expanded groups, active filters.

Only source state should be treated as authoritative input. Derived and UI state must be recomputable.
