// Schema dialogs operate on fresh engine metadata and apply one operation at a time.
async function openTableManagementDialog({ table, mode, column = '', onSaved }) {
    const initial = await postSchemaAction({ action: 'getTableManagement', table });
    let state = initial.management;
    const sqlite = state.options.engine === 'sqlite';
    const dialog = document.createElement('dialog');
    dialog.className = 'acaciadb-dialog schema-management-dialog';
    const titles = { indexes: 'Indexes', primary: 'Primary Key', foreign: 'Foreign Keys', auto: 'AUTO_INCREMENT', table: 'Table Properties' };
    const esc = escapeHtml;
    const options = (items, selected) => items.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('');
    const field = (label, control) => `<label class="dialog-field"><span>${label}</span>${control}</label>`;
    dialog.innerHTML = `<form><div class="acaciadb-dialog-title"><span>${titles[mode]}: ${esc(table)}</span><button type="button" data-close aria-label="Close">×</button></div>
        <div class="acaciadb-dialog-body"><div data-editor></div><p class="dialog-help schema-help">Changes are applied to the database when you click Apply.</p><p data-error role="alert"></p></div>
        <div class="dialog-actions"><button type="button" data-delete hidden>Delete</button><button type="button" data-close>Close</button><button type="submit" class="primary">Apply</button></div></form>`;
    document.body.appendChild(dialog);
    const editor = dialog.querySelector('[data-editor]');
    const error = dialog.querySelector('[data-error]');
    const deleteButton = dialog.querySelector('[data-delete]');
    const submit = dialog.querySelector('[type=submit]');
    let chosen = null;
    let busy = false;
    const read = name => editor.querySelector(`[name="${name}"]`)?.value || '';
    const names = () => state.columns.map(c => c.name);
    function partRow(part = {}) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><select data-part-name aria-label="Field">${options(names(), part.name)}</select></td>` + (mode === 'foreign'
            ? `<td><input data-part-reference aria-label="Referenced field" value="${esc(part.reference || '')}" required></td>`
            : `<td><input data-part-prefix aria-label="Prefix length" type="number" min="1" step="1" placeholder="Full column" value="${esc(part.prefix || '')}" ${sqlite || mode === 'primary' ? 'disabled' : ''}></td><td><select data-part-direction aria-label="Sort order">${options(['ASC', 'DESC'], part.direction || 'ASC')}</select></td>`)
            + '<td><button type="button" data-up aria-label="Move field up">↑</button><button type="button" data-remove aria-label="Remove field">×</button></td>';
        editor.querySelector('tbody').appendChild(tr);
    }
    function render(selectedName = '') {
        error.textContent = '';
        deleteButton.hidden = true;
        submit.disabled = false;
        if (mode === 'indexes' || mode === 'primary' || mode === 'foreign') {
            const items = mode === 'foreign' ? state.foreignKeys : state.indexes.filter(i => mode === 'primary' ? i.type === 'PRIMARY' : i.type !== 'PRIMARY');
            chosen = items.find(i => i.name === selectedName) || (mode === 'primary' ? items[0] : null);
            const types = sqlite ? ['INDEX', 'UNIQUE'] : ['INDEX', 'UNIQUE', 'FULLTEXT', 'SPATIAL'];
            editor.innerHTML = (mode === 'primary' ? '<p>Select the primary-key fields in key order. Composite keys currently make existing records read-only in the datasheet.</p>'
                : field(mode === 'foreign' ? 'Constraint' : 'Index', `<select name="existing"><option value="">New…</option>${options(items.map(i => i.name), chosen?.name || '')}</select>`))
                + (mode === 'primary' ? '' : field('Name', `<input name="name" required maxlength="64" value="${esc(chosen?.name || '')}">`))
                + (mode === 'indexes' ? field('Type', `<select name="type">${options(types, chosen?.type || 'INDEX')}</select>`) : '')
                + (mode === 'foreign' ? field('References table', `<select name="referenceTable">${options(state.tables, chosen?.table || state.tables[0])}</select>`)
                    + field('On update', `<select name="onUpdate">${options(['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'], chosen?.onUpdate || 'RESTRICT')}</select>`)
                    + field('On delete', `<select name="onDelete">${options(['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'], chosen?.onDelete || 'RESTRICT')}</select>`) : '')
                + `<table class="schema-parts"><thead><tr><th>Field</th>${mode === 'foreign' ? '<th>Referenced field</th>' : '<th>Prefix length</th><th>Order</th>'}<th></th></tr></thead><tbody></tbody></table><button type="button" data-add>Add field</button>`;
            (chosen?.columns || [{ name: column || names()[0] }]).forEach(partRow);
            deleteButton.hidden = !chosen;
            if (chosen?.readOnly || (mode === 'foreign' && sqlite) || (mode === 'primary' && sqlite && state.autoColumn)) {
                submit.disabled = true; deleteButton.disabled = true;
                error.textContent = mode === 'foreign' ? 'Foreign-key alteration requires a MySQL/MariaDB connection.' : 'This engine-managed constraint cannot be changed in this dialog.';
            } else deleteButton.disabled = false;
        } else if (mode === 'auto') {
            const enabled = state.autoColumn === column;
            editor.innerHTML = field('Field', `<input value="${esc(column)}" readonly>`)
                + field('AUTO_INCREMENT', `<select name="enabled" ${sqlite ? 'disabled' : ''}>${options(['No', 'Yes'], enabled ? 'Yes' : 'No')}</select>`)
                + field('Next value', `<input name="next" inputmode="numeric" pattern="[1-9][0-9]*" value="${esc(enabled ? state.nextAutoIncrement : '')}" placeholder="Automatic">`)
                + '<p>The field must be an indexed integer. Only one AUTO_INCREMENT field is allowed per table. The next value must exceed existing values.</p>';
            if (sqlite && !enabled) { submit.disabled = true; error.textContent = 'SQLite supports changing the next value of an existing AUTOINCREMENT field.'; }
        } else {
            editor.innerHTML = field('Table name', `<input name="name" required maxlength="64" value="${esc(state.name)}">`)
                + field('Storage engine', `<select name="storageEngine" ${sqlite ? 'disabled' : ''}>${options(sqlite ? ['SQLite'] : state.engines, state.storageEngine)}</select>`)
                + field('Table collation', `<select name="collation" ${sqlite ? 'disabled' : ''}>${options(sqlite ? ['Not supported'] : state.options.collations.map(c => c.name), state.collation)}</select>`)
                + field('SQL comment', `<textarea name="comment" ${sqlite ? 'disabled' : ''}>${esc(state.comment)}</textarea>`)
                + '<p>Table collation changes the default for new columns. Existing columns keep their collations. Renaming updates structured app references; SQL expressions may need manual updates.</p>';
        }
    }
    async function apply(remove = false) {
        if (busy) return;
        if (remove && !await showChoiceDialog({ title: 'Delete constraint', message: `Delete ${chosen?.name}?`, choices: [{ value: 'delete', label: 'Delete' }, { value: 'cancel', label: 'Cancel' }] }).then(value => value === 'delete')) return;
        const parts = Array.from(editor.querySelectorAll('tbody tr')).map(tr => ({ name: tr.querySelector('[data-part-name]').value,
            ...(mode === 'foreign' ? { reference: tr.querySelector('[data-part-reference]').value.trim() } : { prefix: tr.querySelector('[data-part-prefix]').value, direction: tr.querySelector('[data-part-direction]').value }) }));
        let request = { table };
        if (mode === 'indexes' || mode === 'primary') Object.assign(request, { action: remove ? 'deleteIndex' : 'saveIndex', originalName: chosen?.name || '', name: read('name'), type: mode === 'primary' ? 'PRIMARY' : read('type'), columns: parts });
        if (mode === 'foreign') Object.assign(request, { action: remove ? 'deleteForeignKey' : 'saveForeignKey', originalName: chosen?.name || '', name: read('name'), referenceTable: read('referenceTable'), onUpdate: read('onUpdate'), onDelete: read('onDelete'), columns: parts });
        if (mode === 'auto') Object.assign(request, { action: 'configureAutoIncrement', column, enabled: read('enabled') === 'Yes', next: read('next') });
        if (mode === 'table') Object.assign(request, { action: 'saveTableOptions', name: read('name'), storageEngine: read('storageEngine'), collation: read('collation'), comment: read('comment') });
        busy = true; submit.disabled = true; deleteButton.disabled = true;
        try {
            const response = await postSchemaAction(request);
            state = response.management;
            await onSaved(response);
            dialog.close();
        } catch (failure) { error.textContent = failure.message; }
        finally { busy = false; submit.disabled = false; deleteButton.disabled = false; }
    }
    dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); apply(); });
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('click', event => {
        if (busy) return;
        if (event.target.closest('[data-close]')) dialog.close();
        if (event.target.closest('[data-delete]')) apply(true);
        if (event.target.closest('[data-add]')) partRow();
        if (event.target.closest('[data-remove]')) event.target.closest('tr').remove();
        if (event.target.closest('[data-up]')) { const row = event.target.closest('tr'); if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); }
    });
    editor.addEventListener('change', event => { if (event.target.name === 'existing') render(event.target.value); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    render();
    showMovableModal(dialog);
}
