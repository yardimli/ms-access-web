const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function browser() {
    const messages = [];
    const ctx = vm.createContext({ window: {}, document: { addEventListener() {} },
        showMessageDialog: options => messages.push(options.message),
        isYesNoColumn: () => false, isNumericColumn: () => false, isDateColumn: () => false,
        tableCellMarkup: () => '<td></td>' });
    for (const file of ['expression-functions.js', 'expression-builder.js', 'tables_editing.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets', file), 'utf8'), ctx);
    }
    return { ctx, messages, validate: ctx.window.ExpressionBuilder.validateFields };
}

const email = { name: 'e-mail_address', required: true, allowZeroLength: false, validationText: 'Enter a valid email address.',
    validationJavascript: String.raw`function(fields) { var value = fields["e-mail_address"]; return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }` };

test('double-clicking a field category inserts at the caret without replacing the clicked button', () => {
    const { ctx } = browser();
    function element() {
        return {
            value: '', handlers: {}, children: [],
            classList: { add() {}, remove() {}, toggle() {} },
            addEventListener(type, handler) { this.handlers[type] = handler; },
            querySelectorAll() { return this.children; },
            focus() {},
            setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
            dispatchEvent(event) { this.handlers[event.type]?.(event); }
        };
    }
    const nodes = new Map();
    const dialog = element();
    dialog.querySelector = selector => {
        if (!nodes.has(selector)) nodes.set(selector, element());
        return nodes.get(selector);
    };
    ctx.document.getElementById = () => ({ content: { firstElementChild: { cloneNode: () => dialog } } });
    ctx.document.body = { appendChild() {} };
    ctx.showMovableModal = () => {};
    ctx.window.clearTimeout = () => {};
    ctx.window.setTimeout = () => 1;
    ctx.Event = class { constructor(type) { this.type = type; } };
    ctx.window.ExpressionBuilder.open({ columns: [{ name: 'first' }, { name: 'e-mail_address' }], expression: 'prefix suffix' });
    const input = nodes.get('[data-expression-input]');
    const categories = nodes.get('[data-expression-categories]');
    const category = element();
    category.dataset = { expressionCategory: 'e-mail_address' };
    category.closest = selector => selector === '[data-expression-category]' ? category : null;
    categories.children = [category];
    let categoryRenders = 0;
    Object.defineProperty(categories, 'innerHTML', { set() { categoryRenders++; } });
    input.setSelectionRange(7, 7);
    dialog.handlers.click({ target: category, detail: 1 });
    assert.equal(input.value, 'prefix suffix');
    dialog.handlers.click({ target: category, detail: 2 });
    assert.equal(input.value, 'prefix [e-mail_address]suffix');
    assert.equal(input.selectionStart, 23);
    assert.equal(categoryRenders, 0);
    input.setSelectionRange(7, 23);
    dialog.handlers.click({ target: category, detail: 1 });
    dialog.handlers.click({ target: category, detail: 2 });
    assert.equal(input.value, 'prefix [e-mail_address]suffix');
});

test('email rule rejects invalid input and accepts flexible email formats', () => {
    const { validate } = browser();
    for (const value of ['abcd', '', 'a@b', 'a b@example.com']) {
        assert.throws(() => validate([email], { 'e-mail_address': value }), /Enter a valid email address/);
    }
    for (const value of ['a@example.com', 'john.smith+tag@example.co.uk']) {
        assert.doesNotThrow(() => validate([email], { 'e-mail_address': value }));
    }
});

test('optional and zero-length fields skip empty values but still validate non-empty values', () => {
    const { validate } = browser();
    for (const settings of [
        { required: false, allowZeroLength: false },
        { required: false, allowZeroLength: true },
        { required: true, allowZeroLength: true }
    ]) {
        const column = { ...email, ...settings };
        for (const value of ['', '   ', null, undefined]) {
            assert.doesNotThrow(() => validate([column], { [email.name]: value }));
        }
        assert.throws(() => validate([column], { [email.name]: 'abcd' }), /Enter a valid email/);
        assert.doesNotThrow(() => validate([column], { [email.name]: 'a@example.com' }));
        for (const value of [0, false]) {
            assert.throws(() => validate([column], { [email.name]: value }), /Enter a valid email/);
        }
    }
    assert.throws(() => validate([email], { [email.name]: '' }), /Enter a valid email/);
});

test('broken and non-boolean rules fail visibly, and rules see sibling fields', () => {
    const { validate } = browser();
    for (const source of ['function(', 'function(fields) { throw new Error("broken"); }', 'function(fields) { return "false"; }']) {
        assert.throws(() => validate([{ ...email, validationJavascript: source }], {}), /Cannot validate/);
    }
    const column = { name: 'confirm', validationJavascript: 'function(fields) { return fields.confirm === fields.email; }' };
    assert.doesNotThrow(() => validate([column], { email: 'a@b.com', confirm: 'a@b.com' }));
    assert.throws(() => validate([column], { email: 'a@b.com', confirm: 'other' }), /validation rule/);
    assert.doesNotThrow(() => validate([{ name: 'unrestricted' }], {}));
});

test('invalid cell stays editable without mutating the row; corrected input commits', () => {
    const { ctx, messages } = browser();
    let saved, removed = false;
    ctx.testEditor = { input: { type: 'text', value: 'abcd', focus() {} }, editor: { remove() { removed = true; } },
        cell: { classList: { remove() {} } }, row: { 'e-mail_address': 'old@example.com' },
        column: email.name, columnDef: email, type: 'Short Text', originalValue: 'old@example.com',
        onRowEdit(index, column, value) { saved = value; } };
    vm.runInContext('activeCellEditor = testEditor', ctx);
    assert.equal(ctx.closeActiveCellEditor(true), false);
    assert.equal(saved, undefined);
    assert.equal(removed, false);
    assert.deepEqual(messages, ['Enter a valid email address.']);
    ctx.testEditor.input.value = 'new@example.com';
    assert.equal(ctx.closeActiveCellEditor(true), true);
    assert.equal(saved, 'new@example.com');
    assert.equal(removed, true);
});

test('SQL decimal values keep all fractional digits during cell and row normalization', () => {
    const { ctx } = browser();
    for (const type of ['Number', 'Currency']) {
        assert.equal(ctx.normalizeCellValue('0.1234', type, { mysqlType: 'DECIMAL(4,4)' }), '0.1234');
        assert.equal(ctx.normalizeCellValue('-0.9876', type, { mysqlType: 'DECIMAL(4,4)' }), '-0.9876');
    }
});
