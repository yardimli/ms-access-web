const tableDataTypes = [
    'Short Text',
    'Long Text',
    'Number',
    'Large Number',
    'Date/Time',
    'Currency',
    'AutoNumber',
    'Yes/No',
    'OLE Object',
    'Hyperlink',
    'Attachment',
    'Calculated',
    'Lookup Wizard...'
];

function ribbonMiniButton(icon, label, options = {}) {
    const classes = ['fields-mini'];
    if (options.disabled) classes.push('disabled');
    if (options.checked) classes.push('checked');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="fields-mini-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down fields-caret"></i>' : ''}
        </button>
    `;
}

function ribbonBigButton(icon, label, options = {}) {
    const classes = ['fields-big'];
    if (options.disabled) classes.push('disabled');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="fields-big-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down fields-caret"></i>' : ''}
        </button>
    `;
}

function renderFieldsRibbon() {
    ribbon.innerHTML = `
        <div class="fields-ribbon">
            <div class="fields-group fields-views" data-label="Views">
                ${ribbonBigButton('design', 'View', { view: '@design', caret: true })}
            </div>

            <div class="fields-group fields-add-delete" data-label="Add & Delete">
                ${ribbonBigButton('text-field', 'Short Text')}
                ${ribbonBigButton('number', 'Number')}
                ${ribbonBigButton('currency', 'Currency')}
                <div class="fields-stack">
                    ${ribbonMiniButton('date', 'Date & Time')}
                    ${ribbonMiniButton('yes-no', 'Yes/No')}
                    ${ribbonMiniButton('more-fields', 'More Fields', { caret: true })}
                </div>
                ${ribbonBigButton('delete', 'Delete')}
            </div>

            <div class="fields-group fields-properties" data-label="Properties">
                <div class="fields-stack fields-wide-stack">
                    ${ribbonMiniButton('caption', 'Name & Caption')}
                    ${ribbonMiniButton('default', 'Default Value', { disabled: true })}
                    <div class="fields-mini fields-size-row disabled">
                        <span class="fields-mini-icon">${ribbonIcon('field-size')}</span>
                        <span>Field Size</span>
                        <span class="fields-small-input"></span>
                    </div>
                </div>
                ${ribbonBigButton('lookup', 'Modify Lookups', { disabled: true })}
                ${ribbonBigButton('expression', 'Modify Expression', { disabled: true })}
                ${ribbonBigButton('memo', 'Memo Settings', { disabled: true, caret: true })}
            </div>

            <div class="fields-group fields-formatting" data-label="Formatting">
                <div class="fields-format-controls">
                    <label><span>Data Type:</span><select><option>AutoNumber</option></select></label>
                    <label class="disabled"><span>Format:</span><select disabled><option>Formatting</option></select></label>
                    <div class="fields-format-icons">
                        <button type="button" disabled>${ribbonIcon('currency-symbol')}</button>
                        <button type="button" disabled>${ribbonIcon('percent')}</button>
                        <button type="button" disabled>${ribbonIcon('comma')}</button>
                        <button type="button" disabled>${ribbonIcon('decimal-less')}</button>
                        <button type="button" disabled>${ribbonIcon('decimal-more')}</button>
                    </div>
                </div>
            </div>

            <div class="fields-group fields-validation" data-label="Field Validation">
                <div class="fields-stack fields-check-stack">
                    ${ribbonMiniButton('required', 'Required', { disabled: true })}
                    ${ribbonMiniButton('unique', 'Unique', { checked: true })}
                    ${ribbonMiniButton('indexed', 'Indexed', { disabled: true })}
                </div>
                ${ribbonBigButton('validation', 'Validation', { caret: true })}
            </div>
        </div>
    `;
}


function designCommand(icon, label, options = {}) {
    return `
        <button class="design-command ${options.disabled ? 'disabled' : ''}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="design-command-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function designMini(icon, label, options = {}) {
    return `
        <button class="design-mini ${options.disabled ? 'disabled' : ''}" type="button" data-command="${escapeHtml(icon)}" ${options.disabled ? 'disabled' : ''}>
            <span>${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
        </button>
    `;
}

function renderTableDesignRibbon() {
    ribbon.innerHTML = `
        <div class="table-design-ribbon">
            <div class="design-ribbon-group" data-label="Views">
                ${designCommand('grid', 'View', { view: '@datasheet', caret: true })}
            </div>
            <div class="design-ribbon-group design-tools-group" data-label="Tools">
                ${designCommand('primary-key', 'Primary Key', { disabled: true })}
                ${designCommand('builder', 'Builder', { disabled: true })}
                ${designCommand('test-validation', 'Test Validation Rules', { disabled: true })}
                <div class="design-stack">
                    ${designMini('insert-row', 'Insert Rows', { disabled: true })}
                    ${designMini('delete', 'Delete Rows', { disabled: true })}
                    ${designMini('lookup', 'Modify Lookups', { disabled: true })}
                </div>
            </div>
            <div class="design-ribbon-group" data-label="Show/Hide">
                ${designCommand('properties', 'Property Sheet')}
                ${designCommand('index', 'Indexes')}
            </div>
            <div class="design-ribbon-group" data-label="Field, Record & Table Events">
                ${designCommand('macro', 'Create Data Macros', { disabled: true, caret: true })}
                ${designCommand('rename', 'Rename/Delete Macro')}
            </div>
            <div class="design-ribbon-group" data-label="Relationships">
                ${designCommand('relationships', 'Relationships')}
                ${designCommand('deps', 'Object Dependencies')}
            </div>
        </div>
    `;
}


function buildTableMarkup(tableDef, rows, options = {}) {
    const columns = options.columns
        ? tableDef.structure.columns.filter(column => options.columns.includes(column.name))
        : tableDef.structure.columns;
    const emptyRows = Math.max(options.emptyRows ?? 8, 0);
    const sortState = options.sortState || {};
    const allowAddColumn = options.allowAddColumn === true;
    const showInsertRow = options.showInsertRow === true;

    const minWidth = columns.reduce((sum, column) => sum + (column.width || 110), 40) + (allowAddColumn ? 120 : 0);

    const tableClass = `access-grid ${options.className || ''}`.trim();

    return `
        <table class="${escapeHtml(tableClass)}" style="min-width:${minWidth}px">
            <thead>
                <tr>
                    <th class="row-head"></th>
                    ${columns.map((column, index) => {
                        const direction = sortState.column === column.name ? sortState.direction : 'none';
                        return `
                            <th style="width:${column.width || 110}px" class="${index === 0 ? 'selected-head' : ''}" data-header-column="${escapeHtml(column.name)}">
                                <span class="column-title">${escapeHtml(column.label || column.name)}</span>
                                <button class="column-sort ${direction !== 'none' ? 'active' : ''}" data-sort-column="${escapeHtml(column.name)}" data-direction="${escapeHtml(direction)}" title="Sort ${escapeHtml(column.label || column.name)}">
                                    <i class="fas ${direction === 'asc' ? 'fa-sort-up' : direction === 'desc' ? 'fa-sort-down' : 'fa-sort'}" aria-hidden="true"></i>
                                </button>
                            </th>
                        `;
                    }).join('')}
                    ${allowAddColumn ? `
                        <th class="add-column-head" data-add-column>
                            <span>Click to Add</span>
                            <button class="column-sort add-column-button" type="button" data-add-column-button title="Add field">
                                <i class="fas fa-caret-down" aria-hidden="true"></i>
                            </button>
                        </th>
                    ` : ''}
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, rowIndex) => `
                    <tr class="${rowIndex === 0 ? 'active-row' : ''}" data-row-index="${rowIndex}">
                        <td class="row-head">${rowIndex === 0 ? '*' : ''}</td>
                        ${columns.map(column => `<td data-column="${escapeHtml(column.name)}" data-type="${escapeHtml(column.type)}">${escapeHtml(formatValue(row[column.name], column.type))}</td>`).join('')}
                        ${allowAddColumn ? '<td class="add-column-cell"></td>' : ''}
                    </tr>
                `).join('')}
                ${showInsertRow ? `
                    <tr class="insert-row" data-insert-row>
                        <td class="row-head">*</td>
                        ${columns.map((column, index) => `<td class="${index === 0 ? 'new-record-cell' : ''}" data-column="${escapeHtml(column.name)}" data-insert-cell="true">${index === 0 ? '(New)' : ''}</td>`).join('')}
                        ${allowAddColumn ? '<td class="add-column-cell"></td>' : ''}
                    </tr>
                ` : ''}
                ${Array.from({ length: emptyRows }, () => `<tr><td class="row-head"></td>${columns.map(() => '<td></td>').join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
}

function isValidSqlFieldName(name) {
    return /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(String(name || '').trim());
}

function generatedFieldName(columns) {
    const names = new Set(columns.map(column => column.name.toLowerCase()));
    let index = 1;
    while (names.has(`field${index}`.toLowerCase())) {
        index += 1;
    }

    return `Field${index}`;
}

const addColumnTypes = [
    'Short Text',
    'Number',
    'Large Number',
    'Currency',
    'Date & Time',
    'Yes/No',
    'Lookup & Relationship',
    'Rich Text',
    'Long Text',
    'Attachment',
    'Hyperlink',
    'Calculated Field'
];

function showColumnDialog({ title, label, value, confirmText, includeType = false, typeValue = 'Short Text', onSubmit }) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'access-dialog';
        dialog.innerHTML = `
            <form method="dialog">
                <div class="access-dialog-title">
                    <span>${escapeHtml(title)}</span>
                    <button type="button" data-dialog-cancel aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="access-dialog-body">
                    <label class="dialog-field">
                        <span>${escapeHtml(label)}</span>
                        <input name="fieldName" value="${escapeHtml(value)}" autocomplete="off">
                    </label>
                    ${includeType ? `
                        <label class="dialog-field">
                            <span>Data type</span>
                            <select name="fieldType">
                                ${addColumnTypes.map(type => `<option value="${escapeHtml(type)}" ${type === typeValue ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}
                            </select>
                        </label>
                    ` : ''}
                    <p class="dialog-help">Use a SQL-safe field name. Letters, numbers, and underscores are allowed.</p>
                    <p class="dialog-error" data-dialog-error hidden></p>
                </div>
                <div class="dialog-actions">
                    <button value="cancel" type="button" data-dialog-cancel>Cancel</button>
                    <button class="primary" value="default" type="submit">${escapeHtml(confirmText)}</button>
                </div>
            </form>
        `;
        document.body.appendChild(dialog);
        const input = dialog.querySelector('input');
        const typeSelect = dialog.querySelector('select[name="fieldType"]');
        const error = dialog.querySelector('[data-dialog-error]');
        const submitButton = dialog.querySelector('button[type="submit"]');
        let settled = false;

        dialog.querySelectorAll('[data-dialog-cancel]').forEach(button => {
            button.addEventListener('click', () => {
                if (settled) {
                    return;
                }
                settled = true;
                dialog.close();
                dialog.remove();
                resolve(null);
            });
        });

        dialog.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            const nextName = input.value.trim();
            if (!isValidSqlFieldName(nextName)) {
                error.textContent = 'Use letters, numbers, and underscores only. The first character must be a letter or underscore.';
                error.hidden = false;
                input.focus();
                return;
            }

            try {
                error.hidden = true;
                submitButton.disabled = true;
                submitButton.textContent = 'Working...';
                const result = await onSubmit?.({
                    name: nextName,
                    type: typeSelect?.value || typeValue
                });
                settled = true;
                dialog.close();
                dialog.remove();
                resolve(result ?? { name: nextName, type: typeSelect?.value || typeValue });
            } catch (submitError) {
                error.textContent = submitError.message || 'Unable to update the table.';
                error.hidden = false;
                submitButton.disabled = false;
                submitButton.textContent = confirmText;
                input.focus();
            }
        });

        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            if (settled) {
                return;
            }
            settled = true;
            dialog.close();
            dialog.remove();
            resolve(null);
        });

        dialog.showModal();
        input.focus();
        input.select();
    });
}

function nextSortDirection(current) {
    if (current === 'none') return 'asc';
    if (current === 'asc') return 'desc';
    return 'none';
}

function sortRowsByColumn(rows, column, direction) {
    if (direction === 'none') {
        return;
    }

    rows.sort((left, right) => {
        const leftValue = left[column];
        const rightValue = right[column];
        const leftNumber = Number(leftValue);
        const rightNumber = Number(rightValue);
        let result;

        if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
            result = leftNumber - rightNumber;
        } else {
            result = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        }

        return direction === 'asc' ? result : -result;
    });
}

function resetRowsToOriginalOrder(rows) {
    rows.sort((left, right) => (left.__accessOrder ?? 0) - (right.__accessOrder ?? 0));
}

function enableSubformSorting(host, tableDef, rows, columns) {
    const sortState = { column: null, direction: 'none' };

    rows.forEach((row, index) => {
        if (row.__accessOrder === undefined) {
            Object.defineProperty(row, '__accessOrder', {
                value: index,
                enumerable: false,
                configurable: true
            });
        }
    });

    host.addEventListener('click', event => {
        const sortButton = event.target.closest('[data-sort-column]');
        if (!sortButton) {
            return;
        }

        const column = sortButton.dataset.sortColumn;
        const current = sortState.column === column ? sortState.direction : 'none';
        sortState.column = column;
        sortState.direction = nextSortDirection(current);

        if (sortState.direction === 'none') {
            sortState.column = null;
            resetRowsToOriginalOrder(rows);
        } else {
            sortRowsByColumn(rows, sortState.column, sortState.direction);
        }

        host.innerHTML = buildTableMarkup(tableDef, rows, {
            columns,
            emptyRows: 12,
            sortState
        });
    });
}

let activeCellEditor = null;

function positionActiveCellEditor() {
    if (!activeCellEditor) {
        return;
    }

    const { input, cell } = activeCellEditor;
    if (!cell.isConnected) {
        closeActiveCellEditor(false);
        return;
    }

    const rect = cell.getBoundingClientRect();
    input.style.left = `${rect.left}px`;
    input.style.top = `${rect.top}px`;
    input.style.width = `${rect.width}px`;
    input.style.height = `${rect.height}px`;
}

function closeActiveCellEditor(commit = true) {
    if (!activeCellEditor) {
        return;
    }

    const { input, cell, row, column, originalValue, insertRow, rows, onInsert } = activeCellEditor;
    const nextValue = commit ? input.value : originalValue;

    if (insertRow) {
        if (commit && nextValue.trim() !== '') {
            const newRow = {};
            cell.closest('table')?.querySelectorAll('th[data-header-column]').forEach(header => {
                newRow[header.dataset.headerColumn] = '';
            });
            newRow[column] = nextValue;
            rows.push(newRow);
            onInsert?.(rows.length - 1);
        }
    } else {
        row[column] = nextValue;
        cell.textContent = nextValue;
    }

    cell.classList.remove('editing-cell');
    input.remove();
    activeCellEditor = null;
}

function shouldKeepCellEditorOpen(target) {
    return Boolean(target?.closest?.('.cell-edit-input, header, .create-menu, .more-fields-menu, [data-add-column], [data-add-column-button]'));
}

function enableEditableCells(container, rows, options = {}) {
    container.addEventListener('dblclick', event => {
        const cell = event.target.closest('td[data-column]');
        if (!cell) {
            return;
        }

        const row = cell.closest('tr');
        const isInsertRow = row?.hasAttribute('data-insert-row');
        const rowIndex = Number(row?.dataset.rowIndex);
        if (!isInsertRow && (!Number.isInteger(rowIndex) || !rows[rowIndex])) {
            return;
        }

        closeActiveCellEditor(true);

        const column = cell.dataset.column;
        const originalValue = cell.textContent.trim();
        const input = document.createElement('input');

        input.type = 'text';
        input.className = 'cell-edit-input';
        input.value = isInsertRow ? '' : originalValue;

        cell.classList.add('editing-cell');
        document.body.appendChild(input);
        activeCellEditor = {
            input,
            cell,
            row: isInsertRow ? null : rows[rowIndex],
            rows,
            column,
            originalValue: isInsertRow ? '' : originalValue,
            insertRow: isInsertRow,
            onInsert: options.onInsert
        };
        positionActiveCellEditor();

        input.focus();
        input.select();

        input.addEventListener('keydown', keyEvent => {
            if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
                closeActiveCellEditor(true);
            }

            if (keyEvent.key === 'Escape') {
                keyEvent.preventDefault();
                closeActiveCellEditor(false);
            }
        });
    });
}

function initTableViews(db) {
    content.querySelectorAll('[data-table-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const tableName = view.dataset.tableId;
        const tableDef = db.tables[tableName];
        const rows = tableDef?.data || [];
        const host = view.querySelector('[data-table-host]');
        const position = view.querySelector('[data-record-position]');
        let activeIndex = 0;
        const sortState = { column: null, direction: 'none' };

        rows.forEach((row, index) => {
            if (row.__accessOrder === undefined) {
                Object.defineProperty(row, '__accessOrder', {
                    value: index,
                    enumerable: false,
                    configurable: true
                });
            }
        });

        function renderTable() {
            if (sortState.direction === 'none') {
                resetRowsToOriginalOrder(rows);
            } else {
                sortRowsByColumn(rows, sortState.column, sortState.direction);
            }
            host.innerHTML = buildTableMarkup(tableDef, rows, {
                allowAddColumn: true,
                emptyRows: 0,
                showInsertRow: true,
                sortState
            });
        }

        function updateActiveRow() {
            host.querySelectorAll('tbody tr').forEach(row => row.classList.remove('active-row'));
            const row = host.querySelector(`tbody tr[data-row-index="${activeIndex}"]`);
            row?.classList.add('active-row');
            if (position) {
                position.value = `${rows.length ? activeIndex + 1 : 0} of ${rows.length}`;
            }
        }

        renderTable();
        enableEditableCells(host, rows, {
            onInsert(index) {
                activeIndex = index;
                renderTable();
                updateActiveRow();
            }
        });
        updateActiveRow();

        host.addEventListener('click', async event => {
            const addColumnTarget = event.target.closest('[data-add-column], [data-add-column-button]');
            if (addColumnTarget) {
                event.preventDefault();
                const result = await showColumnDialog({
                    title: 'Add Field',
                    label: 'Field name',
                    value: generatedFieldName(tableDef.structure.columns),
                    confirmText: 'Add',
                    includeType: true,
                    onSubmit: async ({ name, type }) => {
                        status.textContent = 'Adding field...';
                        await postSchemaAction({
                            action: 'addColumn',
                            table: tableName,
                            name,
                            type
                        });
                        return { name, type };
                    }
                });

                if (result) {
                    status.textContent = `Added ${result.name}`;
                    await loadView(currentView, { replaceActive: true });
                }
                return;
            }

            const sortButton = event.target.closest('[data-sort-column]');
            if (sortButton) {
                const column = sortButton.dataset.sortColumn;
                const current = sortState.column === column ? sortState.direction : 'none';
                sortState.column = column;
                sortState.direction = nextSortDirection(current);
                if (sortState.direction === 'none') {
                    sortState.column = null;
                }
                activeIndex = 0;
                renderTable();
                updateActiveRow();
                return;
            }

            const row = event.target.closest('tr[data-row-index]');
            if (row) {
                activeIndex = Number(row.dataset.rowIndex);
                updateActiveRow();
            }
        });

        host.addEventListener('dblclick', async event => {
            const header = event.target.closest('th[data-header-column]');
            if (!header || event.target.closest('[data-sort-column]')) {
                return;
            }

            event.preventDefault();
            const oldName = header.dataset.headerColumn;
            const result = await showColumnDialog({
                title: 'Rename Field',
                label: 'Field name',
                value: oldName,
                confirmText: 'Rename',
                onSubmit: async ({ name }) => {
                    if (name === oldName) {
                        return { name };
                    }

                    status.textContent = 'Renaming field...';
                    await postSchemaAction({
                        action: 'renameColumn',
                        table: tableName,
                        oldName,
                        newName: name
                    });
                    return { name };
                }
            });

            if (!result || result.name === oldName) {
                return;
            }

            status.textContent = `Renamed ${oldName} to ${result.name}`;
            await loadView(currentView, { replaceActive: true });
        });

        view.addEventListener('click', event => {
            const button = event.target.closest('[data-nav]');
            if (!button || !rows.length) {
                return;
            }

            const action = button.dataset.nav;
            if (action === 'first') activeIndex = 0;
            if (action === 'previous') activeIndex = Math.max(0, activeIndex - 1);
            if (action === 'next') activeIndex = Math.min(rows.length - 1, activeIndex + 1);
            if (action === 'last') activeIndex = rows.length - 1;
            updateActiveRow();
        });
    });
}

function initDesignViews(db) {
    content.querySelectorAll('[data-design-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const tableName = view.dataset.tableId;
        const tableDef = db.tables[tableName];
        const columns = tableDef.structure.columns;
        let selectedIndex = 0;

        function fieldSizeFor(column) {
            if (['AutoNumber', 'Large Number', 'Number'].includes(column.type)) return 'Long Integer';
            if (column.type === 'Currency') return 'Currency';
            if (column.type === 'Yes/No') return 'Yes/No';
            if (column.type === 'Date/Time') return 'General Date';
            return '255';
        }

        function fieldPropertiesFor(column) {
            const isPrimary = column.name === tableDef.structure.primaryKey;
            const rows = [['Field Size', fieldSizeFor(column)]];
            if (column.type === 'AutoNumber') rows.push(['New Values', 'Increment']);
            if (['Number', 'Currency', 'Date/Time'].includes(column.type)) rows.push(['Format', '']);
            if (column.type === 'Number') rows.push(['Decimal Places', 'Auto']);
            rows.push(
                ['Input Mask', ''],
                ['Caption', ''],
                ['Default Value', ''],
                ['Validation Rule', ''],
                ['Validation Text', ''],
                ['Required', isPrimary ? 'Yes' : 'No'],
                ['Allow Zero Length', column.type === 'Short Text' ? 'Yes' : ''],
                ['Indexed', isPrimary ? 'Yes (No Duplicates)' : 'No'],
                ['Unicode Compression', column.type === 'Short Text' ? 'Yes' : ''],
                ['IME Mode', column.type === 'Short Text' ? 'No Control' : ''],
                ['IME Sentence Mode', column.type === 'Short Text' ? 'None' : ''],
                ['Text Align', 'General']
            );
            return rows;
        }

        function renderFieldProperties() {
            const column = columns[selectedIndex] || columns[0];
            const host = view.querySelector('[data-field-property-grid]');
            if (!host || !column) return;
            host.innerHTML = fieldPropertiesFor(column).map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('');
        }

        function renderPropertySheet() {
            const column = columns[selectedIndex] || columns[0];
            const host = view.querySelector('[data-property-sheet-grid]');
            if (!host || !column) return;
            view.querySelector('[data-selection-type]').textContent = 'Selection type: Field Properties';
            host.innerHTML = [
                ['Name', column.name],
                ['Data Type', column.type],
                ['Primary Key', column.name === tableDef.structure.primaryKey ? 'Yes' : 'No'],
                ['Indexed', column.name === tableDef.structure.primaryKey ? 'Yes (No Duplicates)' : 'No'],
                ['Required', column.name === tableDef.structure.primaryKey ? 'Yes' : 'No'],
                ['Caption', ''],
                ['Validation Rule', ''],
                ['Text Align', 'General']
            ].map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('');
        }

        function selectDesignRow(index) {
            selectedIndex = Math.max(0, Math.min(columns.length - 1, index));
            view.querySelectorAll('[data-design-row]').forEach(row => {
                const selected = Number(row.dataset.designRow) === selectedIndex;
                row.classList.toggle('editing', selected);
                row.querySelector('.row-head').textContent = selected ? '*' : '';
            });
            renderFieldProperties();
            renderPropertySheet();
        }

        function openTypeDropdown(cell, index) {
            view.querySelector('.design-type-menu')?.remove();
            const menu = document.createElement('div');
            menu.className = 'design-type-menu';
            menu.innerHTML = tableDataTypes.map(type => `<button class="${type === columns[index].type ? 'selected' : ''}" type="button" data-type-value="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join('');
            cell.appendChild(menu);
        }

        view.innerHTML = `
            <div class="table-design-layout">
                <div class="table-design-main">
                    <div class="table-design-grid-wrap">
                        <table class="access-grid design-grid" style="min-width:920px">
                            <thead>
                                <tr>
                                    <th class="row-head"></th>
                                    <th style="width:260px" class="selected-head">Field Name</th>
                                    <th style="width:190px">Data Type</th>
                                    <th style="width:460px">Description (Optional)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${columns.map((column, index) => `
                                    <tr class="${index === 0 ? 'editing' : ''}" data-design-row="${index}">
                                        <td class="row-head">${index === 0 ? '*' : ''}</td>
                                        <td>${escapeHtml(column.name)}</td>
                                        <td class="design-type-cell" data-type-cell="${index}">
                                            <span>${escapeHtml(column.type)}</span>
                                            <button class="design-type-button" type="button"><i class="fas fa-caret-down"></i></button>
                                        </td>
                                        <td>${column.name === tableDef.structure.primaryKey ? 'Primary key' : ''}</td>
                                    </tr>
                                `).join('')}
                                ${Array.from({ length: 8 }, () => '<tr><td class="row-head"></td><td></td><td></td><td></td></tr>').join('')}
                            </tbody>
                        </table>
                    </div>
                    <section class="field-properties">
                        <div class="field-properties-title">Field Properties</div>
                        <div class="field-properties-body">
                            <div>
                                <div class="field-tabs"><button class="active">General</button><button>Lookup</button></div>
                                <div class="property-grid" data-field-property-grid></div>
                            </div>
                            <p>A field name can be up to 64 characters long, including spaces. Press F1 for help on field names.</p>
                        </div>
                    </section>
                </div>
                <aside class="property-sheet" data-property-sheet>
                    <button class="property-close" title="Close Property Sheet"><i class="fas fa-times"></i></button>
                    <h2>Property Sheet</h2>
                    <p data-selection-type>Selection type: Field Properties</p>
                    <div class="field-tabs"><button class="active">General</button></div>
                    <div class="property-grid" data-property-sheet-grid></div>
                </aside>
            </div>
        `;
        renderFieldProperties();
        renderPropertySheet();

        view.addEventListener('click', event => {
            const typeValue = event.target.closest('[data-type-value]');
            if (typeValue) {
                const cell = typeValue.closest('[data-type-cell]');
                const index = Number(cell.dataset.typeCell);
                columns[index].type = typeValue.dataset.typeValue;
                cell.querySelector('span').textContent = columns[index].type;
                typeValue.closest('.design-type-menu').remove();
                selectDesignRow(index);
                return;
            }

            const typeButton = event.target.closest('.design-type-button');
            if (typeButton) {
                const cell = typeButton.closest('[data-type-cell]');
                const index = Number(cell.dataset.typeCell);
                selectDesignRow(index);
                openTypeDropdown(cell, index);
                event.stopPropagation();
                return;
            }

            const row = event.target.closest('[data-design-row]');
            if (row) {
                selectDesignRow(Number(row.dataset.designRow));
                view.querySelector('.design-type-menu')?.remove();
                return;
            }

            const closeSheet = event.target.closest('.property-close');
            if (closeSheet) {
                view.querySelector('[data-property-sheet]')?.classList.add('hidden');
                return;
            }

            view.querySelector('.design-type-menu')?.remove();
        });
    });
}


