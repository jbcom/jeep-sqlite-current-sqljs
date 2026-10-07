# Agent notes

This file is for an autonomous coding agent working in this repository. It covers what isn't
obvious from reading the code alone.

## What this repository is

The exact upstream [jepiqueau/jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite) 2.8.0, a
Stencil web component that runs SQLite (sql.js) in the browser and persists to IndexedDB, with
its loader and WebAssembly rebuilt together on current sql.js (1.14.1). It publishes to npm as
`jeep-sqlite-current-sqljs`. The component source under `src/` is upstream's and is kept close to
it so changes can be exchanged with upstream; this package's own work is the build, the
dependency set, the tests, the packaging and the documentation. It retires once upstream ships a
release on current sql.js. Do not add features beyond that goal. `docs/decisions.md` records each
call and why.

## Toolchain

- Package manager: pnpm, pinned in `package.json#packageManager`. `mise install` (reads
  `mise.toml`) gives a matching Node and pnpm, or use `corepack enable`.
- Node 26 for development (`.nvmrc`); `engines.node` is `>=22` and CI verifies Node.js 22, 24 and 26.
- This is a pnpm workspace with two members: `.` (the published package) and `docs/` (the
  private Sourcey documentation site). Root scripts operate on the package; `pnpm docs:*`
  delegate to `docs/` through `pnpm --filter jeep-sqlite-current-sqljs-docs`.
- The build is Stencil (`stencil build --docs`). Stencil compiles with its own bundled
  TypeScript; the repository's TypeScript 7 runs only the `typecheck` gate. See
  `docs/decisions.md` for why.
- `pnpm verify` is the single gate CI runs: Biome, markdownlint, TypeScript, tests with
  coverage, the Stencil build and its bare-import gate, `publint`, Are The Types Wrong, and a
  smoke test that installs the packed tarball into a scratch project and imports every entry
  point. A change is not done while any part of it is red.
- Run heavy gates (`pnpm verify`, `pnpm build`) one at a time; a Stencil build is memory-hungry.

## Invariants: do not violate these

1. **The element's API is upstream's.** Do not rename, remove or change the semantics of a
   method, event or property in `src/components/jeep-sqlite/jeep-sqlite.tsx`. Capacitor's
   `@capacitor-community/sqlite` depends on that surface.
2. **No bare `buffer` or `process` imports in `dist/`.** `scripts/verify-browser-dist.mjs`
   enforces it. The polyfills are bundled through `rollup-plugin-node-polyfills` in
   `stencil.config.ts`; keep both together.
3. **Loader and WebAssembly come from one sql.js release.** `sql.js` is pinned to an exact
   version in `package.json`, and `scripts/copy-wasm.mjs` copies the two binaries from that
   dependency into `wasm/` at build time. Never loosen the pin to a range, never commit a
   binary, and bump `sql.js` only together with a rebuild and a release. `verify-package.mjs`
   fails if a shipped binary differs from the installed sql.js.
4. **Entry points are a contract.** The `exports` map in `package.json` is verified by
   `scripts/verify-package.mjs`, which imports each one from a packed install. Add an entry
   point there in the same change.
5. **`src/components.d.ts` is generated** by Stencil and committed. Regenerate it with
   `pnpm build`; never hand-edit it.

## Keeping docs and tests in sync

A change to the element's surface or the build needs matching updates in:

- `src/**/*.spec.tsx`: tests beside the code.
- `docs/API.md` and `docs/ARCHITECTURE.md`: the authored Sourcey pages. Do not create a second
  documentation renderer or a duplicate page tree.
- `README.md`: install and quick start.
- `docs/decisions.md`: any call that is not obvious from the diff.

## Commits and releases

- Conventional Commits only. A required CI check enforces conventional PR titles and Release
  Please parses the merge-commit history to drive `CHANGELOG.md` and the next version. Never
  hand-edit the changelog or bump a version.
- `pre-commit`, `simple-git-hooks`, `lint-staged` and `commitlint` run locally after
  `pnpm install`. Do not bypass them with `--no-verify`.
- Never commit to `main`; work on a branch and open a pull request. Merge commits only.
- npm publishing is by OIDC trusted publishing from `.github/workflows/cd.yml` (the `publish`
  job). No npm token is stored in the repository or its secrets.

## Files most likely to surprise you

- `pnpm-workspace.yaml`'s `allowBuilds` map controls which packages' install scripts run. A new
  dependency that needs a native build step does nothing until it is added there.
- `src/index_*.html` are manual regression pages, one per upstream issue. They are copied to
  `www/` by `stencil.config.ts` and are not part of the published package.
- Sourcey paths in `docs/sourcey.config.ts` resolve relative to `docs/`.
