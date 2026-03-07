# harmonogram-wc

Harmonogram is being reshaped into a universal planning surface: a framework-agnostic web-component system for time-phased work, dependencies, operating windows, projections, and schedule harmony.

## Current State

This repository currently contains a minimal starter custom element. The product direction, architecture, and delivery sequence now live in spec-driven artifacts instead of an implementation-first PRD.

## Start Here

- Constitution: [`.specify/memory/constitution.md`](/Users/shoe/Code/harmonogram-wc/.specify/memory/constitution.md)
- Product spec: [`specs/harmonogram-foundation/spec.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/spec.md)
- Decisions and open questions: [`specs/harmonogram-foundation/decisions.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/decisions.md)
- Data model: [`specs/harmonogram-foundation/data-model.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/data-model.md)
- Technical plan: [`specs/harmonogram-foundation/plan.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/plan.md)
- Work packages: [`specs/harmonogram-foundation/tasks.md`](/Users/shoe/Code/harmonogram-wc/specs/harmonogram-foundation/tasks.md)

## Product Direction

Harmonogram should outperform a traditional Gantt by showing:

- planned, actual, and projected time in the same surface,
- interruptions and split work instead of only uninterrupted bars,
- dependencies, critical sequence, and blocked flow,
- calendars, windows, and exceptions,
- harmony insights such as overlap, idle gaps, risk, and capacity tension.

The first reference implementation will target crop tracking, but the core model stays universal.
