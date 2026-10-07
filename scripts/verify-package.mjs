#!/usr/bin/env node

// Packs the package, installs the tarball into an empty scratch project against npmjs only (no
// scoped registry, no token), and checks every entry point the way a consumer reaches it:
// CommonJS with Node, ES modules through a browser-targeted bundle, and the shipped
// WebAssembly against the sql.js that npm installed beside it.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const shell = process.platform === 'win32';

// pnpm forwards its own npm_config_* settings to child processes, and newer npm versions warn
// about pnpm-only keys; hand npm a clean configuration. SKIP_INSTALL_SIMPLE_GIT_HOOKS keeps
// the `prepare` hook installer from writing into the JSON stream of `npm pack`.
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith('npm_config_')),
  ),
  SKIP_INSTALL_SIMPLE_GIT_HOOKS: '1',
};
const registryFlags = [
  '--userconfig',
  path.join(tmpdir(), 'jeep-sqlite-current-sqljs-no-npmrc'),
  '--registry',
  'https://registry.npmjs.org/',
];

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(entryPath);
    else yield entryPath;
  }
}

const scratch = mkdtempSync(path.join(tmpdir(), 'jeep-sqlite-current-sqljs-smoke-'));

try {
  // 1. Pack, and check what ships.
  const packOutput = execFileSync(
    npm,
    ['pack', '--pack-destination', scratch, '--ignore-scripts', '--json'],
    { cwd: packageRoot, encoding: 'utf8', env, shell },
  );
  // npm 10 can print prepare-hook output even with --ignore-scripts; a hook's
  // [INFO] line is not the start of npm's JSON array of package objects.
  const jsonStart = packOutput.search(/^\[\s*\{/m);
  assert(jsonStart !== -1, `npm pack produced no JSON array:\n${packOutput}`);
  const [pack] = JSON.parse(packOutput.slice(jsonStart));
  const packed = new Set(pack.files.map((file) => file.path));

  for (const required of [
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'package.json',
    'dist/index.js',
    'dist/esm/package.json',
    'dist/components/package.json',
    'dist/jeep-sqlite/package.json',
    'dist/index.cjs.js',
    'dist/types/components.d.ts',
    'dist/components/jeep-sqlite.js',
    'dist/jeep-sqlite/jeep-sqlite.esm.js',
    'loader/index.js',
    'loader/index.cjs.js',
    'loader/index.d.ts',
    'wasm/sql-wasm-browser.wasm',
    'wasm/sql-wasm.wasm',
  ]) {
    assert(packed.has(required), `packed artifact is missing ${required}`);
  }
  for (const forbidden of [
    'src/',
    'scripts/',
    'docs/',
    'www/',
    'tests/',
    'coverage/',
    '.github/',
  ]) {
    assert(
      [...packed].every((file) => !file.startsWith(forbidden)),
      `packed artifact unexpectedly contains ${forbidden}`,
    );
  }

  // 2. Every binary the embedded sql.js glue can ask for must ship beside the loader.
  const requested = new Set();
  for (const file of walk(path.join(packageRoot, 'dist'))) {
    if (!/\.(m?js|cjs)$/.test(file)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(/sql-wasm[a-z-]*\.wasm/g)) {
      requested.add(match[0]);
    }
  }
  assert(requested.size > 0, 'no sql-wasm binary is referenced by the built distribution');
  for (const name of requested) {
    assert(packed.has(`wasm/${name}`), `dist asks for ${name} but wasm/${name} is not packed`);
  }

  // 3. Install the tarball into an empty project from npmjs only.
  const project = path.join(scratch, 'consumer');
  execFileSync('node', ['-e', `require('node:fs').mkdirSync(${JSON.stringify(project)})`]);
  writeFileSync(
    path.join(project, 'package.json'),
    '{"name":"consumer","private":true,"type":"commonjs"}\n',
  );
  const tarball = path.join(scratch, pack.filename);
  execFileSync(
    npm,
    [
      'install',
      tarball,
      'esbuild',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      ...registryFlags,
    ],
    { cwd: project, encoding: 'utf8', env, shell, stdio: 'pipe' },
  );

  // 4. The wasm shipped by the package is the one sql.js installed beside it, at the pinned
  //    version: loader glue and binary can never drift apart.
  const installedSql = path.join(project, 'node_modules/sql.js');
  const sqlVersion = JSON.parse(
    readFileSync(path.join(installedSql, 'package.json'), 'utf8'),
  ).version;
  assert.equal(
    sqlVersion,
    manifest.dependencies['sql.js'],
    'sql.js is not pinned to the version the package was built with',
  );
  for (const name of ['sql-wasm-browser.wasm', 'sql-wasm.wasm']) {
    assert.equal(
      sha256(path.join(project, 'node_modules', manifest.name, 'wasm', name)),
      sha256(path.join(installedSql, 'dist', name)),
      `${name} shipped in the package differs from sql.js@${sqlVersion}`,
    );
  }

  // 5. CommonJS: every entry point resolves and loads in Node.
  const cjsCheck = `
    const assert = require('node:assert/strict');
    const { existsSync } = require('node:fs');
    const root = require(${JSON.stringify(`${manifest.name}`)});
    assert.equal(typeof root, 'object');
    const loader = require(${JSON.stringify(`${manifest.name}/loader`)});
    assert.equal(typeof loader.defineCustomElements, 'function');
    for (const wasm of ['sql-wasm-browser.wasm', 'sql-wasm.wasm']) {
      assert(existsSync(require.resolve(${JSON.stringify(`${manifest.name}/`)} + wasm)), wasm);
    }
    assert.equal(require(${JSON.stringify(`${manifest.name}/package.json`)}).name, ${JSON.stringify(manifest.name)});
    console.log('commonjs entry points ok');
  `;
  execFileSync('node', ['-e', cjsCheck], { cwd: project, stdio: 'inherit', env });

  // 6a. ES modules in Node itself, as a server-rendering framework would import them. The
  //     nested package.json files written by scripts/mark-esm.mjs make this parse.
  const esmNodeCheck = `
    import assert from 'node:assert/strict';
    const loader = await import(${JSON.stringify(`${manifest.name}/loader`)});
    assert.equal(typeof loader.defineCustomElements, 'function');
    await import(${JSON.stringify(manifest.name)});
    const component = await import(${JSON.stringify(`${manifest.name}/dist/components/jeep-sqlite.js`)});
    assert.equal(typeof component.defineCustomElement, 'function');
    console.log('esm entry points load in Node');
  `;
  //     Node 22.7+ would guess the module type of an untyped file, so a missing nested
  //     package.json does not fail the import itself; it is asserted from the packed list above.
  execFileSync('node', ['--input-type=module', '-e', esmNodeCheck], {
    cwd: project,
    stdio: 'inherit',
    env,
  });

  // 6b. ES modules: bundle every ESM entry for the browser with esbuild, as an application's
  //    bundler would. Any unresolved import (a bare `buffer`, a missing file, a bad `exports`
  //    target) fails the bundle. The two wasm entries are resolved, not bundled.
  const esmEntry = path.join(project, 'entry.mjs');
  writeFileSync(
    esmEntry,
    [
      `import * as root from '${manifest.name}';`,
      `import { defineCustomElements } from '${manifest.name}/loader';`,
      `import { defineCustomElement } from '${manifest.name}/dist/components/jeep-sqlite.js';`,
      'globalThis.__entries = { root, defineCustomElements, defineCustomElement };',
      '',
    ].join('\n'),
  );
  const bundleCheck = `
    const assert = require('node:assert/strict');
    const esbuild = require('esbuild');
    esbuild.build({
      entryPoints: [${JSON.stringify(esmEntry)}],
      bundle: true,
      write: false,
      format: 'esm',
      platform: 'browser',
      logLevel: 'silent',
      // Stencil's lazy loader imports \`./\${bundleId}.entry.js\` and tells webpack to include only
      // \`*.entry.js\`; esbuild expands the template to every sibling, source maps included.
      loader: { '.map': 'empty' },
    }).then((result) => {
      assert(result.errors.length === 0);
      const code = result.outputFiles[0].text;
      assert(code.includes('defineCustomElements'), 'loader is missing from the bundle');
      assert(code.includes('jeep-sqlite'), 'component is missing from the bundle');
      console.log('esm entry points ok (' + Math.round(code.length / 1024) + ' KiB bundled)');
    });
  `;
  execFileSync('node', ['-e', bundleCheck], { cwd: project, stdio: 'inherit', env });

  assert(existsSync(path.join(project, 'node_modules', manifest.name, 'package.json')));
  console.log(
    `${manifest.name}@${manifest.version}: packed tarball installs from npmjs and every entry point resolves`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
