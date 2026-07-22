import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sqlDistRoot = path.dirname(require.resolve('sql.js'));
const destinationDirectory = path.resolve(import.meta.dirname, '../www/assets');

await mkdir(destinationDirectory, { recursive: true });
await copyFile(
  path.join(sqlDistRoot, 'sql-wasm.wasm'),
  path.join(destinationDirectory, 'sql-wasm.wasm'),
);
