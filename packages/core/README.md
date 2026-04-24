# @florasync/harmonogram-core

Headless contracts, validation, and schedule engine primitives for Harmonogram.

## Install

```bash
npm install @florasync/harmonogram-core
```

## What ships

- Typed `Plan` and contract models.
- Calendar, dependency, harmony-insight, and time-range utilities.
- Plan parsing and validation helpers.

## Quick usage

```ts
import { deriveHarmonyInsights, parsePlan } from "@florasync/harmonogram-core";

const plan = parsePlan(inputPlanJson);
const insights = deriveHarmonyInsights(plan);
```

## Release checks

From the repo root:

```bash
npm run typecheck
npm run test
npm run pack:dry
```

The package is published from `dist/` only and includes this README plus the MIT license file.
