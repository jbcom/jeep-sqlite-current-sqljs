---
title: Decisions
description: Each call taken in this package, with the evidence and the reason.
---

Decisions are recorded here when they are not obvious from the diff. Dates are 2026-10-07 unless
stated. A decision is revisited by adding a new entry, not by rewriting an old one.

## D1. The package is needed because upstream 2.8.0 breaks on a fresh install

**Decision.** Publish a package: upstream `jeep-sqlite` 2.8.0 with its Stencil loader and
WebAssembly rebuilt together on current sql.js.

**Evidence.**

- Upstream's latest npm release is `2.8.0`, published 2024-08-16. The upstream GitHub `master` tip
  (`3f3c8f2`) is that release; there is no newer release, tag or commit.
- Its `dependencies` declare `"sql.js": "^1.11.0"`, which a fresh install resolves to the latest
  1.x. Its prebuilt `dist/` embeds the sql.js glue from the 1.11 era (about half of the minified
  1.11.0 glue blocks appear verbatim in `dist/esm/jeep-sqlite.entry.js`; about a tenth of the 1.14.2
  blocks do).
- Upstream's readme tells consumers to copy `sql-wasm.wasm` from `node_modules/sql.js/dist`. That
  file is now a 1.14 binary. Pairing the 1.11 glue with it fails:

  ```text
  failed to asynchronously prepare wasm: LinkError: WebAssembly.instantiate(): Import #34 "a" "I":
  function import requires a callable
  ```

  Reproduced in Node by copying `sql-wasm.js` from `sql.js@1.11.0` beside `sql-wasm.wasm` from
  `sql.js@1.14.2`. Glue and binary from the same release (1.11.0 with 1.11.0) work.
- Upstream's Stencil guide still asks applications to add `rollup-plugin-node-polyfills`. Its
  `dist/` has no bare `buffer` or `process` imports, so polyfills are not what is broken; the
  mismatched glue and binary are.

**Conclusion.** Upstream does not cover this. When it ships a release built on current sql.js, this
package retires, and the change here can be offered to it as a pull request.

## D2. The name is `jeep-sqlite-current-sqljs`, unscoped

**Decision.** `jeep-sqlite-current-sqljs`. The bare name `jeep-sqlite` is upstream's, and every
package here publishes unscoped.

**Why.** The name says what this package does with jeep-sqlite: it is jeep-sqlite on current
sql.js. It does not claim to maintain or replace the project. Names that describe how the package is
built (a "browser" or "bundled" variant) were set aside: they say nothing about the reason it exists.

## D3. The first version is 2.9.0

**Decision.** `2.9.0`.

**Why.** A prerelease such as `2.8.0-x.1` under a fresh name signals "not stable", and npm would
need `--tag` to publish it, so `npm install jeep-sqlite-current-sqljs` would not resolve it. The
component's API is unchanged, which keeps upstream's major (2); the minor marks what is new: a
loader built on a different sql.js, an `exports` map, and the WebAssembly files as exports. A patch
(`2.8.1`) would have undersold the new entry points. Release Please continues from `2.9.0`.

## D4. History descends from upstream, byte for byte

**Decision.** Preserve upstream's history byte for byte, with this package's commits on top.
The intended GitHub repository is a fork of `jepiqueau/jeep-sqlite`; creating it and verifying
the fork relationship remain publication steps. The local checkout has no remote yet.

**Why.** Attribution, and so that a pull request upstream is a normal fork pull request. The earlier
private build had to be sanitized for publication (hostnames and local paths rewritten in commit
text). Rewriting the whole history also strips the GPG signatures from upstream's merge commits,
which changes their hashes and breaks the ancestry. Upstream's history contains none of the
sanitized strings (checked with a case-insensitive scan of `git log -p`), so only this package's
own commits were rewritten and then rebased onto the untouched upstream commits. Upstream's
`3f3c8f2` is an ancestor of `main`.

## D5. `sql.js` is pinned to exactly 1.14.1

**Decision.** `"sql.js": "1.14.1"`, no range.

**Why.** The failure in D1 is a range that let the binary drift away from the glue. An exact pin
makes the loader built here and the binary installed beside it the same release for every consumer,
and a sql.js upgrade becomes a deliberate rebuild and release (Dependabot's pull request rebuilds
in CI, and the packed-tarball check fails if the shipped binary does not match the installed
sql.js). 1.14.1 is chosen because it is the release `@capacitor-community/sqlite` consumers already
carry; the 1.14.2 binary differs from it, so the choice matters.

## D6. The WebAssembly binaries ship in the package

**Decision.** `wasm/sql-wasm-browser.wasm` and `wasm/sql-wasm.wasm` are packed and exported as
`jeep-sqlite-current-sqljs/sql-wasm-browser.wasm` and `jeep-sqlite-current-sqljs/sql-wasm.wasm`.

**Why.** It makes the pairing in D5 a property of the package, not an instruction for the reader. The
embedded glue is sql.js's browser build, which asks for `sql-wasm-browser.wasm`; the default glue
asks for `sql-wasm.wasm`. The two files are byte-identical in each sql.js release, so shipping both
costs size, not correctness, and covers whichever build a toolchain picks. In Chrome, with the
packed tarball installed from npmjs into an empty project and the element served from its script
build, the only binary requested was `sql-wasm-browser.wasm`, and a create, insert, query and close
round trip reported SQLite 3.49.1 (the engine inside sql.js 1.14.1). They are copied from the
pinned dependency at build time (`scripts/copy-wasm.mjs`) and are not committed.

## D7. An `exports` map, with `/loader` as a first-class entry

**Decision.** `exports` covers `.`, `./loader`, `./dist/components/*`, `./dist/jeep-sqlite/*`, the
two WebAssembly files and `./package.json`.

**Why.** Consumers import `.../loader`, which resolved only through directory resolution before.
The two `dist` wildcards keep the documented deep imports (`dist/components/jeep-sqlite.js`, and the
script build served from a CDN) working; the rest of `dist/` (the Stencil collection, the CommonJS
internals) is deliberately not importable, because it was never documented and a wildcard over it
made `publint` warn about every file. The package is not `"type": "module"` (Stencil's `*.cjs.js`
outputs would become ES modules). The packed-tarball check loads CommonJS and ES modules in Node
and bundles every ESM entry for the browser with esbuild, which is how these entries are consumed.

Stencil emits its ES modules as `.js`. `scripts/mark-esm.mjs` writes `{"type": "module"}` into the
three directories that hold only ES modules (`dist/esm`, `dist/components`, `dist/jeep-sqlite`), and
the `import` conditions point into them, so the entries also import cleanly in Node (a server-rendering
framework importing the loader, for example). Remaining tool findings are accepted and understood:
Are The Types Wrong's `false-cjs` rule is ignored because Stencil emits one `.d.ts` for both module
kinds (a pure type declaration with no runtime), and publint notes the same ambiguity as a warning.
Resolution under `bundler` and `node16` from CommonJS is clean.

## D8. Toolchain: Node 26, pnpm 12, TypeScript 7 for the type check only

**Decision.** Node 26 (`.nvmrc`, `mise.toml`), pnpm 12, Vitest 4, Biome. TypeScript 7 runs the
`typecheck` gate; Stencil compiles with the TypeScript it bundles.

**Why.** Stencil 4 compiles components with its own bundled TypeScript and does not take the
repository's. TypeScript 7 still works as an independent check, with three settings written down in
`tsconfig.json`: `moduleResolution: bundler` (`node10` is removed in 7); `strict: false` (TypeScript
7 turns strictness on by default, and the upstream source was never written for it); and
`skipLibCheck: true` (declaration conflicts inside `@stencil/vitest`'s own typings). TypeScript 7
also found one real defect, fixed in `uint2blob`: it passed `uint.buffer` to `Blob`, which includes
bytes outside a sub-view; it now passes the view itself. For a whole buffer, as `sql.js` returns
from `export()`, the result is identical. Vitest stays on 4 because `@stencil/vitest` supports
`vitest` up to 4.

## D9. Biome covers what this package owns, not upstream's source

**Decision.** Biome lints and formats scripts, configuration, tests and `src/index.ts`. The
component and utility sources under `src/` are outside it.

**Why.** Run over them, Biome reports about a thousand findings (`noExplicitAny`, `==`, `let` for
constants, formatting) in code that is upstream's. Fixing them would touch most lines, break
the line-for-line correspondence with upstream that lets a fix travel in either direction, and risks
behavior changes in a database layer (`==` to `===` among them). The source is checked by the
TypeScript gate, the Stencil build and the tests instead.

## D10. Tests run the real engine; coverage is a floor

**Decision.** Two Vitest projects: `spec` (the element in Stencil's DOM) and `unit` (the `Database`
class against the real sql.js in Node with an in-memory store, no mocks of SQLite). Coverage
thresholds are a floor set at the current level.

**Why.** The behavior that matters (statements, transactions and rollback, persistence across
close and reopen, upgrades, JSON import and export) lives in the `Database` and `utils-*` modules and
can run in Node, where sql.js reads its binary from disk. The rest of the element is exercised by
upstream's manual browser pages (`src/index_*.html`), which are not automated. A test also asserts
the exact `sql.js` pin against the installed copy. The threshold only moves up.

## D11. Documentation is upstream's readme, reorganized

**Decision.** Upstream's readme became `docs/API.md` (reference) and its release notes became the
tail of `CHANGELOG.md`; `README.md` is new. The empty upstream `IonicAngular_App.md` was removed.

**Why.** The method, event and usage reference is the useful part of upstream's readme and is kept
intact. An empty guide in a documentation navigation is a dead link.

## D12. CI covers every maintained Node line on Linux

**Decision.** Node.js 22, 24 and 26 on `ubuntu-24.04`; no Windows job. Local development
defaults to Node 26, but contributors may use any supported line without an exact-version guard.

**Why.** `engines.node` is `>=22`: the full verification chain, including tests and packed-consumer
imports, passes on Node 22 and 26. CI uses major versions to follow supported patch updates.
The package builds a browser artifact and touches no
OS-specific path or process behavior, so a Windows job would test the runner, not the package.

## D13. The first publish is local; later releases publish by OIDC

**Decision.** `2.9.0` is published once from a clean checkout of the green `main` commit with
`--provenance=false`, using a token kept outside the repository. Later releases publish from the
`publish` job of `.github/workflows/cd.yml` with npm provenance, through trusted publishing.

**Why.** Trusted publishing is configured per package on npmjs, and the package must exist first.
No token is stored in the repository or its secrets.

## D14. Release automation resumes after the approved first publication

**Decision.** The first-release hold is fulfilled by the exact baseline `v2.9.0` tag at
`b036dce0039b0d18f10664a24e6bbc82789f5721`, its GitHub release, and its npm publication. Restore
Release, CD and Automerge as guarded jobs. Every job also requires the repository variable
`RELEASE_AUTOMATION_ENABLED` to equal `true`; source changes alone do not activate automation.

**Why.** The initial `if: false` guards prevented imported history from creating releases or
publishing before the first package existed. The owner subsequently approved trusted publishing and
required npm 2FA for this package with the other public packages. That approval supersedes the
temporary first-stage source holds, while the repository variable keeps activation a deliberate
post-merge step. Release and CD retain their original trusted-event and successful-conclusion
conditions, and Automerge retains its same-repository, branch and generated-actor restrictions.
This repository's Release Please action uses `CI_GITHUB_TOKEN`, so its generated pull requests are
authored by `jbdevprimary`, not `github-actions[bot]`. The Release Please predicate admits only
that identity with this package's exact generated branch and expected release title, plus the
`autorelease: pending` label and Release Please body marker. It also listens for `labeled`, so the
predicate is evaluated after Release Please applies the pending label. Those facts are based on the
completed `game-session` #5, `persistence-drizzle` #7 and `seeded-maze` #4 release pull requests.
