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
    for (const file of ['tables_grid.js', 'app_views.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), ctx);
    }
    ctx.showChoiceDialog = async () => 'yes';
    ctx.showMessageDialog = async () => {};
    ctx.showChoiceDialog = async () => 'yes';
    ctx.showMessageDialog = async () => {};
    return { ctx, button, storage };
}

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

test('tab switches retain drafts and datasheet switching waits for resolved design changes', async () => {
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
    ctx.fetch = async () => { fetches++; return { ok: true, json: async () => ({ ok: true, view: {} }) }; };
    ctx.renderViewTemplate = () => {
        const shell = { dataset: { status: 'Ready' } };
        ctx.content.replaceChildren(shell);
        return shell;
    };
    let closeChecks = 0;
    ctx.initCurrentView = async () => {
        if (ctx.currentView === 'design-demo') ctx.window.acaciadbActiveDesignController = {
            isDirty: () => true, confirmClose: async () => { closeChecks++; return false; }
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
    await ctx.switchTableMode('design');
    assert.equal(ctx.window.acaciadbActiveDesignController, draft);
    assert.equal(draft.isDirty(), false);
});
