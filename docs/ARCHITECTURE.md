---
title: Architecture
description: How the element, sql.js and IndexedDB fit together, how the package is built, and what its limits are.
---

## Runtime

```text
application ──> <jeep-sqlite> element ──> Database (one per connection) ──> sql.js (WebAssembly)
                      │                          │
                      │                          └── export() on save, new SQL.Database(bytes) on open
                      └── localForage store "jeepSqliteStore" / table "databases" ──> IndexedDB
```

- **The element** (`src/components/jeep-sqlite/jeep-sqlite.tsx`) is the whole public surface.
  Every method is an `@Method` returning a promise, and every failure rejects with a
  string. It owns the connection dictionary: connections are keyed `RW_<name>` or
  `RO_<name>`, so a database can be open for writing and for reading at once.
- **`Database`** (`src/utils/database.ts`) is one connection. It initializes `sql.js` with a
  `locateFile` that points at `wasmPath` (default `/assets`), loads the stored bytes, and
  runs statements.
- **The `utils-*` modules** hold the work that does not need the element: statement
  splitting and parsing, JSON import and export for synchronization, upgrade statements,
  table drops and deletes, and the store reads and writes.
- **The store** is a single localForage instance. Each database is one `Uint8Array` value
  under the key `<name>SQLite.db`. Nothing is written until `close`, `closeConnection`,
  `saveToStore`, or, with `autosave`, after each mutating statement. A tab that crashes
  between writes loses the writes since the last save.

## Data flow and invariants

1. **Open** reads the bytes from the store, or creates an empty database and stores it, then
   constructs a `sql.js` database from them. The whole file is in memory while open.
2. **Statements** run against the in-memory database. `execute` and `executeSet` run
   several statements, `run` one with bound values, `query` returns rows. A transaction
   opened with `beginTransaction` stays open until committed or rolled back.
3. **Save** exports the in-memory database to bytes and replaces the stored value
   (`removeItem` then `setItem`).
4. **Synchronization** is optional. A `sync_table` holds a last-synchronized date, tables
   carry `last_modified` and `sql_deleted` columns, and `importFromJson` and `exportToJson`
   move only rows changed since that date. `deleteExportedRows` physically removes rows
   flagged deleted before the last export.
5. **Versioning** uses `PRAGMA user_version` with incremental upgrade statements registered
   through `addUpgradeStatement`; each upgrade runs over the previous version.

## Build

The package is built by Stencil (`stencil build --docs`), configured in `stencil.config.ts`.

| Output | Path | Used by |
| --- | --- | --- |
| Lazy-loaded ES modules and CommonJS | `dist/esm`, `dist/cjs`, `dist/index.js`, `dist/index.cjs.js` | bundlers, through `main`, `module` and `es2017` |
| Loader | `loader/` | `jeep-sqlite-current-sqljs/loader`, `defineCustomElements` |
| Script build | `dist/jeep-sqlite/` | `<script type="module">` and CDNs |
| Custom elements bundle | `dist/components/` | apps that want one chunk |
| Collection and types | `dist/collection`, `dist/types` | Stencil consumers and TypeScript |
| `www` | `www/` | the development server and the manual test pages in `src/index_*.html`; not published |

Choices that matter to a consumer:

- **Polyfills are bundled.** `sql.js` and `jszip` reference Node's `buffer` and `process`.
  `rollup-plugin-node-polyfills` is wired into the Rollup pipeline in `stencil.config.ts`, and
  `scripts/verify-browser-dist.mjs` fails the build if any distributed module still imports
  either bare. Applications therefore need no polyfill plugin of their own.
- **`extras.enableImportInjection`** is on, so production builds of Vite and similar
  bundlers resolve the lazy chunks.
- **Loader and WebAssembly are one pair.** The embedded sql.js glue and `sql-wasm*.wasm` must
  come from the same sql.js release, or instantiation fails with a `LinkError`. `sql.js` is
  pinned to an exact version, and `scripts/copy-wasm.mjs` copies both binaries from it into
  `wasm/` at build time, where they ship and are exported as `./sql-wasm-browser.wasm` and
  `./sql-wasm.wasm`. The two files have identical bytes; the glue asks for one name or the
  other depending on whether a bundler picks sql.js's browser build, and the browser build is
  the one embedded here. `scripts/verify-package.mjs` checks the shipped files against the
  installed `sql.js` and that every name the built `dist/` asks for is packed.
- **Shadow DOM.** The element renders two buttons (pick a database, save to disk) inside a
  shadow root; they appear only when `getFromLocalDiskToStore` or `saveToLocalDisk` is called.

## Tests

Unit specs run on Vitest through `@stencil/vitest`, whose `stencil` environment mounts the
element in a DOM. They live beside the source as `*.spec.tsx`. The interactive pages in
`src/index_*.html` are manual regression pages for individual upstream issues, served by
`pnpm start`; they are not automated.

## Limits

- The whole database is in memory while open, and a save writes the whole file. Large
  databases and frequent saves are expensive.
- `IndexedDB` quotas and eviction apply; the browser may evict storage for origins that have
  not requested persistent storage.
- Encrypted databases are not supported on the web.
- WAL mode is accepted but there is one writer, the page; WAL2 is not supported.
- Two tabs open on the same database each hold their own in-memory copy and the last save
  wins.
