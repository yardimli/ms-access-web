const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup() {
    const saved = new Map(), requests = [], notices = [];
    const node = () => ({ append() {}, appendChild() {}, replaceChildren() {}, focus() {}, addEventListener() {}, remove() {} });
    const controls = { '.database-chat-messages': node(), textarea: { ...node(), value: '' }, '[data-chat-status]': node(), '[data-chat-close]': node(), '[data-chat-reset]': node(), form: node() };
    const dialog = { ...node(), querySelector: selector => controls[selector], querySelectorAll: () => Object.values(controls) };
    const ctx = vm.createContext({ console, browserUserId: 'browser-a', activeDatabaseReference: 'sqlite:demo', currentDatabaseName: 'sqlite:demo',
        localStorage: { getItem: key => saved.get(key) ?? null, setItem: (key,value) => saved.set(key,value), removeItem: key => saved.delete(key) },
        document: { querySelector: selector => selector === '[data-database-chat]' ? node() : null, createElement: tag => tag === 'dialog' ? dialog : node(), body: node() },
        showMessageDialog: async value => notices.push(value), showMovableModal() {}, prepareDatabaseSwitch: async () => true, refreshDatabaseWorkspace: async () => {},
        databaseApi: async (url, options) => { requests.push(JSON.parse(options.body)); return { message: 'Done', applied: 1, actions: [{ type: 'sql', sql: 'CREATE TABLE Items (ID INTEGER)' }] }; }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/app_chat.js'),'utf8'),ctx);
    return { ctx, controls, saved, requests, notices };
}
test('MySQL chat is rejected before opening or sending any request', async () => {
    const { ctx, notices, requests } = setup();
    ctx.activeDatabaseReference = 'mysql:test';
    await ctx.openDatabaseChat();
    assert.match(notices[0].message,/only works with SQLite/);
    assert.equal(requests.length,0);
});
test('chat persists follow-up history per database and reset clears it', async () => {
    const { ctx, controls, requests } = setup();
    await ctx.openDatabaseChat();
    controls.textarea.value = 'Create Items';
    await controls.form.onsubmit({ preventDefault() {} });
    assert.equal(ctx.readDatabaseChat('sqlite:demo').length,2);
    assert.equal(ctx.readDatabaseChat('sqlite:other').length,0);
    controls.textarea.value = 'Add a name field';
    await controls.form.onsubmit({ preventDefault() {} });
    assert.equal(requests[1].messages.length,3);
    assert.equal(ctx.readDatabaseChat('sqlite:demo').length,4);
    controls['[data-chat-reset]'].onclick();
    assert.equal(ctx.readDatabaseChat('sqlite:demo').length,0);
});
test('cancelled unsaved edits prevent chat execution', async () => {
    const { ctx, controls, requests } = setup();
    ctx.prepareDatabaseSwitch = async () => false;
    await ctx.openDatabaseChat(); controls.textarea.value = 'Create Items';
    await controls.form.onsubmit({ preventDefault() {} });
    assert.equal(requests.length,0);
    assert.equal(ctx.readDatabaseChat('sqlite:demo').length,0);
});

test('a generated parent-only form renders records without requiring a subform', () => {
    const { ctx } = setup();
    const view = { dataset: { formId: 'Contacts' }, addEventListener() {}, querySelector: () => ({}) };
    Object.assign(ctx, { structuredClone, content: { querySelectorAll: () => [view] }, window: {},
        activeCellEditor: null, escapeHtml: value => String(value ?? ''), formatValue: value => String(value ?? ''),
        buildTableMarkup: () => '', enableEditableCells() {}, enableSubformSorting() {}, updateQuickSaveState() {} });
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/forms.js'),'utf8'),ctx);
    ctx.initFormViews({ forms: { Contacts: { title: 'Contacts', parentTable: 'Contacts', parentKey: 'ID', fields: ['Name'] } },
        tables: { Contacts: { structure: { primaryKey: 'ID', columns: [{ name: 'Name' }] }, data: [{ ID: 1, Name: 'Example' }] } } });
    assert.match(view.innerHTML,/Example/);
    assert.match(view.innerHTML,/form-navigation-only/);
    assert.equal(ctx.window.acaciadbActiveObjectController.isDirty(),false);
});
