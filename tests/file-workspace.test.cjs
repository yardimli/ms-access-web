const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function browser() {
    const values = new Map(); const requests = [];
    const listeners = {};
    const detailPanel = { innerHTML: '' };
    const errorPanel = { insertAdjacentHTML(position, html) { this.innerHTML = html; } };
    const backstage = { hidden: true, addEventListener(type, handler) { listeners[type] = handler; }, querySelector: selector => selector === '.database-detail-panel' ? detailPanel : selector === '.file-backstage-main' ? errorPanel : null, insertAdjacentHTML() {} };
    const ctx = vm.createContext({ crypto: webcrypto, URL, URLSearchParams, Headers, Request, TextEncoder, btoa, console,
        localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
        location: { href: 'http://localhost/app/index.php', origin: 'http://localhost' },
        window: { fetch: async (input, options) => {
            requests.push({ input, options });
            if (options?.method === 'POST') {
                const { database } = JSON.parse(options.body);
                return { ok: true, json: async () => ({ ok: true, database, item: { id: database, name: 'Northwind Demo', engine: 'sqlite' } }) };
            }
            if (String(input).includes('database=')) return { ok: true, json: async () => ({ ok: true, tables: [{ name: 'customers', columns: 4, rows: 29 }] }) };
            return { ok: true, json: async () => ({ ok: true, databases: [{ id: 'sqlite:demo', name: 'Northwind Demo', demo: true, engine: 'sqlite' }] }) };
        } }, document: { querySelector: () => backstage, querySelectorAll: () => [] },
        currentRibbon: 'home', escapeHtml: value => String(value ?? ''), setTimeout, activateRibbonTab() {}
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/app_storage.js'), 'utf8'), ctx);
    ctx.fetch = ctx.window.fetch;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/app_file.js'), 'utf8'), ctx);
    return { ctx, values, requests, backstage, listeners, detailPanel, errorPanel };
}

test('browser keys persist and accompany only local API requests', async () => {
    const a = browser(), b = browser();
    const key = a.values.get('acaciadb.browser-user.v1');
    assert.notEqual(key, b.values.get('acaciadb.browser-user.v1'));
    a.values.set('acaciadb.mysql-connection.v1', JSON.stringify({ host: 'remote.example', port: 3306, username: 'demo', password: 'test' }));
    await a.ctx.fetch('api/database.php');
    const headers = a.requests[0].options.headers;
    assert.equal(headers.get('X-Acacia-User'), key);
    assert.equal(headers.get('X-Acacia-Database'), 'sqlite:demo');
    assert.equal(JSON.parse(atob(headers.get('X-Acacia-Connection'))).host, 'remote.example');
    await a.ctx.fetch('https://example.org/asset');
    assert.equal(a.requests[1].options.headers, undefined);
});

test('Home loads files without contacting MySQL and starts with only the demo', async () => {
    const { ctx, requests, backstage } = browser();
    await ctx.openFileBackstage();
    assert.equal(requests.length, 1);
    assert.match(requests[0].input, /source=files/);
    assert.equal(ctx.recentDatabases().length, 1);
    assert.equal(ctx.recentDatabases()[0].id, 'sqlite:demo');
    assert.match(backstage.innerHTML, /Recent databases/);
    assert.match(backstage.innerHTML, /Set up a local or remote server/);
});

test('recent list is limited to ten and reopening promotes an existing item', () => {
    const { ctx } = browser();
    for (let i = 0; i < 12; i++) ctx.rememberDatabase({ id: 'sqlite:' + i, name: 'File ' + i, engine: 'sqlite' });
    assert.equal(ctx.recentDatabases().length, 10);
    ctx.rememberDatabase({ id: 'sqlite:5', name: 'File 5', engine: 'sqlite' });
    assert.equal(ctx.recentDatabases()[0].id, 'sqlite:5');
    assert.equal(ctx.recentDatabases().length, 10);
});

test('New offers server databases only after connection setup', () => {
    const { ctx, values } = browser();
    assert.match(ctx.fileNewMarkup(), /value="mysql" disabled/);
    values.set('acaciadb.mysql-connection.v1', JSON.stringify({ host: 'server', username: 'demo', port: 3306 }));
    assert.doesNotMatch(ctx.fileNewMarkup(), /value="mysql" disabled/);
});

function prepareOpening(ctx) {
    Object.assign(ctx, {
        openTabs: [], currentView: '', databasePromise: null,
        getDatabase: async () => ({ database: 'sqlite:demo', displayName: 'Northwind Demo', tables: { customers: {} } }),
        configureObjectMaps() {}, renderObjectList() {}, updateQuickSaveState() {}, persistWorkspaceState() {},
        renderDocumentTabs() {}, setActiveObject() {}, updateContextualRibbon() {}, renderStatusViewButtons() {},
        content: {}, status: {}
    });
}
function clickTarget(attribute, dataset) {
    return { closest: selector => selector === attribute ? { dataset } : null };
}

test('clicking the demo opens its workspace and closes File, without a preview step', async () => {
    const { ctx, requests, backstage, listeners, values } = browser();
    prepareOpening(ctx);
    await ctx.openFileBackstage();
    await listeners.click({ target: clickTarget('[data-database-id]', { databaseId: 'sqlite:demo' }) });
    const opens = requests.filter(request => request.options?.method === 'POST');
    assert.equal(opens.length, 1);
    assert.deepEqual(JSON.parse(opens[0].options.body), { action: 'open', database: 'sqlite:demo', engine: 'sqlite' });
    assert.equal(backstage.hidden, true);
    assert.equal(ctx.status.textContent, 'Northwind Demo ready');
    assert.equal(values.get('acaciadb.active-database.v1'), 'sqlite:demo');
});

test('Details previews tables and exposes download/delete without opening', async () => {
    const { ctx, requests, backstage, listeners, detailPanel } = browser();
    await ctx.openFileBackstage();
    await listeners.click({ target: clickTarget('[data-database-details]', { databaseDetails: 'sqlite:demo' }) });
    assert.equal(backstage.hidden, false);
    assert.equal(requests.filter(request => request.options?.method === 'POST').length, 0);
    assert.match(detailPanel.innerHTML, /customers/);
    assert.match(detailPanel.innerHTML, /Download SQLite/);
});

test('cancelling unsaved changes prevents opening and permits a later retry', async () => {
    const { ctx, requests, backstage, listeners } = browser();
    prepareOpening(ctx);
    ctx.openTabs = [{ view: 'design-customers' }];
    ctx.closeActiveTab = async () => {};
    await ctx.openFileBackstage();
    const event = { target: clickTarget('[data-database-id]', { databaseId: 'sqlite:demo' }) };
    await listeners.click(event);
    assert.equal(requests.filter(request => request.options?.method === 'POST').length, 0);
    assert.equal(backstage.hidden, false);
    ctx.closeActiveTab = async () => ctx.openTabs.pop();
    await listeners.click(event);
    assert.equal(backstage.hidden, true);
});
