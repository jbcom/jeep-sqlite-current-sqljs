// Stencil writes its ES module output as `.js` files inside a package that is not
// `"type": "module"` (its CommonJS output is `*.cjs.js`, which the field would break). Node
// would therefore parse `dist/esm` and `dist/components` as CommonJS and fail on their `export`
// statements, for example when a server-rendering framework imports the loader. A nested
// package.json scopes `"type": "module"` to exactly those directories, which hold ES modules
// only, and the `exports` map points the `import` conditions into them.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const ES_MODULE_DIRECTORIES = ['dist/esm', 'dist/components', 'dist/jeep-sqlite'];

for (const directory of ES_MODULE_DIRECTORIES) {
  await writeFile(
    path.join(packageRoot, directory, 'package.json'),
    `${JSON.stringify({ type: 'module' }, null, 2)}\n`,
  );
}
