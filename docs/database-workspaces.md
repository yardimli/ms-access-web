# Database workspaces

File → Home lists the ten most recently opened databases. File → Open lists the browser's demo and uploaded or created SQLite files. The MySQL / MariaDB tile opens a separate connection and database browser. File → New creates SQLite files, or a server database after a connection is configured.

The connection host, port, username and password are stored in localStorage and supplied to PHP for requests. Connections originate from the PHP server, which must be allowed to reach the database host. The database account needs permissions for the requested operations. Browser requests do not fall back to the server's `.env` credentials.

Each browser gets a localStorage GUID. SQLite files are stored under that GUID in the server's temporary workspace directory. This provides the requested browser separation without accounts. Clearing browser storage loses the reference to that workspace. Download files to keep a durable copy; system temporary-directory cleanup can remove them.

## Server setup

- PHP 8.1 or later with `pdo_sqlite` and `mysqli`, and permission to write temporary files.
- Access imports require a JDK 11 or later, PHP `proc_open`, and the importer libraries. Install them from the repository root with `python scripts/install_access_importer.py`. Libraries are pinned and downloaded from Maven Central; downloaded jars are ignored by Git and must be installed on each deployment.
- Put `JAVA_BIN=C:/path/to/bin/java.exe` (or a Unix path) in `.env` if Java is not on PATH. The importer also checks JAVA_HOME and the local PhpStorm Java runtime on Windows.
- Optionally set `WORKSPACE_TEMP_DIR=C:/path/to/workspaces` in `.env`. Otherwise the application uses its own folder inside the operating system's temporary directory.
- Set PHP `upload_max_filesize`, `post_max_size`, and `max_execution_time` to accommodate your database files and conversion time. For example, `upload_max_filesize=64M` and `post_max_size=65M`. A larger import may also need a higher PHP memory limit.

The checked-in `data/northwind-demo.sqlite` was exported from the current Northwind database, including the application's saved object definitions. Every browser receives a separate copy. Reset Demo replaces only that browser's copy. To prepare a new template, run `php scripts/export_northwind.php northwind path/to/new-template.sqlite`, review it, then replace the template. The export reads the CLI `.env` MySQL connection and refuses to overwrite an existing destination.

## Access import coverage

Uploading `.mdb` or `.accdb` opens a selection dialog before conversion. Supported local tables are selected by default; saved queries can be selected separately. The importer copies data, column definitions, primary keys, indexes and enforced relationships between selected tables. It retains supported field properties as application metadata.

Saved Access queries are retained as editable SQL definitions. Access SQL is not automatically translated into executable SQLite queries. Forms, reports, macros and VBA are not converted. Linked tables and tables containing complex attachment or multivalue fields are marked unavailable in the dialog. Access-specific validation/default expressions and binary/OLE content do not gain full Access behavior in the web editor.

SQLite supports the application's ordinary record and design operations. Existing-record updates and deletes require a single-column primary key; tables without one or with composite keys remain available to inspect and download. The database itself retains those keys and data.

## Database assistant

The header's **Tell me what you want to do** button opens chat for the current SQLite database. MySQL/MariaDB databases show an unsupported-database message. Configure `OPENROUTER_API_KEY` and `OPENROUTER_CHAT_MODEL` in `.env`; the model falls back to `OPENROUTER_MODEL` when the chat-specific setting is absent.

Each request sends the conversation and table schemas, relationships, indexes, and saved form/query/report structures to OpenRouter. Table rows and cached report data are excluded. Conversation history stays in localStorage, separately for each browser workspace and database, until **Reset Chat** is clicked. Resetting chat does not undo database changes.

The API uses OpenRouter's [JSON response format](https://openrouter.ai/docs/guides/features/structured-outputs) and independently validates every returned action before execution.

The model returns JSON actions: SQLite table/index SQL or validated form/query/report definitions. Actions run sequentially in one transaction; invalid actions, stale structure, SQL failures or broken foreign keys roll back the batch. Forms support a parent table and optional subform. Reports read up to 500 local rows when opened. Saved SQL queries appear in the SQL definition editor; chat does not execute SELECT queries or return record data to the model. The dialog reports the applied actions and refreshes the object list.

Run `php tests/database-chat.php` for execution and validation checks. Add `--live` to test the configured OpenRouter model against a disposable in-memory database.

## Workspace verification

Run `node --test tests/save-workflow.test.cjs tests/file-workspace.test.cjs` for browser-state and save workflow tests. Run `python tests/database-workspaces.py` for the real PHP API integration checks. Integration checks use disposable browser workspaces, the installed Java importer, and a read-only connection to the configured Northwind MariaDB source. They also fetch a pinned Jackcess MDB query fixture into the ignored `tests/.tmp` directory.
