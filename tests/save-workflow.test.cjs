const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function context() {
    const storage = new Map();
    const button = { dataset: {}, disabled: true };
    const ctx = vm.createContext({
        console, structuredClone, queueMicrotask,
        window: {}, currentDatabaseName: 'test', currentView: 'table-demo',
        openTabs: [{ view: 'table-demo' }],
        tableViewPairs: { 'table-demo': 'design-demo' },
        designViewPairs: { 'design-demo': 'table-demo' }, formViewPairs: {}, formDesignViewPairs: {},
        isTableDatasheetView: view => view.startsWith('table-'),
        isTableDesignView: view => view.startsWith('design-'),
        document: { querySelector: () => button, addEventListener() {} },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key)
        },
        closeActiveCellEditor: () => true,
        showMessageDialog: async () => {},
        showChoiceDialog: async () => 'yes',
        status: {}, databasePromise: null,
        escapeHtml: value => String(value ?? '')
    });
    for (const file of ['expression-functions.js', 'expression-builder.js', 'tables_ribbon.js', 'tables_grid.js', 'app_views.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), ctx);
    }
    ctx.showChoiceDialog = async () => 'yes';
    ctx.showMessageDialog = async () => {};
    ctx.showChoiceDialog = async () => 'yes';
    ctx.showMessageDialog = async () => {};
    return { ctx, button, storage };
}

test('datasheet rename keeps its page, selected cell, scroll, and pending row values', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../assets/tables_datasheet.js'), 'utf8');
    const start = source.indexOf('        async function openColumnDialog(');
    const end = source.indexOf('        async function saveCalculatedField(', start);
    const original = { old: 'original', id: 42 };
    const row = { old: 'edited', id: 42 };
    const ctx = vm.createContext({
        activeColumnName: 'old', cursorColumnName: 'old', cursorRowIndex: 17,
        tableName: 'Demo', tableDef: {}, rows: [row], insertDraft: { old: 'draft' },
        dirtyRows: new Map([['42', { original }]]), sortState: { column: 'old' },
        pagination: { skip: 500, limit: 500 }, prefs: {}, session: { baseline: '{}' },
        host: { scrollTop: 420, scrollLeft: 260, focus(options) { assert.equal(options.preventScroll, true); } },
        columnByName: () => ({}), status: {},
        showColumnDialog: async options => options.onSubmit({ name: 'renamed', friendlyName: '', comment: '' }),
        postSchemaAction: async () => ({ payload: { structure: { columns: [{ name: 'renamed' }] }, data: [] } }),
        savePrefs() {}, renamedColumnPrefs: prefs => prefs, readTablePrefs: () => ({}),
        renderTable() { ctx.host.scrollTop = 0; ctx.host.scrollLeft = 0; }, updateCellCursor() {}
    });
    vm.runInContext(source.slice(start, end), ctx);
    await ctx.openColumnDialog();
    assert.equal(ctx.cursorRowIndex, 17);
    assert.equal(ctx.cursorColumnName, 'renamed');
    assert.equal(ctx.pagination.skip, 500);
    assert.equal(ctx.host.scrollTop, 420);
    assert.equal(ctx.host.scrollLeft, 260);
    assert.equal(ctx.sortState.column, 'renamed');
    assert.deepEqual(row, { renamed: 'edited', id: 42 });
    assert.deepEqual(original, { renamed: 'original', id: 42 });
    assert.equal(ctx.insertDraft.renamed, 'draft');
    ctx.showColumnDialog = async () => null;
    await ctx.openColumnDialog();
    assert.equal(ctx.host.scrollTop, 420);
    assert.equal(ctx.cursorRowIndex, 17);
});

test('renaming a field preserves custom order, width, and sort without changing other preferences', () => {
    const { ctx } = context();
    const prefs = { columnOrder: ['c', 'a', 'b'], columnWidths: { a: 240, b: 100 },
        sortState: { column: 'a', direction: 'asc' }, rowHeight: 30 };
    const renamed = ctx.renamedColumnPrefs(prefs, 'a', 'renamed');
    const table = { structure: { columns: ['renamed', 'b', 'c'].map(name => ({ name })) } };
    assert.deepEqual(Array.from(ctx.orderedTableColumns(table, renamed), column => column.name), ['c', 'renamed', 'b']);
    assert.equal(renamed.columnWidths.renamed, 240);
    assert.equal(renamed.columnWidths.a, undefined);
    assert.equal(renamed.sortState.column, 'renamed');
    assert.equal(renamed.sortState.direction, 'asc');
    assert.equal(renamed.rowHeight, 30);
    assert.equal(prefs.columnOrder[1], 'a');
    assert.deepEqual(Object.keys(ctx.renamedColumnPrefs({}, 'a', 'renamed')), []);
});

test('SQL default choices restrict NULL and CURRENT_TIMESTAMP and the value dialog supports cancel', async () => {
    const { ctx } = context();
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/tables_design_editor.js'), 'utf8'), ctx);
    const text = ctx.sqlDefaultControl({ type: 'Short Text', mysqlType: 'VARCHAR(255)', required: true });
    assert.match(text, /value="null"[^>]*disabled/);
    assert.match(text, /value="current_timestamp"[^>]*disabled/);
    const timestamp = ctx.sqlDefaultControl({ type: 'Date/Time', mysqlType: 'DATETIME' });
    assert.doesNotMatch(timestamp, /value="current_timestamp"[^>]*disabled/);
    let handlers, field;
    ctx.document.body = { appendChild() {} };
    ctx.showMovableModal = () => {};
    ctx.document.createElement = () => {
        handlers = {};
        field = { value: '', focus() {} };
        return { querySelector(selector) {
            if (selector === 'input') return field;
            return { addEventListener(event, handler) { handlers[selector] = handler; } };
        }, addEventListener(event, handler) { handlers[event] = handler; },
        close() { handlers.close(); }, remove() {} };
    };
    const confirmed = ctx.showSqlDefaultDialog();
    field.value = "O'Brien";
    handlers.form({ preventDefault() {} });
    assert.equal(await confirmed, "O'Brien");
    const cancelled = ctx.showSqlDefaultDialog('existing');
    handlers['[data-default-cancel]']();
    assert.equal(await cancelled, null);
});

test('layout is temporary, saved on close, and isolated by database', async () => {
    const { ctx, storage } = context();
    const session = await ctx.tableLayoutSession('Demo');
    session.prefs = { columnOrder: ['b', 'a'], columnWidths: { b: 220 }, sortState: { column: 'b', direction: 'desc' } };
    assert.equal(storage.size, 0);
    assert.equal(await ctx.tableLayoutSession('Demo'), session);
    assert.equal(await ctx.confirmTableLayoutClose(ctx.openTabs[0]), true);
    assert.equal(JSON.stringify(ctx.readTablePrefs('Demo')), JSON.stringify(session.prefs));
    ctx.currentDatabaseName = 'other';
    assert.equal(Object.keys(ctx.readTablePrefs('Demo')).length, 0);
});

test('load Yes, No, Forget, and cancelled close preserve the correct saved layout', async () => {
    const { ctx, storage } = context();
    ctx.writeTablePrefs('Demo', { columnWidths: { a: 180 } });
    let session = await ctx.tableLayoutSession('Demo');
    assert.equal(session.prefs.columnWidths.a, 180);
    delete ctx.openTabs[0].layout;
    ctx.showChoiceDialog = async () => 'no';
    session = await ctx.tableLayoutSession('Demo');
    assert.equal(Object.keys(session.prefs).length, 0);
    session.prefs = { columnWidths: { a: 240 } };
    ctx.showChoiceDialog = async () => 'cancel';
    assert.equal(await ctx.confirmTableLayoutClose(ctx.openTabs[0]), false);
    ctx.showChoiceDialog = async () => 'no';
    assert.equal(await ctx.confirmTableLayoutClose(ctx.openTabs[0]), true);
    assert.equal(ctx.readTablePrefs('Demo').columnWidths.a, 180);
    delete ctx.openTabs[0].layout;
    ctx.showChoiceDialog = async () => 'forget';
    await ctx.tableLayoutSession('Demo');
    assert.equal(storage.size, 0);
});

test('Quick Save is disabled in datasheets and saves dirty editors without confirmation', async () => {
    const { ctx, button } = context();
    let dirty = true;
    let options;
    ctx.window.acaciadbActiveDesignController = {
        isDirty: () => dirty,
        saveDesign: async value => { options = value; dirty = false; }
    };
    ctx.updateQuickSaveState();
    assert.equal(button.disabled, true);
    ctx.currentView = 'design-demo';
    ctx.updateQuickSaveState();
    assert.equal(button.disabled, false);
    await ctx.quickSave();
    assert.equal(options.promptForConfirmation, false);
    assert.equal(button.disabled, true);
    ctx.currentView = 'query-demo';
    dirty = true;
    ctx.window.acaciadbActiveObjectController = { isDirty: () => dirty, save: async () => { dirty = false; } };
    ctx.updateQuickSaveState();
    assert.equal(button.disabled, false);
    await ctx.quickSave();
    assert.equal(button.disabled, true);
    dirty = true;
    ctx.window.acaciadbActiveObjectController.save = async () => { throw new Error('offline'); };
    await ctx.quickSave();
    assert.equal(button.disabled, false);
});

test('design drag leaves the primary key fixed, stays draft, and saves order once', async () => {
    const { ctx } = context();
    ctx.currentView = 'design-demo';
    const handlers = {};
    const body = { innerHTML: '' };
    const view = {
        dataset: { tableId: 'Demo' },
        querySelector: selector => selector === '[data-design-body]' ? body : null,
        querySelectorAll: () => [],
        addEventListener: (type, handler) => { handlers[type] = handler; }
    };
    ctx.content = { querySelectorAll: () => [view] };
    ctx.ribbon = { querySelector: () => null };
    const columns = [
        { name: 'a', type: 'Short Text' },
        { name: 'id', type: 'AutoNumber', primaryKey: true },
        { name: 'b', type: 'Short Text' }
    ];
    const db = { tables: { Demo: { structure: { columns, primaryKey: 'id' } } } };
    let calls = 0;
    ctx.postSchemaAction = async request => {
        calls++;
        assert.deepEqual(Array.from(request.columnOrder), ['b', 'id', 'a']);
        return { payload: { structure: { columns: request.columnOrder.map(name => columns.find(column => column.name === name)), primaryKey: 'id' } } };
    };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/tables_design_editor.js'), 'utf8'), ctx);
    ctx.initDesignViews(db);
    const controller = ctx.window.acaciadbActiveDesignController;
    assert.equal(controller.isDirty(), false);
    let prevented = false;
    handlers.dragstart({ target: { closest: () => ({ dataset: { designRowHead: '1' } }) }, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    handlers.dragstart({ target: { closest: () => ({ dataset: { designRowHead: '0' } }) }, dataTransfer: { setData() {} } });
    handlers.drop({ target: { closest: () => ({ dataset: { designRow: '2' } }) }, preventDefault() {} });
    assert.equal(controller.isDirty(), true);
    assert.equal(calls, 0);
    assert.ok(body.innerHTML.indexOf('value="b"') < body.innerHTML.indexOf('value="id"'));
    assert.ok(body.innerHTML.indexOf('value="id"') < body.innerHTML.indexOf('value="a"'));
    ctx.showChoiceDialog = async () => 'cancel';
    assert.equal(await controller.confirmClose(), false);
    assert.equal(calls, 0);
    const successfulSave = ctx.postSchemaAction;
    ctx.postSchemaAction = async () => { throw new Error('Save failed'); };
    ctx.showChoiceDialog = async () => 'apply';
    assert.equal(await controller.confirmClose({ switchingToDatasheet: true }), false);
    assert.equal(controller.isDirty(), true);
    ctx.postSchemaAction = successfulSave;
    assert.equal(await controller.saveDesign({ promptForConfirmation: false }), true);
    assert.equal(calls, 1);
    assert.equal(controller.isDirty(), false);
    handlers.dragstart({ target: { closest: () => ({ dataset: { designRowHead: '0' } }) }, dataTransfer: { setData() {} } });
    handlers.drop({ target: { closest: () => ({ dataset: { designRow: '2' } }) }, preventDefault() {} });
    assert.equal(controller.isDirty(), true);
    ctx.showChoiceDialog = async () => 'abandon';
    assert.equal(await controller.confirmClose({ switchingToDatasheet: true }), true);
    assert.equal(controller.isDirty(), false);
    assert.equal(calls, 1);
    assert.ok(body.innerHTML.indexOf('value="b"') < body.innerHTML.indexOf('value="id"'));
});

test('design shows SQL labels and Access names and saves calculated value edits', async () => {
    const { ctx } = context();
    const handlers = {};
    const body = { innerHTML: '' };
    const properties = { innerHTML: '', classList: { toggle() {} } };
    const view = { dataset: { tableId: 'Demo' }, querySelector: selector => ({
        '[data-design-body]': body, '[data-field-property-grid]': properties
    })[selector] || null, querySelectorAll: () => [],
    addEventListener: (type, handler) => { handlers[type] = handler; } };
    ctx.content = { querySelectorAll: () => [view] };
    ctx.ribbon = { querySelector: () => null };
    const columns = [{ name: 'total', type: 'Calculated Field', calculatedJavascript: 'function(fields) { return 1; }' },
        { name: 'name', type: 'Short Text' }];
    const db = { tables: { Demo: { structure: { columns, primaryKey: '' } } } };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/tables_design_editor.js'), 'utf8'), ctx);
    ctx.initDesignViews(db);
    assert.match(body.innerHTML, /value="Short Text"[^>]*>Short Text \(VARCHAR\(255\)\)/);
    assert.doesNotMatch(body.innerHTML, /data-design-access-type/);
    assert.doesNotMatch(view.innerHTML, /MS Access Type/);
    assert.match(properties.innerHTML, /data-field-property="calculatedJavascript"/);
    assert.doesNotMatch(properties.innerHTML, /data-field-property="(?:inputMask|validationRule|defaultExpression|required)"/);
    const next = 'function(fields) { return fields.quantity * fields.price; }';
    handlers.input({ target: { closest: () => null, matches: () => false,
        dataset: { fieldProperty: 'calculatedJavascript' }, value: next } });
    let saved;
    ctx.postSchemaAction = async request => {
        saved = request.columns[0];
        return { payload: { structure: { columns: [{ ...columns[0], ...saved }, columns[1]], primaryKey: '' } } };
    };
    assert.equal(await ctx.window.acaciadbActiveDesignController.saveDesign({ promptForConfirmation: false }), true);
    assert.equal(saved.type, 'Calculated Field');
    assert.equal(saved.calculatedJavascript, next);
    assert.equal(ctx.mysqlFieldTypeLabel('Currency'), 'DECIMAL(12,2)');
    assert.equal(ctx.mysqlFieldTypeLabel('Calculated Field'), 'Calculated Field');
});

test('field size updates the selected VARCHAR label and the saved SQL declaration', async () => {
    const { ctx } = context();
    const handlers = {};
    const body = { innerHTML: '' };
    const view = { dataset: { tableId: 'Demo' }, querySelector: selector => selector === '[data-design-body]' ? body : null,
        querySelectorAll: () => [], addEventListener: (type, handler) => { handlers[type] = handler; } };
    ctx.content = { querySelectorAll: () => [view] };
    ctx.ribbon = { querySelector: () => null };
    const columns = [{ name: 'title', type: 'Short Text', mysqlType: 'VARCHAR(255)', fieldSize: 255 }];
    const db = { tables: { Demo: { structure: { columns, primaryKey: '' } } } };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/tables_design_editor.js'), 'utf8'), ctx);
    ctx.initDesignViews(db);
    handlers.input({ target: { closest: () => null, matches: () => false,
        dataset: { fieldProperty: 'fieldSize' }, value: '512' } });
    assert.match(body.innerHTML, /value="Short Text" selected>Short Text \(VARCHAR\(512\)\)/);
    assert.match(body.innerHTML, /value="sql:BLOB"/);
    assert.match(body.innerHTML, /value="sql:DECIMAL\(10,2\)"/);
    let saved;
    ctx.postSchemaAction = async request => {
        saved = request.columns[0];
        return { payload: { structure: { columns: [{ ...columns[0], ...saved }], primaryKey: '' } } };
    };
    assert.equal(await ctx.window.acaciadbActiveDesignController.saveDesign({ promptForConfirmation: false }), true);
    assert.equal(saved.mysqlType, 'VARCHAR(512)');
});

test('query changes save to the API and a failed save remains dirty', async () => {
    const { ctx } = context();
    const events = {};
    const element = { innerHTML: '', style: {}, querySelectorAll: () => [],
        setAttribute() {}, insertAdjacentHTML() {},
        addEventListener: (type, handler) => { events[type] = handler; } };
    const builder = { dataset: { queryId: 'Demo' }, querySelector: () => element };
    ctx.content = { querySelectorAll: () => [builder] };
    ctx.getDefinitionByName = (definitions, name) => definitions[name];
    ctx.resolveTableName = (db, name) => name;
    ctx.normalizeFieldRef = (db, ref) => ref;
    ctx.fetch = async (url, request) => {
        assert.equal(url, 'api/objects.php');
        assert.equal(JSON.parse(request.body).definition.fields[0].show, false);
        return { ok: true, json: async () => ({ ok: true }) };
    };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/queries.js'), 'utf8'), ctx);
    ctx.initQueryBuilders({ tables: {}, queries: { Demo: { tables: [], fields: [{ table: 'T', field: 'a', show: true }] } } });
    const controller = ctx.window.acaciadbActiveObjectController;
    assert.equal(controller.isDirty(), false);
    const toggle = value => events.change({ target: { closest: () => ({ dataset: { queryShow: '0' }, checked: value }) } });
    toggle(false);
    assert.equal(controller.isDirty(), true);
    await controller.save();
    assert.equal(controller.isDirty(), false);
    toggle(true);
    ctx.fetch = async () => ({ ok: false, json: async () => ({ error: 'offline' }) });
    await assert.rejects(controller.save(), /offline/);
    assert.equal(controller.isDirty(), true);
});

test('form parent and child edits save records while leaving source data untouched before save', async () => {
    const { ctx } = context();
    const events = {};
    const view = { dataset: { formId: 'Demo' }, querySelector: () => ({}),
        addEventListener: (type, handler) => { events[type] = handler; } };
    ctx.content = { querySelectorAll: () => [view] };
    ctx.activeCellEditor = null;
    ctx.formatValue = value => String(value);
    ctx.buildTableMarkup = () => '';
    ctx.enableSubformSorting = () => {};
    let childEdit;
    ctx.enableEditableCells = (host, rows, options) => { childEdit = options.onRowEdit; };
    const saved = [];
    ctx.postRecordAction = async request => { saved.push(request); return { row: request.row }; };
    const db = { forms: { Demo: { parentTable: 'Parent', parentKey: 'id', fields: ['name'], subform: { table: 'Child', foreignKey: 'parentId', columns: ['value'] } } },
        tables: {
            Parent: { structure: { primaryKey: 'id', columns: [{ name: 'name' }] }, data: [{ id: 1, name: 'old' }] },
            Child: { structure: { primaryKey: 'id', columns: [{ name: 'value' }] }, data: [{ id: 2, parentId: 1, value: 'old' }] }
        } };
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/forms.js'), 'utf8'), ctx);
    ctx.initFormViews(db);
    const controller = ctx.window.acaciadbActiveObjectController;
    assert.equal(controller.isDirty(), false);
    events.input({ target: { dataset: { formField: 'name' }, value: 'new' } });
    childEdit(0, 'value', 'new child');
    assert.equal(controller.isDirty(), true);
    assert.equal(db.tables.Parent.data[0].name, 'old');
    assert.equal(db.tables.Child.data[0].value, 'old');
    await controller.save();
    assert.equal(saved.length, 2);
    assert.equal(saved[0].primaryKeyValue, 1);
    assert.equal(saved[1].row.value, 'new child');
    assert.equal(controller.isDirty(), false);
});

test('tab switches retain drafts but clean design views reload the current schema', async () => {
    const { ctx } = context();
    ctx.openTabs = [];
    ctx.currentView = '';
    ctx.viewTitles = {};
    ctx.content = { childNodes: [], querySelector() { return this.childNodes[0] || null; },
        replaceChildren(...nodes) { this.childNodes = nodes; } };
    Object.defineProperty(ctx.content, 'innerHTML', { set() { this.childNodes = []; } });
    for (const name of ['renderDocumentTabs', 'setActiveObject', 'updateContextualRibbon', 'renderStatusViewButtons', 'mergeViewData']) ctx[name] = () => {};
    ctx.getDatabase = async () => ({});
    let fetches = 0;
    let sourceFields = ['old_name'];
    let loadedFields;
    ctx.mergeViewData = (db, data) => { loadedFields = data.fields; };
    ctx.fetch = async (url, options) => {
        assert.equal(options.cache, 'no-store');
        fetches++;
        return { ok: true, json: async () => ({ ok: true, view: { data: { fields: [...sourceFields] } } }) };
    };
    ctx.renderViewTemplate = () => {
        const shell = { dataset: { status: 'Ready' } };
        ctx.content.replaceChildren(shell);
        return shell;
    };
    let closeChecks = 0;
    let newDesignDirty = true;
    ctx.initCurrentView = async () => {
        if (ctx.currentView === 'design-demo') ctx.window.acaciadbActiveDesignController = {
            fields: loadedFields,
            isDirty: () => newDesignDirty, confirmClose: async () => { closeChecks++; return false; }
        };
    };
    await ctx.loadView('design-demo');
    const draft = ctx.window.acaciadbActiveDesignController;
    const nodes = ctx.content.childNodes;
    await ctx.loadView('query-other');
    await ctx.loadView('design-demo');
    assert.equal(ctx.window.acaciadbActiveDesignController, draft);
    assert.equal(ctx.content.childNodes[0], nodes[0]);
    assert.equal(fetches, 2);
    await ctx.switchTableMode('datasheet');
    assert.equal(ctx.openTabs.length, 2);
    assert.equal(ctx.currentView, 'design-demo');
    assert.equal(fetches, 2);
    assert.equal(closeChecks, 1);
    await ctx.closeActiveTab();
    assert.equal(closeChecks, 2);
    assert.equal(ctx.openTabs.length, 2);
    draft.confirmClose = async options => {
        assert.equal(options.switchingToDatasheet, true);
        draft.isDirty = () => false;
        return true;
    };
    await ctx.switchTableMode('datasheet');
    assert.equal(ctx.currentView, 'table-demo');
    sourceFields = ['renamed_field', 'new_field'];
    newDesignDirty = false;
    await ctx.switchTableMode('design');
    assert.notEqual(ctx.window.acaciadbActiveDesignController, draft);
    assert.deepEqual(ctx.window.acaciadbActiveDesignController.fields, ['renamed_field', 'new_field']);
    assert.equal(ctx.window.acaciadbActiveDesignController.isDirty(), false);
    assert.equal(fetches, 4);
});
