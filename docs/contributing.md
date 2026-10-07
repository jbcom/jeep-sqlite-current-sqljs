---
title: Contributing
description: Set up the repository, validate a change, and contribute through the protected workflow.
---

## Local workflow

```sh
mise install
pnpm install --frozen-lockfile
pnpm verify
pnpm docs:build
```

`pnpm verify` is the package gate: Biome, Markdown linting, TypeScript, tests with coverage,
the Stencil build with its bare-import gate, `publint`, Are The Types Wrong, and a smoke test
that installs the packed tarball into a clean project and imports every entry point.
`pnpm docs:build` validates and renders the Sourcey site.

Branch from `main`, make a focused Conventional Commit, open a pull request, and keep the
branch current by merging `main` into it when necessary. The protected path uses automated
checks rather than a routine human approval; merge commits preserve the constituent history.
Do not hand-edit versions or `CHANGELOG.md`: Release Please owns them.

A change to the element's behavior is best proposed upstream at
[jepiqueau/jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite) first. Read the repository
[contribution guide](https://github.com/jbcom/jeep-sqlite-current-sqljs/blob/main/CONTRIBUTING.md) and
[agent instructions](https://github.com/jbcom/jeep-sqlite-current-sqljs/blob/main/AGENTS.md) before
changing the public surface.
