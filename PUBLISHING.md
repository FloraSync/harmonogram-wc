# Publishing to npm (Quick Path)

This project is set up to publish a ready‑to‑use bundle and TypeScript types for the Harmonogram monorepo.

The launch package story is:

- `@florasync/harmonogram-elements`: canonical consumer package.
- `@florasync/harmonogram-core`: companion contracts package, published first because `elements` pins the matching exact version.
- `<harmonogram-board>`: supported GA custom element.
- `<harmonogram-wc>`: unsupported pre-GA starter tag, not part of the launch contract.

## 0) Prereqs

- An npm account with 2FA (recommended)
- Local release prep: Node 22 LTS or 24.x with Playwright Chromium dependencies installed.
- CI release gate: `ubuntu-latest`, Node 20.x, and `npm run playwright:install:deps`.
- You own/control the target package names under the `@florasync` npm org.
- `NPM_TOKEN` is configured as a GitHub Actions secret with publish rights for `@florasync`.

## 1) Update package.json fields

- `name`: publish under `@florasync/harmonogram-core` and `@florasync/harmonogram-elements`.
- `version`: the GitHub Actions workflow bumps the root package and both publishable workspaces together.
- `author`: `FloraSync`.
- `files`: include `dist`, `README.md`, and the resolved package license text. `@florasync/harmonogram-elements` also ships `CHANGELOG.md`.

Do not publish the prelaunch workspace scope names to npm.

License gate: the repo root and publishable package payloads use MIT license text. Do not ship contradictory license signals.

## 2) Verify build and contents

```bash
npm ci
npm run release:dry
```

`release:dry` must run typecheck, browser-backed package tests, build, and dry-pack. Missing Chromium/Linux dependencies are environment blockers, not a reason to weaken the gate.

Dry-pack output for `@florasync/harmonogram-elements` should include:

- `dist/**`
- `README.md`
- `CHANGELOG.md`
- resolved package license text

## 3) Publish

The GitHub Actions workflow is the default publish path. If you must publish locally, bump the root package and both publishable workspaces to the same version, update `@florasync/harmonogram-elements` to depend on the same exact `@florasync/harmonogram-core` version, then:

```bash
npm login
npm publish --workspace @florasync/harmonogram-core --access public
npm publish --workspace @florasync/harmonogram-elements --access public
```

For scoped packages, `--access public` is required the first time.

## Optional: Publish via GitHub Actions (main only)

The release workflow copies `@florasync/leaflet-geokit` with the monorepo-specific package bump:

- Manual `workflow_dispatch`.
- `main` branch only.
- `npm ci`.
- `npm run playwright:install:deps`.
- `npm run release:dry`.
- Configure the GitHub Actions bot identity.
- Bump the minor version for the root package, `@florasync/harmonogram-core`, and `@florasync/harmonogram-elements`.
- Update `@florasync/harmonogram-elements` to depend on the same exact `@florasync/harmonogram-core` version.
- Publish `@florasync/harmonogram-core`, then `@florasync/harmonogram-elements`.
- Push the release commit and `vX.Y.Z` tag with `git push --follow-tags`.

There is no package selection input. Split publishing would create mismatched package versions for consumers.

## 4) Verify install as a consumer

In a fresh project:

```ts
import "@florasync/harmonogram-elements/register";

// Then use the custom element in HTML
// <harmonogram-board></harmonogram-board>
```

Do not verify launch readiness through `<harmonogram-wc>`; it has no backward-compatibility guarantee.

---

## Optional: Publish via Docker sidecar

Build the publisher image once:

```bash
docker build -f docker/Dockerfile.publisher -t harmonogram-wc-publisher .
```

Run it with the repo mounted (interactive prompts included):

```bash
docker run -it --rm -v "$PWD":/app harmonogram-wc-publisher
```

This will:

- Prompt for git identity
- Offer to reset origin explicitly to HTTPS
- GitHub auth options (CLI or PAT)
- npm token configuration
- Option to push to GitHub first
- Option to publish to npm after a successful push
