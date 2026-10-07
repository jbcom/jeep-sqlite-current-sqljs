# Changelog

## 2.9.0 (2026-10-07)

First release of `jeep-sqlite-current-sqljs`: upstream `jeep-sqlite@2.8.0` (`3f3c8f2`) with its
Stencil loader and WebAssembly rebuilt together on sql.js 1.14.1.

### Features

* rebuild the loader on sql.js 1.14.1 and `@stencil/core` 4.45, with `sql.js` pinned exactly
* ship the matching `sql-wasm-browser.wasm` and `sql-wasm.wasm` as package exports
* bundle the browser polyfills and fail the build on bare `buffer` or `process` imports
* add an `exports` map covering `.`, `./loader` and the WebAssembly files

### Tests

* run the specs on Vitest through `@stencil/vitest`

## Upstream release notes

These are the release notes of [jepiqueau/jeep-sqlite](https://github.com/jepiqueau/jeep-sqlite)
up to `2.8.0`, kept for the history of the component.

- Realease 2.8.0 ->>
    Update @stencil/core to 4.20.0
    Update sql.js to 1.11.0
    Merge PR#41: Support production build for bundlers like Vite by setting Stencil extra.enableImportInjection=true  frpm thomasjahoda

- Release 2.5.6 ->>
    Step back to sql.js@1.8.0  as sql.js@1.9.0  give an `Error: out of memory` see issue #33.

- Release 2.5.0 ->>
  - add methods to manage the transaction process flow :
      `beginTransaction, commitTransaction, rollbackTransaction,
       isActiveTransaction` see index_transaction.html
  - upgrade to @stencil/core@4.0.5

- Release 2.3.8 ->>
  - add support for RETURNING in sqlite statement

- Release 2.3.2 ->>
  - add property `pickText` to customize the pick button text.
  - add property `saveText` to customize the save button text.
  - add property `buttonOptions` to customise the button style.
  - add - From Local Disk to Store - to Usage chapter.

- Release 2.3.1 ->>
  - add `jeepSqliteSaveDatabaseToDisk`event listener.

- Release 2.3.0 ->>
    Use of the `File System Access API` through the [Browser-FS-Access](https://www.npmjs.com/package/browser-fs-access) module.
  - add `getFromLocalDiskToStore`: read a database from your local disk and save it to the IndexedDB `jeepSqliteStore` store.
  - add `saveToLocalDisk`: save a database to your local disk will allows developers to view the database in separate DB tools like `DB Browser for Sqlite`.
  - add `jeepSqlitePickDatabaseEnded` event listener.
  - add `index_getFromLocalDiskToStore.html` to demonstrate the use of the two new methods.

- Release 2.1.0, 2.2.0->> DEPRECATED

- Release 1.6.6 ->>
    fix WAL mode for concurrency access to databases. WAL2 is not supported

- Release 1.6.4 ->>
    add `jeepSqliteHTTPRequestEnded` event listener

- Release 1.6.3 ->>
    add `getFromHTTPRequest` to get database or zip containing multiple database files from a remote server.

- Release 1.6.2 ->>
    add database read-only mode

- Release 1.6.0 ->>
    Update sql.js@1.8.0

- Release 1.5.8 ->>
    The API method `addUpgradeStatement` has been modified to define the new structure of the database as a list of incremental upgrades. Every upgrade is executed over the previous version.
    see <https://github.com/capacitor-community/sqlite/blob/master/docs/UpgradeDatabaseVersion.md>

- Release 1.5.7 ->>
    The path for the `sql-wasm.wasm` file which is by default `/assets` can now be specified by adding the property `wasmPath` to `jeep-sqlite`

  - default

    ```html
    <jeep-sqlite autoSave="true"></jeep-sqlite>
    ```

  - given the wasm file path

    ```html
    <jeep-sqlite autoSave="true" wasmPath="/assets/wasm"></jeep-sqlite>
    ```

- Release 1.5.0 ->>

The main change is related to the delete table's rows when a synchronization table exists as well as a last_mofidied table's column, allowing for database synchronization of the local database with a remote server database.

- All existing triggers to YOUR_TABLE_NAME_trigger_last_modified must be modified as follows

  ```sql
  CREATE TRIGGER YOUR_TABLE_NAME_trigger_last_modified
    AFTER UPDATE ON YOUR_TABLE_NAME
    FOR EACH ROW WHEN NEW.last_modified < OLD.last_modified
    BEGIN
        UPDATE YOUR_TABLE_NAME SET last_modified= (strftime('%s', 'now')) WHERE id=OLD.id;
    END;
  ```

- an new column `sql_deleted` must be added to each of your tables as

  ```sql
  sql_deleted BOOLEAN DEFAULT 0 CHECK (sql_deleted IN (0, 1))
  ```

  This column will be autommatically set to 1 when you will use a `DELETE FROM ...` sql statement in the `execute`, `run` or `executeSet` methods.

- In the JSON object that you provide to `importFromJson`, all the deleted rows in your remote server database's tables must have the `sql_deleted` column set to 1. This will indicate to the import process to physically delete the corresponding rows in your local database. All the others rows must have the `sql_deleted` column set to 0.

- In the JSON object outputs by the `exportToJson`, all the deleted rows in your local database have got the `sql_deleted` column set to 1 to help in your synchronization management process with the remote server database. A system `last_exported_date` is automatically saved in the synchronization table at the start of the export process flow.

- On successfull completion of your synchronization management process with the remote server database, you must
  - Set a new synchronization date (as `(new Date()).toISOString()`) with the `setSyncDate` method.
  - Execute the `deleteExportedRows` method which physically deletes all table's rows having 1 as value for the `sql_deleted` column prior to the `last_exported_date` in your local database.

An example of using this new feature is given in the `index_delete.html` file. It has been used to test the validity of the implementation.
