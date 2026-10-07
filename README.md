# jeep-sqlite-current-sqljs

[![CI](https://github.com/jbcom/jeep-sqlite-current-sqljs/actions/workflows/ci.yml/badge.svg)](https://github.com/jbcom/jeep-sqlite-current-sqljs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/jeep-sqlite-current-sqljs)](https://www.npmjs.com/package/jeep-sqlite-current-sqljs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**This is the exact upstream [jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite) 2.8.0, with
its Stencil loader and its WebAssembly rebuilt together on current
[sql.js](https://github.com/sql-js/sql.js) (1.14.1).** A newer WASM under the old prebuilt
loader is ABI-incompatible, so this is how `@capacitor-community/sqlite` gets a web store on
current sql.js with the API unchanged.

`jeep-sqlite` is a Stencil web component that runs SQLite in the browser, stores each database
in `IndexedDB`, and mirrors the API of
[`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite), so the same code
runs on the web, iOS and Android. The component, its API and its source are
[Jean Pierre Quéau's](https://github.com/jepiqueau/jeep-sqlite). This package keeps his git
history and his MIT copyright, and changes nothing about how the element behaves.

## Why this package exists

The last upstream npm release, `jeep-sqlite@2.8.0` (August 2024), embeds the sql.js 1.11 glue in
its prebuilt loader, but declares `sql.js` as `^1.11.0`. A fresh install therefore resolves a
current sql.js, and the documented step of copying `sql-wasm.wasm` from `node_modules/sql.js`
pairs that newer binary with the old glue. WebAssembly modules and their emscripten glue must come
from the same build, and these do not:

```text
sql.js 1.11 glue + sql.js 1.14 wasm
LinkError: WebAssembly.instantiate(): Import #34 "a" "I": function import requires a callable
```

This package rebuilds the loader on sql.js 1.14.1, pins `sql.js` to exactly that version, and ships
the matching binaries inside the package, so loader and WASM cannot drift apart.

**It retires once upstream ships a release on current sql.js.** The change is small and self-contained
(a rebuild, an exact `sql.js` pin, and the bundled polyfills), and I am glad to offer it upstream as a
pull request; until then, this package carries it.

What differs from upstream `jeep-sqlite@2.8.0`, and nothing else:

- The loader is built with `sql.js` 1.14.1 (and `@stencil/core` 4.45), and `sql.js` is pinned
  exactly rather than by caret.
- The matching `sql-wasm-browser.wasm` and `sql-wasm.wasm` ship in the package, as exports.
- The browser polyfills for `buffer` and `process` are bundled, and a build gate fails if any
  distributed module imports them bare.
- The Stencil Jest runner, retired upstream, is replaced by Vitest; the tooling is current.

See [docs/decisions.md](docs/decisions.md) for each call and the evidence behind it.

## Install

```sh
npm install jeep-sqlite-current-sqljs
```

## Quick start

Register the element, serve the WebAssembly binary from a public path, and put the element in
your page.

```ts
import { defineCustomElements } from 'jeep-sqlite-current-sqljs/loader';

defineCustomElements(window);
```

```html
<jeep-sqlite></jeep-sqlite>
```

The element loads its binary from `/assets/sql-wasm-browser.wasm` unless you set `wasmPath`. Copy
it from the package into your public directory in your build:

```sh
mkdir -p public/assets
cp node_modules/jeep-sqlite-current-sqljs/wasm/sql-wasm-browser.wasm public/assets/
```

A missing or mismatched binary shows up as `TypeError: x is not a function` or a `LinkError` from
`onRuntimeInitialized`.

```ts
const sqlite = document.querySelector('jeep-sqlite');
await customElements.whenDefined('jeep-sqlite');

if (await sqlite.isStoreOpen()) {
  await sqlite.createConnection({ database: 'notes', version: 1 });
  await sqlite.open({ database: 'notes' });
  await sqlite.execute({
    database: 'notes',
    statements: 'CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, body TEXT);',
  });
  await sqlite.run({
    database: 'notes',
    statement: 'INSERT INTO entries (body) VALUES (?);',
    values: ['hello'],
  });
  const { values } = await sqlite.query({ database: 'notes', statement: 'SELECT * FROM entries;' });
  await sqlite.closeConnection({ database: 'notes' }); // persists to IndexedDB
}
```

The database is written to `IndexedDB` when you call `close` or `closeConnection`, or on every
change when the element has `autosave` set.

## Entry points

| Import | What it is |
| --- | --- |
| `jeep-sqlite-current-sqljs/loader` | `defineCustomElements`, the lazy-loading registration used by bundlers |
| `jeep-sqlite-current-sqljs/dist/components/jeep-sqlite.js` | the custom elements bundle, for apps that want one chunk |
| `jeep-sqlite-current-sqljs` | the typings (`Components`, `JSX`) and the CommonJS and ES module entries |
| `jeep-sqlite-current-sqljs/sql-wasm-browser.wasm` | the WebAssembly binary the browser build requests |
| `jeep-sqlite-current-sqljs/sql-wasm.wasm` | the same binary under the name the default sql.js glue requests |
| `dist/jeep-sqlite/jeep-sqlite.esm.js` | the script-tag build, also served from unpkg and jsDelivr |

## API overview

Connections: `createConnection`, `closeConnection`, `isConnection`,
`checkConnectionsConsistency`. Databases: `open`, `close`, `deleteDatabase`, `isDBExists`,
`isDBOpen`, `isDatabase`, `getDatabaseList`, `getTableList`, `isTableExists`,
`getVersion`, `addUpgradeStatement`. Statements: `execute`, `executeSet`, `run`,
`query`, and the transaction controls `beginTransaction`, `commitTransaction`,
`rollbackTransaction`, `isActiveTransaction`. Synchronization: `createSyncTable`,
`getSyncDate`, `setSyncDate`, `importFromJson`, `exportToJson`, `isJsonValid`,
`deleteExportedRows`. Files: `copyFromAssets`, `getFromHTTPRequest`,
`getFromLocalDiskToStore`, `saveToLocalDisk`, `saveToStore`. Events:
`jeepSqliteImportProgress`, `jeepSqliteExportProgress`, `jeepSqliteHTTPRequestEnded`,
`jeepSqlitePickDatabaseEnded`, `jeepSqliteSaveDatabaseToDisk`.

The full reference with worked examples is [docs/API.md](docs/API.md).

## Compatibility

| | |
| --- | --- |
| Browsers | Any with WebAssembly and `IndexedDB`. `saveToLocalDisk` and `getFromLocalDiskToStore` use the File System Access API where present. |
| Bundlers | Vite, webpack and Rollup, through the `loader` entry. `extras.enableImportInjection` is on, so production builds resolve the lazy chunks. |
| Frameworks | Stencil, Ionic, React, Vue, SolidJS, or none. See [docs/Stencil_App.md](docs/Stencil_App.md) for Stencil. |
| Node | Node.js 22, 24 and 26 (`>=22`) to build or install. The component itself runs only in a browser. |

## Links

- Documentation: <https://jonbogaty.com/jeep-sqlite-current-sqljs/>
- Decisions behind this package: [docs/decisions.md](docs/decisions.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md), including the upstream release notes
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security: [SECURITY.md](SECURITY.md)
- Upstream: <https://github.com/jepiqueau/jeep-sqlite>

## License

MIT. Copyright (c) 2018 Jean Pierre Quéau and (c) 2026 Jon Bogaty. See [LICENSE](LICENSE).
