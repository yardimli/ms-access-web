# AcaciaDB product roadmap

Last reviewed: 2026-08-28

## Product goal

AcaciaDB is intended to become a complete, browser-based replacement for Microsoft Access with a desktop-style experience.

- MySQL is the primary database backend.
- SQLite is a first-class local and portable database option.
- External connector services expose controlled API endpoints that can execute SQL against other database engines.
- Managed and no-code database integrations include Amazon RDS, Azure SQL, Google Cloud SQL, Airtable, Supabase, PlanetScale, Neon, Retool, and similar services.
- Tables, queries, forms, reports, relationships, automation, import/export, and guided wizards should work together as one database application environment.

## Status legend

- `[x]` Implemented in the current codebase.
- `[~]` Prototype or partial implementation; useful UI exists, but the feature is not complete.
- `[ ]` Product story still required.

“Implemented” describes the current source code, not production readiness. Testing, security hardening, accessibility, connector certification, and deployment work remain separate backlog items.

## What is already implemented

### Application shell and visual system

- [x] Access-inspired desktop workspace with title bar, ribbon, navigation pane, document tabs, content workspace, and status bar.
- [x] AcaciaDB branding and custom application icon, including a larger File-screen treatment.
- [x] Light and dark themes with saved theme preference.
- [x] Dark-mode coverage for core tables, forms, reports, query builder, dialogs, tabs, active rows, close buttons, and disabled controls.
- [x] Tailwind CSS 4.3.3 build pipeline through `npm run build`.
- [x] Font Awesome remains the icon system.
- [x] Compact ribbon commands arranged into vertical stacks of up to four buttons while retaining group boundaries.
- [x] Separate Import, Export, and Text Formatting ribbons, with Help fixed after all contextual tabs.
- [x] Resizable and collapsible object navigation pane.
- [x] Multiple document tabs with active-tab switching and closing.
- [x] Workspace restoration for the active database, open tabs, and active view through browser storage.
- [x] Contextual ribbons for table, table design, and form design views.

### File and database workspace

- [x] File backstage with Home, New, and Open experiences.
- [x] MySQL server database discovery with table count, size, and last-updated summaries.
- [x] Create and open MySQL databases.
- [x] Create a named table from Table or Table Design with an ID AutoNumber primary key and open it in the requested view.
- [x] Remember the selected MySQL database for the active session.
- [x] Initialize AcaciaDB metadata storage inside a selected database.
- [x] Database object navigation grouped into tables, forms, queries, and reports.
- [x] Seed/setup workflow for the sample database and sample objects.

### MySQL data and metadata layer

- [x] MySQL connection configuration through environment values.
- [x] Safe database-name and identifier handling for the current MySQL workflows.
- [x] Dynamic discovery of tables and columns from MySQL metadata.
- [x] AcaciaDB object definitions stored as JSON for tables, forms, queries, and reports.
- [x] Table-specific metadata for friendly field names, AcaciaDB types, formats, validation, lookups, defaults, calculated fields, and memo behavior.
- [x] Legacy metadata-table migration logic.
- [x] Internal metadata and relationship tables are hidden from the normal object list.

### Datasheet view

- [x] Dynamic table loading from MySQL.
- [x] Paged record loading with configurable offset and page size.
- [x] Cell selection, row selection, keyboard movement, Enter-to-edit, Tab navigation, and Escape cancellation.
- [x] Inline record editing with update persistence.
- [x] New-record row with insert persistence and validation-error recovery.
- [x] Record deletion by primary key.
- [x] Row copy, paste, duplicate, revert, and context-menu actions.
- [x] First, previous, next, and last record navigation.
- [x] Visual column sorting without changing physical SQL row order.
- [x] Drag-and-drop visual column reordering saved per table in browser storage.
- [x] Resizable column widths saved per table in browser storage.
- [x] Resizable shared row height saved per table in browser storage.
- [x] Friendly field labels with physical SQL names left unchanged unless explicitly renamed.
- [x] Field comment editing backed by MySQL column comments.
- [x] Numeric alignment and formatted currency, date/time, Yes/No, and HTML-text display.
- [x] Checkbox editing for Yes/No fields.
- [x] Date/time editing with native date/time controls.
- [x] Dialog-based multiline editing for memo and large-text fields, including native TEXT, MEDIUMTEXT, and LONGTEXT columns.
- [x] Read-only treatment for protected fields such as AutoNumber, primary-key, calculated, and relationship-driven fields while retaining row selection.
- [x] Default values and calculated-field recalculation in the current table workflow.
- [x] Required, unique, indexed, and expression-based validation metadata and server-side enforcement paths.
- [x] Long Text/Rich Text editing, append-only history, and column-history display.
- [x] Static and table/query-backed lookup display and editing.
- [x] Single-value and multi-value lookup support, including relationship-table storage.
- [x] Add, rename, modify, convert, and delete field operations from datasheet tools.

### Table design view

- [x] Table design grid with Field Name, Data Type, and Description.
- [x] Add, delete, rename, reorder, and change fields in a staged design session.
- [x] Save/discard confirmation with destructive-change warnings.
- [x] Primary-key selection and changes.
- [x] Field properties for size, required, indexed, unique, format, decimals, friendly name, and lookup settings.
- [x] Table property sheet and persisted table metadata.
- [x] Indexes dialog showing current index information.
- [x] Batch schema-change API for applying table design changes to MySQL.

### Lookup Wizard

- [x] Guided choice between table/query values and a manually entered value list.
- [x] Source table/query selection.
- [x] Field selection, ordering, sort configuration, widths, key field, and hidden-key choice.
- [x] Friendly field label, limit-to-list, referential-integrity preference, and multi-value options.
- [x] JSON or relationship-table storage choice for multi-value table lookups.
- [x] Create and modify lookup fields from datasheet and table design views.

### Expressions and validation

- [x] Expression Builder window with field/function browsing and test support.
- [x] Built-in expression-function catalog.
- [x] Validation, default-value, and calculated-field expression purposes.
- [x] Optional natural-language-to-JavaScript conversion through OpenRouter.
- [x] Safety checks that reject obvious browser, network, module, and dynamic-code access in generated expressions.
- [x] OpenRouter request/result logging for troubleshooting.

### Queries, forms, and reports currently present as prototypes

- [~] Visual query builder can display table nodes, select fields, move nodes, draw/remove joins, and add tables.
- [~] Query design grid displays field, table, sort, show, and criteria rows, but most cells are not editable and definitions are not saved or executed.
- [~] Form View displays parent records, linked subform rows, summaries, record navigation, and editable-looking fields.
- [~] Form Design View displays bands, controls, rulers, and a property sheet, but it is primarily a visual mockup and does not persist design changes.
- [~] Report View renders a stored static definition with title, summary cards, table, and chart.
- [~] Status-bar modes expose query SQL/datasheet modes and form/report layout/design/print modes, but several are only soft UI mode changes.

### Import and Export ribbon catalogs

- [~] Import/export commands are listed for Excel, text, SQLite, PHP connector, Node.js connector, and direct MySQL.
- [~] Cloud/API commands are listed for Airtable, Supabase, PlanetScale, Neon, Retool, Amazon RDS, Azure SQL, and Google Cloud SQL.
- [~] These commands currently identify intended integrations; complete connection, mapping, transfer, and sync workflows are still required.

## Remaining product backlog

## Epic A — Connection architecture and database engines

### ACA-001 — Connection manager

- [ ] **Story:** As a database owner, I want to create, name, test, edit, and remove saved connections so that I can manage every data source from one trusted screen.
- **Done when:** The UI shows connection type, endpoint, database, status, last successful use, and clear errors without exposing credentials.

### ACA-002 — Secure credentials

- [ ] **Story:** As an administrator, I want connection secrets protected and separated from ordinary object definitions so that database credentials cannot leak through exports, logs, or the browser.
- **Done when:** Users can update or revoke secrets, and secrets never appear in page source, client storage, exported projects, or application logs.

### ACA-003 — MySQL production connection profiles

- [ ] **Story:** As a user, I want multiple direct MySQL profiles with SSL and connection options so that AcaciaDB can be my primary front end for local and hosted MySQL databases.
- **Done when:** Profiles support host, port, database, authentication, TLS verification, connection testing, and understandable failure messages.

### ACA-004 — SQLite first-class backend

- [ ] **Story:** As a user, I want to create, open, copy, and use SQLite databases with the same table experience as MySQL so that I can work locally and carry a database as a single file.
- **Done when:** Core table CRUD, schema design, queries, forms, reports, metadata, backup, and import/export work against SQLite with clearly documented engine differences.

### ACA-005 — Database-provider capability model

- [ ] **Story:** As a user, I want AcaciaDB to adapt its available features to the connected database so that unsupported operations are explained instead of failing unexpectedly.
- **Done when:** Each connection declares supported schema, transaction, query, data-type, pagination, and metadata capabilities, and the UI responds accordingly.

### ACA-006 — Generic SQL connector contract

- [ ] **Story:** As an integration developer, I want a documented connector API that accepts controlled SQL operations and returns consistent tabular results so that any database engine can participate in AcaciaDB.
- **Done when:** The contract covers discovery, schema, parameters, reads, writes, transactions, paging, errors, health checks, and capability discovery.

### ACA-007 — PHP connector package

- [ ] **Story:** As a PHP developer, I want a reusable connector endpoint so that I can expose a supported database to AcaciaDB without building the protocol myself.
- **Done when:** A guided setup produces a working, authenticated connector and verifies its capabilities from AcaciaDB.

### ACA-008 — Node.js connector package

- [ ] **Story:** As a Node.js developer, I want a reusable connector service so that I can connect database drivers available in the Node ecosystem to AcaciaDB.
- **Done when:** A guided setup produces a working, authenticated connector and verifies its capabilities from AcaciaDB.

### ACA-009 — Connector safety policy

- [ ] **Story:** As an administrator, I want connector permissions to limit schemas and SQL operations so that an external endpoint cannot become unrestricted database access.
- **Done when:** Connections can be read-only or write-enabled, allowed objects can be scoped, dangerous statements can be denied, and every execution is attributable.

### ACA-010 — Transaction support

- [ ] **Story:** As a user, I want multi-step saves and action queries to succeed or fail as one unit so that partial updates do not corrupt business data.
- **Done when:** Supported backends and connectors expose begin, commit, rollback, timeout, and failure outcomes consistently.

## Epic B — Cloud and API integrations

### ACA-020 — Managed relational cloud wizard

- [ ] **Story:** As a cloud database user, I want a guided connection flow for Amazon RDS, Azure SQL, Google Cloud SQL, Supabase, PlanetScale, and Neon so that provider-specific requirements are understandable.
- **Done when:** The wizard explains required host, engine, TLS, network access, and credentials, tests the connection, and stores a usable profile.

### ACA-021 — Amazon RDS integration

- [ ] **Story:** As an AWS user, I want AcaciaDB to connect to supported Amazon RDS engines so that I can build desktop-style database apps over RDS data.
- **Done when:** Supported engines are stated clearly and schema discovery, query, CRUD, import, and export use the appropriate direct or connector route.

### ACA-022 — Azure SQL integration

- [ ] **Story:** As an Azure user, I want AcaciaDB to connect to Azure SQL so that I can work with enterprise relational data using AcaciaDB objects.
- **Done when:** Authentication choices, encrypted connectivity, schema discovery, query, CRUD, import, and export are supported.

### ACA-023 — Google Cloud SQL integration

- [ ] **Story:** As a Google Cloud user, I want AcaciaDB to connect to Cloud SQL so that I can use hosted relational tables in the same workspace as local databases.
- **Done when:** Supported engines and secure connection routes are clear, testable, and usable for schema, query, CRUD, import, and export.

### ACA-024 — Supabase integration

- [ ] **Story:** As a Supabase user, I want to connect PostgreSQL tables with suitable authentication so that AcaciaDB can use them as linked or imported data.
- **Done when:** Table discovery, schema mapping, paging, filters, writes, errors, and row-level-security limitations are visible to the user.

### ACA-025 — PlanetScale integration

- [ ] **Story:** As a PlanetScale user, I want to connect branching MySQL data safely so that AcaciaDB can work within PlanetScale’s supported database behavior.
- **Done when:** Connection, branch selection, capability limits, schema discovery, reads, writes, and transfer workflows are supported.

### ACA-026 — Neon integration

- [ ] **Story:** As a Neon user, I want to connect serverless PostgreSQL databases so that suspended, autoscaling, and branched databases remain usable from AcaciaDB.
- **Done when:** Connection testing, wake-up behavior, branch selection, schema discovery, CRUD, and transfer workflows provide clear status.

### ACA-027 — Airtable integration

- [ ] **Story:** As an Airtable user, I want to browse bases and tables and map Airtable field types so that I can import, export, link, and synchronize tabular data.
- **Done when:** Authentication, base/table selection, field mapping, pagination, attachments, linked records, rate limits, and conflict behavior are handled visibly.

### ACA-028 — Retool Database integration

- [ ] **Story:** As a Retool user, I want to connect Retool Database tables so that AcaciaDB can exchange structured data with Retool applications.
- **Done when:** Available connection methods, supported operations, schema mapping, transfers, and limitations are explained and testable.

### ACA-029 — Linked data and synchronization

- [ ] **Story:** As a user, I want to choose between one-time copy, live linked access, and scheduled synchronization so that each external source behaves the way my application needs.
- **Done when:** Direction, schedule, keys, deletes, conflicts, retries, checkpoints, and last-sync results are configurable and observable.

## Epic C — Tables and relationships

### ACA-040 — Create Table workflow

- [x] **Story:** As a user, I want the Create > Table command to open a usable new table where I can enter fields and records and then save it with a name.
- **Done when:** A new table can be created without using SQL or the seed script, and cancellation leaves no unwanted database object.

### ACA-041 — Table Wizard

- [ ] **Story:** As a new user, I want a Table Wizard with common business templates so that I can create a well-structured table without knowing database design.
- **Done when:** Users choose a template, fields, names, primary key, and optional relationships, preview the result, and create the table.

### ACA-042 — Complete data-type coverage

- [ ] **Story:** As a database designer, I want AcaciaDB field types to map predictably across supported engines so that data meaning and limits are preserved.
- **Done when:** Text lengths, numeric precision, dates/times, booleans, JSON, binary, UUID, attachment, hyperlink, calculated, and engine-native types have clear behavior.

### ACA-043 — Relationship designer

- [ ] **Story:** As a database designer, I want to view and edit relationships visually so that I can understand and maintain how tables are connected.
- **Done when:** The designer can add tables, create/edit/delete relationships, show cardinality, and save supported foreign-key rules.

### ACA-044 — Referential-integrity options

- [ ] **Story:** As a database designer, I want cascade update/delete and restriction choices explained before saving so that related data remains consistent.
- **Done when:** Engine support, existing-data conflicts, and destructive effects are previewed and confirmed.

### ACA-045 — Full index designer

- [ ] **Story:** As a database designer, I want to create and edit named, composite, unique, and ordered indexes so that tables can enforce rules and perform well.
- **Done when:** Index definitions can be saved, validation errors identify the affected fields, and existing indexes can be safely changed or removed.

### ACA-046 — Server-side sort, filter, and search

- [ ] **Story:** As a user of large tables, I want sorting, filtering, and search to run against the complete dataset so that results are correct beyond the currently loaded page.
- **Done when:** Multiple fields, ranges, nulls, wildcards, dates, lookups, saved filters, and clear-filter behavior work with paging.

### ACA-047 — Find and Replace

- [ ] **Story:** As a user, I want to find values and optionally replace matching editable values so that I can correct data efficiently.
- **Done when:** Scope, match mode, direction, confirmation, read-only fields, validation, and a replacement summary are supported.

### ACA-048 — Totals and aggregate row

- [ ] **Story:** As a user, I want a totals row that can count, sum, average, find minimum/maximum, and perform type-appropriate summaries so that I can inspect data quickly.
- **Done when:** Totals reflect the filtered dataset and clearly distinguish page totals from all-record totals.

### ACA-049 — Hide, unhide, freeze, and formatting commands

- [ ] **Story:** As a user, I want the remaining Table and Home ribbon commands to change the active datasheet so that the ribbon is operational rather than decorative.
- **Done when:** Hide/unhide, freeze/unfreeze, field width, row height, gridlines, font, alignment, colors, selection filters, advanced filters, and refresh work and persist where appropriate.

### ACA-050 — Attachments and binary data

- [ ] **Story:** As a user, I want to add, preview, download, replace, and remove attachments so that document-oriented Access applications can be reproduced.
- **Done when:** Storage limits, allowed types, progress, errors, and backend/connector capabilities are clear.

### ACA-051 — Concurrency and edit conflicts

- [ ] **Story:** As a multi-user editor, I want AcaciaDB to detect when another user changed or deleted my record so that I do not silently overwrite their work.
- **Done when:** Conflicts show the original, current, and attempted values with safe choices to refresh, merge, or retry.

### ACA-052 — Undo and redo

- [ ] **Story:** As a user, I want Undo and Redo for supported data and design changes so that mistakes can be corrected without reconstructing work manually.
- **Done when:** The UI states what will be undone, handles committed database operations safely, and clears history when an operation cannot be reversed.

## Epic D — Queries

### ACA-060 — Query Wizard

- [ ] **Story:** As a new user, I want a Query Wizard that guides me through tables, joins, fields, filters, sorting, summaries, and output so that I can create useful queries without writing SQL.
- **Done when:** Simple, summary, duplicate-finder, and unmatched-record paths can create a named, runnable saved query.

### ACA-061 — Editable query design grid

- [ ] **Story:** As a query designer, I want to edit fields, aliases, sort order, visibility, criteria, and OR rows directly in the design grid so that the visual query definition is complete.
- **Done when:** Changes update the query model, validate field references, and survive reopening.

### ACA-062 — Join editor

- [ ] **Story:** As a query designer, I want to edit join direction, type, and multiple join conditions so that inner and outer joins represent the intended records.
- **Done when:** Join properties are visible, editable, validated, and reflected in generated SQL.

### ACA-063 — Save and manage queries

- [ ] **Story:** As a user, I want to create, name, save, rename, duplicate, and delete queries so that query definitions are durable database objects.
- **Done when:** Unsaved changes are detected and object navigation updates immediately after each operation.

### ACA-064 — SQL generation and SQL View

- [ ] **Story:** As an advanced user, I want the visual design to generate SQL and SQL View edits to update the saved query where possible so that I can move between both representations.
- **Done when:** SQL dialect differences are identified, syntax errors are localized, and unsupported round trips are explained before data is lost.

### ACA-065 — Run query and Datasheet View

- [ ] **Story:** As a user, I want to run a saved query and inspect its live paged results so that queries are useful beyond their design canvas.
- **Done when:** Parameters, progress, cancellation, result counts, errors, sorting, filtering, and export are supported.

### ACA-066 — Calculated and aggregate query fields

- [ ] **Story:** As an analyst, I want expressions, aliases, grouping, totals, and aggregate functions in queries so that I can produce business summaries.
- **Done when:** The design grid supports common aggregates and validates expressions before execution.

### ACA-067 — Parameter queries

- [ ] **Story:** As an application builder, I want named query parameters with types and prompts so that a saved query can request values safely at runtime.
- **Done when:** Parameters are bound rather than concatenated and can be supplied by prompts, forms, macros, or connector callers.

### ACA-068 — Action queries

- [ ] **Story:** As a power user, I want append, update, delete, and make-table queries with previews and warnings so that bulk data operations are controlled.
- **Done when:** Affected-row estimates, transaction behavior, cancellation, permissions, and an execution summary are shown.

### ACA-069 — Crosstab, union, pass-through, and data-definition queries

- [ ] **Story:** As an advanced user, I want specialized query types so that AcaciaDB can cover reporting pivots, combined datasets, backend-native SQL, and controlled schema scripts.
- **Done when:** Each type has an appropriate editor, capability checks, execution rules, and clear safety warnings.

## Epic E — Forms

### ACA-080 — Form Wizard

- [ ] **Story:** As a user, I want a Form Wizard that selects a record source, fields, layout, style, and title so that I can build a usable data-entry form quickly.
- **Done when:** Columnar, tabular, datasheet, justified, and parent/subform layouts create saved forms that open immediately.

### ACA-081 — Blank Form and Form Design creation

- [ ] **Story:** As a designer, I want Blank Form and Form Design commands to create new saved form objects so that I can start from an empty canvas.
- **Done when:** The form can be named, saved, reopened, renamed, duplicated, and deleted.

### ACA-082 — Functional form controls

- [ ] **Story:** As a designer, I want to add and configure text boxes, labels, buttons, checkboxes, combo boxes, lists, tabs, images, hyperlinks, charts, web content, and subforms so that forms can represent real workflows.
- **Done when:** Controls can be selected, moved, resized, copied, deleted, bound, formatted, layered, and persisted.

### ACA-083 — Record binding and editing

- [ ] **Story:** As a data-entry user, I want form controls to load, validate, insert, update, and delete records so that forms are a complete alternative to datasheets.
- **Done when:** Navigation, new record, dirty-state prompts, validation, defaults, lookups, conflicts, and errors behave consistently with tables.

### ACA-084 — Form properties and events

- [ ] **Story:** As an application designer, I want persisted form, section, and control properties plus event assignments so that behavior can be configured without editing source files.
- **Done when:** Format, Data, Event, Other, and All property tabs edit the selected object and save changes.

### ACA-085 — Form layout tools

- [ ] **Story:** As a designer, I want stacked/tabular layouts, insert row/column, merge/split, align, size, spacing, margins, padding, anchoring, and layer ordering so that complex forms stay organized.
- **Done when:** Arrange-ribbon commands modify selected controls predictably and can be undone.

### ACA-086 — Layout View

- [ ] **Story:** As a designer, I want Layout View to adjust a form while viewing live data so that sizing and alignment decisions use realistic content.
- **Done when:** Supported layout edits persist without allowing accidental record changes.

### ACA-087 — Subforms and linked records

- [ ] **Story:** As an application designer, I want configurable parent/child links and nested form navigation so that one-to-many workflows work naturally.
- **Done when:** Link fields, filtering, new child records, deletes, totals, and empty parent states are handled.

### ACA-088 — Navigation forms and menus

- [ ] **Story:** As an application owner, I want navigation forms and startup menus so that end users can operate a database app without using the object pane.
- **Done when:** Navigation targets, permissions, default startup object, and browser history behavior are configurable.

### ACA-089 — Form themes and conditional formatting

- [ ] **Story:** As a designer, I want themes and rules that change control appearance based on values so that forms communicate state clearly while supporting light and dark mode.
- **Done when:** Themes, fonts, colors, conditional rules, preview, and accessible contrast are persisted.

## Epic F — Reports

### ACA-100 — Report Wizard

- [ ] **Story:** As a user, I want a Report Wizard for source, fields, grouping, sorting, summaries, layout, orientation, and style so that I can produce a printable report quickly.
- **Done when:** The wizard previews and saves a report backed by live data.

### ACA-101 — Labels Wizard

- [ ] **Story:** As a user, I want a Labels Wizard with page and label dimensions, field arrangement, sorting, and preview so that I can print mailing and product labels accurately.
- **Done when:** Common label templates and custom sizes paginate correctly.

### ACA-102 — Live report record sources

- [ ] **Story:** As a report viewer, I want reports to execute their table or query source when opened so that values are current rather than stored sample rows.
- **Done when:** Parameters, filters, no-data states, errors, and refresh are supported.

### ACA-103 — Report Design View

- [ ] **Story:** As a report designer, I want to add, move, resize, bind, format, and remove controls across report sections so that report layouts are fully editable.
- **Done when:** Report/page/group headers and footers, detail sections, rulers, selection, property sheets, and persistence work.

### ACA-104 — Grouping, sorting, and totals

- [ ] **Story:** As a report designer, I want multi-level grouping, sorting, running totals, subtotals, and grand totals so that reports summarize data meaningfully.
- **Done when:** Group headers/footers and page-break choices are visible in preview and output.

### ACA-105 — Charts and visualizations

- [ ] **Story:** As a report designer, I want charts bound to report data so that visuals update with filters and parameters.
- **Done when:** Chart type, series, categories, labels, legends, colors, empty states, and accessible descriptions are configurable.

### ACA-106 — Print Preview and pagination

- [ ] **Story:** As a user, I want accurate Print Preview with page size, margins, orientation, headers, footers, page numbers, and zoom so that printed output matches expectations.
- **Done when:** Page breaks and repeated headings are stable across supported browsers and PDF output.

### ACA-107 — Report export

- [ ] **Story:** As a user, I want to export a report to PDF, Excel, CSV, and printable HTML so that I can distribute results in the format recipients need.
- **Done when:** Export respects report filters, parameters, visible fields, formatting, pagination, and file naming.

## Epic G — Import, export, linking, and migration wizards

### ACA-120 — Import Wizard framework

- [ ] **Story:** As a user, I want a consistent multi-step Import Wizard so that every source follows familiar selection, preview, mapping, validation, and completion steps.
- **Done when:** Imports can create a table or append to one, save mapping choices, report rejected rows, and provide a resumable summary.

### ACA-121 — Excel import/export

- [ ] **Story:** As a user, I want to import and export Excel workbooks with sheet, header, type, and range choices so that spreadsheet data moves cleanly between tools.
- **Done when:** Multiple sheets, dates, formulas-as-values, nulls, large files, mapping errors, and export formatting are handled.

### ACA-122 — CSV and text import/export

- [ ] **Story:** As a user, I want delimited and fixed-width text workflows with encoding and locale options so that text data is parsed and generated correctly.
- **Done when:** Preview, delimiter, quote, header, encoding, date, decimal, null, and malformed-row behavior are configurable.

### ACA-123 — SQLite import/export

- [ ] **Story:** As a user, I want to import from and export to a SQLite file so that a database can move between portable and server-backed use.
- **Done when:** Table selection, schema conversion, keys, indexes, data, conflicts, progress, and a completion report are supported.

### ACA-124 — Direct MySQL transfer

- [ ] **Story:** As a user, I want to copy selected schemas and data between MySQL databases so that I can migrate or publish an AcaciaDB application safely.
- **Done when:** Object selection, create/replace/append choices, keys, indexes, transactions, large tables, and conflicts are handled.

### ACA-125 — Connector import/export

- [ ] **Story:** As a user, I want PHP and Node.js connector sources to use the same mapping and transfer experience as direct databases so that engine location does not change the workflow.
- **Done when:** Capability limits, paging, retries, cancellation, rejects, and transfer summaries are visible.

### ACA-126 — Saved transfer definitions

- [ ] **Story:** As a user, I want to save, rerun, rename, schedule, and delete import/export definitions so that recurring transfers do not require repeated setup.
- **Done when:** Definitions exclude secrets and retain source, destination, mapping, conflict, and notification choices.

### ACA-127 — Access database migration wizard

- [ ] **Story:** As a Microsoft Access user, I want to migrate an `.accdb` or `.mdb` application so that tables, relationships, queries, forms, reports, macros, and metadata have a clear path into AcaciaDB.
- **Done when:** The wizard inventories objects, maps supported features, flags unsupported items, imports what it can, and produces a detailed remediation report.

### ACA-128 — Access expression and SQL compatibility report

- [ ] **Story:** As a migration user, I want Access-specific expressions, functions, SQL, and object references analyzed so that I know what will work and what must be changed.
- **Done when:** Every translated, partially translated, and unsupported expression is linked to its affected object.

## Epic H — Automation, macros, and application behavior

### ACA-140 — Macro designer

- [ ] **Story:** As an application designer, I want a visual macro designer with conditions and approved actions so that I can automate behavior without writing code.
- **Done when:** Macros can be created, named, validated, run, saved, duplicated, and assigned to supported events.

### ACA-141 — Data macros and table events

- [ ] **Story:** As a database designer, I want before/after insert, update, and delete rules so that table-level business logic runs consistently regardless of the UI used.
- **Done when:** Execution order, cancellation, errors, transactions, recursion limits, and audit information are clear.

### ACA-142 — Form and control events

- [ ] **Story:** As a form designer, I want events such as open, load, current, before update, after update, click, change, and error so that forms can drive real application workflows.
- **Done when:** Events can run macros or approved scripts and failures are visible without losing user data.

### ACA-143 — Safe scripting replacement for VBA

- [ ] **Story:** As an advanced Access developer, I want a documented, permission-aware scripting model so that complex applications can be migrated without granting unrestricted browser or server access.
- **Done when:** The model defines object APIs, database commands, prompts, logging, timeouts, secrets, and prohibited capabilities.

### ACA-144 — Scheduled automation

- [ ] **Story:** As an application owner, I want queries, transfers, reports, and macros to run on a schedule so that recurring work happens without an open browser session.
- **Done when:** Schedules, timezone, retries, concurrency, credentials, history, cancellation, and notifications are manageable.

### ACA-145 — Webhooks and API actions

- [ ] **Story:** As an integrator, I want macros to call approved APIs and respond to authenticated webhooks so that AcaciaDB participates in broader business workflows.
- **Done when:** Endpoints, methods, headers, secret references, payload templates, validation, retries, and logs are configurable.

## Epic I — Application management and collaboration

### ACA-160 — Object lifecycle management

- [ ] **Story:** As a designer, I want to rename, duplicate, delete, restore, and organize every object type so that the navigation pane is a complete application workspace.
- **Done when:** Dependencies and destructive effects are shown before changes, and navigation/tabs update immediately.

### ACA-161 — Object dependency viewer

- [ ] **Story:** As a designer, I want to see which objects use a table, field, query, form, report, macro, or connection so that changes do not break the application unexpectedly.
- **Done when:** Upstream and downstream dependencies are searchable and link to the affected objects.

### ACA-162 — Database templates and Quick Start

- [ ] **Story:** As a new user, I want curated database and application templates so that I can begin with useful tables, relationships, forms, queries, and reports.
- **Done when:** Templates can be previewed, customized, created, and updated without overwriting user work.

### ACA-163 — Application settings

- [ ] **Story:** As an application owner, I want settings for startup form, navigation visibility, theme, locale, date/number formats, default connection, and behavior so that the finished app fits its users.
- **Done when:** Settings are scoped appropriately to user, database, or deployed application.

### ACA-164 — User authentication

- [ ] **Story:** As an administrator, I want users to sign in securely so that database applications and connection secrets are not anonymously available.
- **Done when:** Session lifecycle, password or identity-provider login, recovery, lockout, logout, and security events are supported.

### ACA-165 — Roles and permissions

- [ ] **Story:** As an administrator, I want role-based permissions for connections, objects, schema, records, exports, automation, and administration so that users receive only the access they need.
- **Done when:** Permissions are enforced on the server and connector, not only hidden in the UI.

### ACA-166 — Record-level access rules

- [ ] **Story:** As an application owner, I want record filters based on the signed-in user or role so that one shared table can safely serve different teams or customers.
- **Done when:** Rules apply consistently to tables, forms, queries, reports, exports, APIs, and totals.

### ACA-167 — Audit trail

- [ ] **Story:** As an administrator, I want a searchable history of schema, data, connection, export, permission, and automation changes so that activity is accountable.
- **Done when:** Entries include actor, time, object, action, outcome, and appropriate before/after context without storing secrets.

### ACA-168 — Multi-user presence and locking

- [ ] **Story:** As a team user, I want to know when another person is editing the same object or design so that we avoid conflicting changes.
- **Done when:** Presence, edit ownership, timeouts, takeover rules, and recovery from disconnected sessions are clear.

## Epic J — Reliability, security, and operations

### ACA-180 — Automated test suite

- [ ] **Story:** As a maintainer, I want repeatable unit, API, integration, and browser tests so that changes to one Access-like feature do not break another.
- **Done when:** Core MySQL and SQLite workflows, dark/light modes, keyboard editing, wizards, connectors, and permission boundaries run in continuous integration.

### ACA-181 — End-to-end acceptance matrix

- [ ] **Story:** As a product owner, I want a feature matrix comparing AcaciaDB behavior with the intended Access replacement scope so that release gaps are explicit.
- **Done when:** Tables, queries, forms, reports, macros, import/export, relationships, and migration scenarios have versioned acceptance tests.

### ACA-182 — Backup and restore

- [ ] **Story:** As a database owner, I want to back up and restore data plus AcaciaDB object definitions so that I can recover from mistakes or infrastructure failure.
- **Done when:** Backup scope, encryption, retention, verification, restore preview, and engine/connector limitations are visible.

### ACA-183 — Project export and portability

- [ ] **Story:** As an application owner, I want to export and import an AcaciaDB project definition separately from its data so that applications can move between development, test, and production.
- **Done when:** Connections reference replaceable secret names and imports show conflicts and version compatibility.

### ACA-184 — Schema migration history

- [ ] **Story:** As a team, I want schema and object-definition changes recorded as ordered migrations so that environments can be upgraded consistently.
- **Done when:** Pending/applied status, checksums, failures, rollback guidance, and drift detection are available.

### ACA-185 — Security hardening

- [ ] **Story:** As an administrator, I want the application protected against request forgery, injection, unsafe files, session theft, connector abuse, and secret leakage so that it can host real business data.
- **Done when:** A documented threat model and security test suite cover browser, PHP API, MySQL, SQLite files, imports, exports, expressions, and connectors.

### ACA-186 — Observability and diagnostics

- [ ] **Story:** As an operator, I want health checks, structured logs, performance metrics, slow-query visibility, and correlation IDs so that failures can be diagnosed without exposing data or secrets.
- **Done when:** Database, connector, transfer, automation, and browser errors can be traced end to end.

### ACA-187 — Performance and large datasets

- [ ] **Story:** As a user with large databases, I want responsive navigation, virtualized grids, cancellable operations, and server-side paging so that AcaciaDB remains usable at production scale.
- **Done when:** Published targets cover record counts, column counts, query duration, memory, transfer size, and concurrent users.

### ACA-188 — Deployment and upgrade workflow

- [ ] **Story:** As an operator, I want documented installation, configuration, upgrade, rollback, and environment checks so that AcaciaDB can be deployed reliably.
- **Done when:** Supported PHP, browser, MySQL, SQLite, web-server, TLS, filesystem, worker, and scheduler requirements are validated.

### ACA-189 — Error recovery and offline interruption

- [ ] **Story:** As a user, I want unsaved edits and long-running operations to recover gracefully from network loss, expired sessions, or browser refresh so that transient failures do not destroy work.
- **Done when:** The UI distinguishes retryable, conflicting, unauthorized, and permanent failures and preserves safe drafts.

## Epic K — UX completeness and accessibility

### ACA-200 — Operational ribbon audit

- [ ] **Story:** As a user, I want every visible ribbon command either to perform its named action or clearly indicate why it is unavailable so that the interface never feels misleading.
- **Done when:** Every command has an owner, enabled-state rule, keyboard path, tooltip, outcome, and acceptance test.

### ACA-201 — Finish Tailwind migration

- [ ] **Story:** As a maintainer, I want the remaining UI styles consolidated into the Tailwind 4 design system while preserving the AcaciaDB desktop appearance so that themes and future changes remain consistent.
- **Done when:** Hard-coded legacy colors and duplicated component rules are removed or tokenized, and `npm run build` is the documented production path.

### ACA-202 — Full keyboard workflow

- [ ] **Story:** As a keyboard user, I want to operate the ribbon, navigation pane, tabs, grids, designers, dialogs, menus, and wizards without a mouse so that database work remains fast and accessible.
- **Done when:** Focus order, shortcuts, selection, editing, cancellation, menu navigation, and focus restoration are predictable.

### ACA-203 — Accessibility conformance

- [ ] **Story:** As a user of assistive technology, I want meaningful names, roles, states, contrast, scaling, and announcements so that AcaciaDB is usable without relying on visual cues alone.
- **Done when:** Core workflows meet the chosen WCAG target in light and dark modes and pass automated plus manual screen-reader testing.

### ACA-204 — Responsive web workspace

- [ ] **Story:** As a user on a smaller browser window, I want ribbons, panes, dialogs, grids, and designers to remain reachable without clipped commands so that the web app works beyond one desktop resolution.
- **Done when:** Ribbon overflow, zoom, minimum sizes, touch targets, and horizontal/vertical navigation are intentional and tested.

### ACA-205 — Command search and help

- [ ] **Story:** As a user, I want “Tell me what you want to do” to find commands, objects, and help so that I can discover features without memorizing ribbon locations.
- **Done when:** Results explain availability, run safe commands, open relevant objects, and link to contextual documentation.

### ACA-206 — Consistent notifications and progress

- [ ] **Story:** As a user, I want consistent progress, success, warning, cancellation, and error feedback so that I always know whether an operation completed.
- **Done when:** Long-running queries, imports, exports, schema changes, syncs, backups, and reports provide progress and a result summary.

### ACA-207 — Localization and regional formats

- [ ] **Story:** As an international user, I want translated UI and locale-aware numbers, currency, dates, times, sorting, and imports so that AcaciaDB handles regional data correctly.
- **Done when:** Display locale is separate from stored values and can be configured per user or application.

## Suggested delivery order

1. **Production table application:** authentication, permissions, security, MySQL profiles, concurrency, relationships, server-side filtering, tests, and backup/restore.
2. **Second database engine:** SQLite provider plus create/open/import/export and portability tests.
3. **Complete query system:** saved query design, SQL generation, execution, results, parameters, and action-query safety.
4. **Complete forms:** Form Wizard, persistent designer, bound controls, events, subforms, layouts, and navigation forms.
5. **Complete reports:** live sources, Report Wizard, designer, grouping, print preview, PDF/Excel export, and Labels Wizard.
6. **External data platform:** connector contract, PHP/Node packages, transfer wizard, saved transfers, sync, and cloud-provider profiles.
7. **Access migration and automation:** `.accdb`/`.mdb` inventory/import, compatibility reporting, macros, events, safe scripting, and schedules.
8. **Release hardening:** performance targets, accessibility, operational ribbon audit, deployment, observability, recovery, and complete acceptance matrix.

## Definition of a complete Access-replacement release

- [ ] A non-developer can create or connect to a database, build related tables, enter and validate data, and recover from mistakes.
- [ ] A non-developer can create, save, run, and reuse queries without writing SQL, while advanced users can use SQL View safely.
- [ ] A non-developer can build persistent forms and reports using guided wizards and visual designers.
- [ ] MySQL and SQLite pass the same documented core behavior suite.
- [ ] External SQL connector services and supported cloud integrations pass contract and security tests.
- [ ] Import, export, linking, and synchronization produce auditable results and recover safely from interruption.
- [ ] Authentication, roles, record access, auditing, backup/restore, concurrency, and secret management are production-ready.
- [ ] Every visible ribbon command has a tested action or an explicit unavailable state.
- [ ] Light/dark themes, keyboard use, accessibility, supported browsers, deployment, upgrades, and performance meet published release targets.
