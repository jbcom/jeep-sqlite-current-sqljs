---
title: Introduction
description: What jeep-sqlite-current-sqljs is, why it exists, and when to use it.
---

**`jeep-sqlite-current-sqljs` is the exact upstream
[jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite) 2.8.0, with its Stencil loader and its
WebAssembly rebuilt together on current [sql.js](https://github.com/sql-js/sql.js) (1.14.1).** A
newer WASM under the old prebuilt loader is ABI-incompatible, so this is how
`@capacitor-community/sqlite` gets a web store on current sql.js with the API unchanged.

`jeep-sqlite` is a [Stencil](https://stenciljs.com) web component that puts a real SQLite
database in the browser. Queries run in sql.js, SQLite compiled to WebAssembly. The database
file lives in an `IndexedDB` store named `jeepSqliteStore`, written through
[localForage](https://localforage.github.io/localForage/), so it survives a reload and holds
several named databases side by side.

Its API mirrors [`@capacitor-community/sqlite`](https://github.com/capacitor-community/sqlite),
which is the reason it exists: the Capacitor plugin delegates to this element on the web, so
application code written once runs on the web, iOS and Android. It is also usable directly in
any page, Stencil, Ionic, React, Vue or SolidJS application.

## Upstream, and why this package exists

The component and its API are Jean Pierre Quéau's work. The git history is upstream's with the
rebuild on top, and the MIT license carries both copyright lines.

Upstream's last npm release, `2.8.0` (August 2024), embeds the sql.js 1.11 glue in its prebuilt
loader but depends on `sql.js@^1.11.0`, so a fresh install resolves a current sql.js whose
`sql-wasm.wasm` the old glue cannot instantiate. This package rebuilds the loader on sql.js
1.14.1, pins `sql.js` to exactly that version, and ships the matching binaries. It retires once
upstream ships a release on current sql.js, and the change can be offered upstream as a pull
request. [Decisions](decisions.md) records every call and the evidence.

## When to use it

Use it when you need relational storage in a browser that must persist, work offline, and
share a SQL surface with native SQLite on mobile. It loads the whole database into memory on
`open` and writes it back on `close` (or on each change with `autosave`), which suits
application-sized databases, not multi-gigabyte ones.

Where a database can live only in memory and never needs to persist, plain `sql.js` is
enough and this element adds nothing.

## What is in the package

- The `jeep-sqlite` custom element, registered lazily through the `loader` entry or as one
  bundle from `dist/components`.
- The typings for the element and its method options.
- `sql-wasm-browser.wasm` and `sql-wasm.wasm`, the WebAssembly binaries from the sql.js
  release the loader was built with. See [Getting started](getting-started.md).
