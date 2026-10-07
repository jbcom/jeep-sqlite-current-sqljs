import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

// The element's embedded sql.js glue asks for one of these two binaries at run time, and the
// binary must come from the same sql.js release as the glue. Copy both from the pinned
// dependency: into `wasm/` (shipped in the package, exported as
// `jeep-sqlite-current-sqljs/sql-wasm-browser.wasm` and `.../sql-wasm.wasm`) and into `www/assets/`
// (served by the development server and the manual test pages).
const WASM_FILES = ['sql-wasm-browser.wasm', 'sql-wasm.wasm'];

const require = createRequire(import.meta.url);
const sqlDistRoot = path.dirname(require.resolve('sql.js'));
const packageRoot = path.resolve(import.meta.dirname, '..');
const destinations = [path.join(packageRoot, 'wasm'), path.join(packageRoot, 'www/assets')];

for (const destination of destinations) {
  await mkdir(destination, { recursive: true });
  for (const file of WASM_FILES) {
    await copyFile(path.join(sqlDistRoot, file), path.join(destination, file));
  }
}
