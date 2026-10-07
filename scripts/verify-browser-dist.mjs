import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DISTRIBUTION_ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
const BARE_NODE_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\()\s*['"](?:node:)?(?:buffer|process)['"]/;

async function distributionFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? distributionFiles(path) : [path];
    }),
  );
  return nested.flat();
}

const files = (await distributionFiles(DISTRIBUTION_ROOT)).filter((path) =>
  JAVASCRIPT_EXTENSIONS.has(extname(path)),
);
const offenders = [];

for (const path of files) {
  if (BARE_NODE_IMPORT.test(await readFile(path, 'utf8'))) {
    offenders.push(relative(DISTRIBUTION_ROOT, path));
  }
}

if (offenders.length > 0) {
  throw new Error(
    `Browser distribution contains bare buffer/process imports:\n${offenders.join('\n')}`,
  );
}

console.log(`Verified ${files.length} browser distribution modules without bare Node imports.`);
