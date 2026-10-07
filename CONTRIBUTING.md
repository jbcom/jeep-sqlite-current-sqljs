# Contributing

Thanks for taking the time to contribute.

This package is [jepiqueau/jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite) 2.8.0 with its
loader and WebAssembly rebuilt together on current sql.js. A change to the element's behavior
or API is best proposed upstream first, so both projects stay compatible; this repository takes
the build, packaging, dependency, test and documentation work needed to keep that rebuild
correct until upstream ships a release on current sql.js.

## Getting set up

With [mise](https://mise.jdx.dev) (recommended, installs the Node and pnpm versions pinned in
`mise.toml`):

```sh
mise install
pnpm install
pnpm verify   # lint, typecheck, test, build, package checks: the gate CI runs
```

Without mise, use `corepack` so pnpm matches the version pinned in
`package.json#packageManager`, on any Node release in the `engines.node` range (`>=24`; CI
verifies 24 and 26):

```sh
corepack enable
pnpm install
pnpm verify
```

## Making a change

1. Branch off `main`.
2. Write the test first. A bug fix should come with a test that fails without it.
3. Run `pnpm verify`. A change is not ready while any part of that is red.
4. Commit with [Conventional Commits](https://www.conventionalcommits.org): `fix:`, `feat:`,
   `docs:`, `refactor:`, `test:`, `chore:`. Release Please uses these commits to drive the
   changelog and the next version number.
5. Open a pull request describing what changed and why.

The manual regression pages in `src/index_*.html` exercise the element in a real browser,
one per upstream issue. `pnpm start` serves them; run the ones that touch your change.

## What gets reviewed

- Does it do what it says, and is there a test proving it?
- Does it keep the public API honest? A breaking change needs a `!` or a `BREAKING CHANGE:`
  footer.
- Are the types right for consumers? CI runs `publint` and Are The Types Wrong because broken
  types and entry points only surface at integration time.
- Does the packed tarball still install and import from a clean project?
- Is a non-obvious call recorded in `docs/decisions.md`?

## Releases

Releases are automated. Merging a conventional commit to `main` opens a release pull request;
merging that publishes to npm with provenance. Do not hand-edit versions or the changelog.
