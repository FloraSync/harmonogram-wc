# Specification: Harmonogram Universal Planning Surface

## Context

Most scheduling tools reduce planning to bars on a calendar. They show sequence, but they do a poor job of showing harmony: where work hands off cleanly, where slack exists, where interruption is expected, where capacity is overloaded, and where actual execution is drifting from plan.

Harmonogram should be a universal planning surface for time-phased work. It should feel native in crop planning, field operations, manufacturing, construction, product delivery, maintenance, and other domains where people need to reason about timing, dependencies, windows, resources, and projections in one place.

The product must be powerful enough for a crop-tracking workflow without becoming crop-specific at the core API level.

## Product Thesis

Harmonogram is not "another Gantt chart."

It is a visual planning system that helps users answer four higher-order questions:

1. What is supposed to happen, and when?
2. What constraints or dependencies shape that sequence?
3. What is actually happening now, compared with plan?
4. Where is the system out of harmony: blocked, overloaded, idle, delayed, or at risk?

## User Roles

- Planner: builds and maintains the schedule, groupings, dependencies, and constraints.
- Operator: executes work, updates actuals, and needs a clear picture of what is due next.
- Analyst: compares plan, actuals, and projections to spot bottlenecks, missed windows, or resource conflicts.
- Integrator: embeds Harmonogram into an application and wires it to domain data and workflows.

## User Stories

- As a planner, I want to model time-phased work with hierarchy, dependencies, and reusable metadata so I can represent real operations instead of a flat task list.
- As a planner, I want to zoom between hours, days, weeks, months, and seasonal windows so one component can support both tactical and strategic planning.
- As an operator, I want to see what is blocked, late, overlapping, or waiting so I can act on the next constraint instead of scanning a wall of bars.
- As an analyst, I want to compare planned, actual, and projected timelines so I can understand drift and communicate risk early.
- As a farm operations lead, I want to model planting, treatments, scouting, irrigation, harvest, and pause windows by field or block so I can manage a crop season without forcing the domain into generic PM software.
- As an integrator, I want to drop the component into raw HTML or any major frontend stack and drive it with typed data and events so I do not need framework-specific wrappers to adopt it.

## Functional Requirements

### FR1: Domain-Neutral Planning Model

Users must be able to represent plans using lanes, work items, dependencies, resources, markers, and calendars, while attaching arbitrary domain metadata without forking the component.

### FR2: Multi-Scale Time Navigation

Users must be able to view and navigate the same plan across multiple temporal scales, including sub-day, day, week, month, and season/long-range planning modes.

### FR3: Calendars, Windows, And Exceptions

Users must be able to express working time, non-working time, blackout windows, event windows, and custom exceptions that influence how the plan is displayed and evaluated.

### FR4: Planned, Actual, And Projected States

Users must be able to compare planned schedule data with actual execution data and projected outcomes in the same planning surface.

### FR5: Dependency And Flow Modeling

Users must be able to define directional relationships between work items, including common sequencing types and time offsets/buffers, and must be able to inspect when those relationships are violated.

### FR6: Segmented And Interrupted Work

Users must be able to represent work that occurs in multiple segments, pauses, resumptions, or split windows rather than forcing every activity into a single uninterrupted bar.

### FR7: Harmony Insights

The product must surface actionable schedule insights, including overlaps, idle gaps, blocked work, critical sequence, capacity conflicts, missed windows, and drift from baseline or forecast.

### FR8: Multiple Organizing Views

Users must be able to organize the same dataset by hierarchy, lane, resource, phase, or other grouping dimensions without destroying the underlying plan.

### FR9: Filtering, Search, And Focus

Users must be able to filter, search, highlight, and focus subsets of the plan by status, group, resource, metadata, risk, or free-text criteria.

### FR10: Interactive Planning Mode

In interactive mode, users must be able to request edits such as create, update, delete, move, resize, and split operations, with undo/redo support for local planning sessions.

### FR11: Read-Only Embed Mode

In read-only mode, users must still be able to inspect, zoom, filter, and navigate the plan without exposing editing capabilities.

### FR12: Extensible Annotation System

Users and integrators must be able to add markers, milestones, notes, thresholds, and domain-specific annotations to enrich the planning surface.

### FR13: Theming And Composition

Integrators must be able to theme the product and compose it into larger applications without modifying internal source code.

### FR14: Data Exchange

The product must support typed programmatic data input and practical export paths for downstream reporting or interoperability.

### FR15: Universal Adoption

The same public component contract must be usable in a plain HTML page and in framework-based applications.

## Non-Functional Requirements

### NFR1: Framework-Agnostic Runtime

The shipped runtime must not require a frontend framework adoption decision from the consuming application.

### NFR2: Performance

The product must remain usable with large plans and support smooth navigation, scrolling, and interaction at scale.

### NFR3: Accessibility

The product must be operable with keyboard-only input and expose meaningful semantics for assistive technologies.

### NFR4: Determinism

Derived schedule calculations and harmony insights must be deterministic for the same inputs and configuration.

### NFR5: Time Correctness

The product must handle time zones, date boundaries, and calendar exceptions in a predictable way.

### NFR6: Package Quality

The npm package must ship with type definitions, stable export paths, and documentation suitable for integrators.

### NFR7: Extensibility

The API must support incremental capability growth without forcing breaking rewrites for common extension scenarios.

### NFR8: No Mandatory Backend

The product must work with in-memory data and must not require a hosted service to function.

## Out Of Scope For Initial Release

- Real-time multiplayer editing.
- Native bi-directional integrations with every external planning platform.
- AI-driven scheduling decisions as a built-in mandatory feature.
- Budgeting, invoicing, or full ERP/financial operations.
- Highly domain-specific crop biology rules in the core package.

## Success Criteria

- A developer can render a meaningful plan in raw HTML and in at least one framework-based example using the same package contract.
- A planner can zoom across multiple time scales, inspect dependencies, filter the plan, and identify out-of-harmony work without leaving the component.
- A crop-tracking example can model field-level or block-level operations, seasonal windows, interruptions, and projections without requiring crop-specific forks in core.
- The product feels more expressive than a traditional Gantt chart because it can show not only sequence, but also windows, interruptions, actuals, projections, and harmony insights.
