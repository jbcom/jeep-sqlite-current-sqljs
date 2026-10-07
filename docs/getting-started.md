---
title: Getting started
description: Install the package, register the element, serve the WebAssembly binary, and run a first query.
---

## Install

```sh
npm install jeep-sqlite-current-sqljs
```

The package depends on `sql.js` (pinned exactly), `localforage`, `jszip` and
`browser-fs-access`, and installs them for you. The Node polyfills `sql.js` and `jszip` need in
a browser are bundled into the distribution, so an application that registers the element
through the `loader` entry adds no polyfill plugin of its own.

## Register the element

With a bundler (Vite, webpack, Rollup, Ionic), call the lazy loader once at start-up:

```ts
import { defineCustomElements } from 'jeep-sqlite-current-sqljs/loader';

defineCustomElements(window);
```

With Vite, add the loader to `optimizeDeps.include` so the dev server pre-bundles it:

```ts
export default defineConfig({
  optimizeDeps: { include: ['jeep-sqlite-current-sqljs/loader'] },
});
```

Without a bundler, load the script build from a CDN or from `node_modules`:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/jeep-sqlite-current-sqljs/dist/jeep-sqlite/jeep-sqlite.esm.js"
></script>
```

To get one chunk instead of lazy chunks, import the custom elements bundle and define the tag
yourself:

```ts
import { defineCustomElement } from 'jeep-sqlite-current-sqljs/dist/components/jeep-sqlite.js';

defineCustomElement();
```

## Serve the WebAssembly binary

`sql.js` fetches its binary when the element first opens a database, from `/assets` unless you
set `wasmPath`. The embedded glue asks for `sql-wasm-browser.wasm`. Copy that file into your
public directory as part of the build; the package ships it, built from the same sql.js release
as the glue:

```sh
mkdir -p public/assets
cp node_modules/jeep-sqlite-current-sqljs/wasm/sql-wasm-browser.wasm public/assets/
```

Bundlers can also resolve it through the package exports, for example as a Vite asset URL:

```ts
import wasmUrl from 'jeep-sqlite-current-sqljs/sql-wasm-browser.wasm?url';
```

and to serve it from elsewhere:

```html
<jeep-sqlite wasmPath="/static/wasm"></jeep-sqlite>
```

`sql-wasm.wasm` is the same binary under the name the default (non-browser) sql.js glue
requests; ship it too if your toolchain swaps the glue.

The binary must come from the sql.js release the loader was built with, which is why the package
pins `sql.js` exactly and ships its own copy. A binary from a different sql.js release fails with
`LinkError: WebAssembly.instantiate()`.

## Add the element and run a query

```html
<jeep-sqlite autosave></jeep-sqlite>
```

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
  await sqlite.closeConnection({ database: 'notes' });
}
```

`closeConnection` writes the database to `IndexedDB`; with `autosave` set, every write does.

## With Capacitor

`@capacitor-community/sqlite` calls this element on the web. Register it as above, add the
`<jeep-sqlite>` element to the page, and call `CapacitorSQLite.initWebStore()` before opening
a database. The same code then runs on iOS and Android against native SQLite.

## Frameworks

The upstream walkthrough for [Stencil applications](Stencil_App.md) is kept, with its
dependency lines updated for this package. Ionic, React, Vue and SolidJS applications use the
loader as shown above.

## Next

- [API reference](API.md) lists every method, event and property.
- [Architecture](ARCHITECTURE.md) explains how the pieces fit and where the limits are.
