import { createRequire } from 'node:module';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsonSQLite } from '../../src/interfaces/interfaces';
import { Database } from '../../src/utils/database';

// The element persists through localForage; this in-memory store implements the calls the
// Database class makes, so the real sql.js engine and the real persistence logic run in Node.
class MemoryStore {
  readonly items = new Map<string, Uint8Array | null>();
  async getItem(key: string) {
    return this.items.has(key) ? this.items.get(key) : null;
  }
  async setItem(key: string, value: Uint8Array | null) {
    this.items.set(key, value);
    return value;
  }
  async removeItem(key: string) {
    this.items.delete(key);
  }
  async keys() {
    return [...this.items.keys()];
  }
}

const require = createRequire(import.meta.url);
// In Node, sql.js reads its binary from the directory `wasmPath` points at.
const wasmPath = path.dirname(require.resolve('sql.js'));

const progress = { emit: vi.fn() } as never;

function open(store: MemoryStore, version = 1, upgrades = {}, autoSave = false) {
  const db = new Database('notesSQLite.db', version, upgrades, store as never, autoSave, wasmPath);
  return db.open().then(() => db);
}

describe('sql.js pin', () => {
  it('pins sql.js exactly, so the embedded loader and the shipped wasm never drift apart', () => {
    const pkg = require('../../package.json') as { dependencies: Record<string, string> };
    const installed = require(path.join(wasmPath, '..', 'package.json')) as { version: string };
    expect(pkg.dependencies['sql.js']).toMatch(/^\d+\.\d+\.\d+$/);
    expect(installed.version).toBe(pkg.dependencies['sql.js']);
  });
});

describe('Database', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it('creates a database on first open and stores an initial entry', async () => {
    const db = await open(store);
    expect(db.isDBOpen()).toBe(true);
    expect(store.items.has('notesSQLite.db')).toBe(true);
    expect(await db.getVersion()).toBe(0);
  });

  it('runs statements, binds values and queries rows', async () => {
    const db = await open(store);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT NOT NULL);');
    const inserted = await db.runSQL('INSERT INTO entries (body) VALUES (?);', ['hello'], true, 'no');
    expect(inserted.changes).toBe(1);
    expect(inserted.lastId).toBe(1);

    const rows = await db.selectSQL('SELECT id, body FROM entries WHERE body = ?;', ['hello']);
    expect(rows).toEqual([{ id: 1, body: 'hello' }]);
    expect(await db.getTableNames()).toContain('entries');
    expect(await db.isTable('entries')).toBe(true);
    expect(await db.isTable('missing')).toBe(false);
  });

  it('runs a batch set in one transaction', async () => {
    const db = await open(store);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT);');
    const result = await db.execSet([
      { statement: 'INSERT INTO entries (body) VALUES (?);', values: ['one'] },
      { statement: 'INSERT INTO entries (body) VALUES (?);', values: ['two'] },
    ]);
    expect(result.changes).toBe(2);
    expect(await db.selectSQL('SELECT body FROM entries ORDER BY id;', [])).toEqual([
      { body: 'one' },
      { body: 'two' },
    ]);
  });

  it('rolls back a failing batch and leaves no partial writes', async () => {
    const db = await open(store);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT NOT NULL);');
    await expect(
      db.execSet([
        { statement: 'INSERT INTO entries (body) VALUES (?);', values: ['kept?'] },
        { statement: 'INSERT INTO entries (body) VALUES (?);', values: [null] },
      ]),
    ).rejects.toThrow();
    expect(await db.selectSQL('SELECT * FROM entries;', [])).toEqual([]);
  });

  it('rejects statements on a database that is not open', async () => {
    const db = new Database('notesSQLite.db', 1, {}, store as never, false, wasmPath);
    await expect(db.executeSQL('SELECT 1;')).rejects.toThrow(/not opened/);
    await expect(db.selectSQL('SELECT 1;', [])).rejects.toThrow(/not opened/);
    await expect(db.runSQL('SELECT 1;', [], true, 'no')).rejects.toThrow(/not opened/);
  });

  it('persists on close and reads the rows back from the store on the next open', async () => {
    const first = await open(store);
    await first.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT);');
    await first.runSQL('INSERT INTO entries (body) VALUES (?);', ['kept'], true, 'no');
    await first.close();
    expect(first.isDBOpen()).toBe(false);
    expect(store.items.get('notesSQLite.db')?.length).toBeGreaterThan(0);

    const second = await open(store);
    expect(await second.selectSQL('SELECT body FROM entries;', [])).toEqual([{ body: 'kept' }]);
  });

  it('saves after every write when autosave is on', async () => {
    const db = await open(store, 1, {}, true);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT);');
    expect(store.items.get('notesSQLite.db')?.length).toBeGreaterThan(0);
  });

  it('commits an explicit transaction and rolls one back', async () => {
    const db = await open(store);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT);');

    await db.beginTransaction();
    expect(db.isTransActive()).toBe(true);
    await db.runSQL('INSERT INTO entries (body) VALUES (?);', ['gone'], false, 'no');
    await db.rollbackTransaction();
    expect(await db.selectSQL('SELECT * FROM entries;', [])).toEqual([]);

    await db.beginTransaction();
    await db.runSQL('INSERT INTO entries (body) VALUES (?);', ['stays'], false, 'no');
    await db.commitTransaction();
    expect(await db.selectSQL('SELECT body FROM entries;', [])).toEqual([{ body: 'stays' }]);
  });

  it('applies incremental upgrade statements and records the new version', async () => {
    const first = await open(store, 1);
    await first.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY, body TEXT);');
    await first.executeSQL('PRAGMA user_version = 1;');
    await first.close();

    const upgrades = {
      2: { toVersion: 2, statements: ['ALTER TABLE entries ADD COLUMN done INTEGER DEFAULT 0;'] },
    };
    const upgraded = await open(store, 2, upgrades);
    expect(await upgraded.getVersion()).toBe(2);
    await upgraded.runSQL('INSERT INTO entries (body, done) VALUES (?, ?);', ['x', 1], true, 'no');
    expect(await upgraded.selectSQL('SELECT done FROM entries;', [])).toEqual([{ done: 1 }]);
  });

  it('round-trips a database through the JSON import and export used for synchronization', async () => {
    const json: JsonSQLite = {
      database: 'notes',
      version: 1,
      encrypted: false,
      mode: 'full',
      tables: [
        {
          name: 'entries',
          schema: [
            { column: 'id', value: 'INTEGER PRIMARY KEY NOT NULL' },
            { column: 'body', value: 'TEXT NOT NULL' },
            { column: 'last_modified', value: 'INTEGER' },
          ],
          values: [
            [1, 'first', 1700000000],
            [2, 'second', 1700000001],
          ],
        },
      ],
    };
    const db = await open(store);
    await db.importJson(json, progress);
    expect(await db.selectSQL('SELECT body FROM entries ORDER BY id;', [])).toEqual([
      { body: 'first' },
      { body: 'second' },
    ]);

    const exported = await db.exportJson('full', progress);
    expect(exported.database).toBe('notes');
    expect(exported.tables[0].name).toBe('entries');
    expect(exported.tables[0].values).toHaveLength(2);
  });

  it('removes a database from the store', async () => {
    const db = await open(store);
    await db.executeSQL('CREATE TABLE entries (id INTEGER PRIMARY KEY);');
    await db.close();
    expect(await db.isDBExists('notesSQLite.db')).toBe(true);
    await db.deleteDB('notesSQLite.db');
    expect(await db.isDBExists('notesSQLite.db')).toBe(false);
  });
});
