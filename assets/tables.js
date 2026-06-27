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

const mysqlDataTypes = [
    'TINYINT(1)',
    'INT',
    'BIGINT',
    'DECIMAL(12,2)',
    'VARCHAR(255)',
    'TEXT',
    'DATE',
    'TIME',
    'DATETIME',
    'TIMESTAMP'
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

function ribbonCheckboxButton(command, label, options = {}) {
    const classes = ['fields-mini', 'fields-checkbox-mini'];
    if (options.disabled) classes.push('disabled');
    if (options.checked) classes.push('checked');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(command)}" ${options.disabled ? 'disabled' : ''} aria-pressed="${options.checked ? 'true' : 'false'}">
            <input type="checkbox" tabindex="-1" data-validation-checkbox="${escapeHtml(command)}" ${options.checked ? 'checked' : ''} ${options.disabled ? 'disabled' : ''} aria-hidden="true">
            <span>${escapeHtml(label)}</span>
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
                    <div class="fields-mini fields-size-row disabled" data-field-size-row>
                        <span class="fields-mini-icon">${ribbonIcon('field-size')}</span>
                        <span>Field Size</span>
                        <input class="fields-small-input" data-field-size-input disabled>
                    </div>
                </div>
                ${ribbonBigButton('lookup', 'Modify Lookups', { disabled: true })}
                ${ribbonBigButton('expression', 'Modify Expression', { disabled: true })}
                ${ribbonBigButton('memo', 'Memo Settings', { disabled: true, caret: true })}
            </div>

            <div class="fields-group fields-formatting" data-label="Formatting">
                <div class="fields-format-controls">
                    <label><span>Data Type:</span><select data-field-data-type>${mysqlDataTypes.map(type => `<option>${escapeHtml(type)}</option>`).join('')}</select></label>
                    <label class="disabled"><span>Format:</span><select disabled><option>Formatting</option></select></label>
                    <div class="fields-format-icons">
                        <button type="button" disabled>${ribbonIcon('currency-symbol')}</button>
                        <button type="button" disabled>${ribbonIcon('percent')}</button>
                        <button type="button" disabled>${ribbonIcon('comma')}</button>
                        <button class="decimal-button" type="button" disabled>${decimalRibbonIcon('less')}</button>
                        <button class="decimal-button" type="button" disabled>${decimalRibbonIcon('more')}</button>
                    </div>
                </div>
            </div>

            <div class="fields-group fields-validation" data-label="Field Validation">
                <div class="fields-stack fields-check-stack">
                    ${ribbonCheckboxButton('required', 'Required', { disabled: true })}
                    ${ribbonCheckboxButton('unique', 'Unique', { disabled: true })}
                    ${ribbonCheckboxButton('indexed', 'Indexed', { disabled: true })}
                </div>
                ${ribbonBigButton('validation', 'Validation', { caret: true })}
            </div>
        </div>
    `;
    updateFieldsRibbonState();
}

function decimalRibbonIcon(direction) {
    const arrow = direction === 'less' ? 'fa-arrow-left' : 'fa-arrow-right';
    return `<span class="decimal-ribbon-icon"><i class="fas ${arrow}" aria-hidden="true"></i><span>.0</span><span>.00</span></span>`;
}

function supportsFieldSize(column) {
    return ['Short Text', 'Long Text', 'Number', 'Large Number', 'AutoNumber'].includes(column?.type);
}

function displayFieldSize(column) {
    if (!column) return '';
    if (column.fieldSize) return String(column.fieldSize);
    if (['AutoNumber', 'Number', 'Large Number'].includes(column.type)) return 'Long Integer';
    if (column.type === 'Short Text') return '255';
    return '';
}

function updateFieldsRibbonState(column = window.accessActiveTableColumn) {
    if (!ribbon?.querySelector?.('.fields-ribbon')) {
        return;
    }

    window.accessActiveTableColumn = column || window.accessActiveTableColumn || null;
    const activeColumn = window.accessActiveTableColumn;
    const sizeRow = ribbon.querySelector('[data-field-size-row]');
    const sizeInput = ribbon.querySelector('[data-field-size-input]');
    const typeSelect = ribbon.querySelector('[data-field-data-type]');

    if (typeSelect && activeColumn) {
        const mysqlType = String(activeColumn.mysqlType || '').toUpperCase();
        typeSelect.value = mysqlDataTypes.includes(mysqlType) ? mysqlType : 'VARCHAR(255)';
        typeSelect.disabled = Boolean(activeColumn.primaryKey);
    }

    if (sizeRow && sizeInput) {
        const editable = supportsFieldSize(activeColumn);
        sizeRow.classList.toggle('disabled', !editable);
        sizeInput.disabled = !editable;
        sizeInput.value = displayFieldSize(activeColumn);
    }

    [
        ['required', Boolean(activeColumn?.required)],
        ['unique', Boolean(activeColumn?.unique)],
        ['indexed', Boolean(activeColumn?.indexed)]
    ].forEach(([command, checked]) => {
        const button = ribbon.querySelector(`[data-command="${command}"]`);
        const checkbox = button?.querySelector('input[type="checkbox"]');
        const readonly = Boolean(activeColumn?.primaryKey);
        button?.classList.toggle('checked', checked);
        button?.classList.toggle('disabled', readonly);
        if (checkbox) {
            checkbox.checked = checked;
            checkbox.disabled = readonly;
        }
        if (readonly) {
            button?.setAttribute('disabled', 'disabled');
        } else {
            button?.removeAttribute('disabled');
        }
        button?.setAttribute('aria-pressed', String(checked));
    });
}

window.updateFieldsRibbonState = updateFieldsRibbonState;


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

function isNumericColumn(type) {
    return ['AutoNumber', 'Number', 'Large Number', 'Currency'].includes(type);
}

function isDateColumn(type) {
    return ['Date/Time', 'Date & Time'].includes(type);
}

function isYesNoColumn(type) {
    return type === 'Yes/No';
}

function coerceYesNo(value) {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';
}

function tableCellMarkup(column, value, options = {}) {
    const classes = [];
    if (isNumericColumn(column.type)) classes.push('numeric-cell');
    if (isYesNoColumn(column.type)) classes.push('yes-no-cell');
    if (options.placeholder) classes.push('new-record-cell');

    const attrs = [
        `class="${classes.join(' ')}"`,
        `data-column="${escapeHtml(column.name)}"`,
        `data-type="${escapeHtml(column.type)}"`
    ];
    if (options.insert) attrs.push('data-insert-cell="true"');

    const displayValue = value === '(New)' ? '(New)' : formatValue(value, column.type);
    const content = isYesNoColumn(column.type) && value !== '(New)'
        ? `<input type="checkbox" ${coerceYesNo(value) ? 'checked' : ''} disabled aria-label="${escapeHtml(column.label || column.name)}">`
        : escapeHtml(displayValue);

    return `<td ${attrs.join(' ')}>${content}</td>`;
}


function buildTableMarkup(tableDef, rows, options = {}) {
    const columns = options.columns
        ? options.columns.map(name => tableDef.structure.columns.find(column => column.name === name)).filter(Boolean)
        : tableDef.structure.columns;
    const emptyRows = Math.max(options.emptyRows ?? 8, 0);
    const sortState = options.sortState || {};
    const allowAddColumn = options.allowAddColumn === true;
    const showInsertRow = options.showInsertRow === true;
    const columnWidths = options.columnWidths || {};
    const rowHeight = Math.max(20, Number(options.rowHeight || 24));
    const insertDraft = options.insertDraft || {};

    const minWidth = columns.reduce((sum, column) => sum + (columnWidths[column.name] || column.width || 110), 40) + (allowAddColumn ? 120 : 0);

    const tableClass = `access-grid ${options.className || ''}`.trim();

    return `
        <table class="${escapeHtml(tableClass)}" style="min-width:${minWidth}px; --access-row-height:${rowHeight}px">
            <thead>
                <tr>
                    <th class="row-head"></th>
                    ${columns.map((column, index) => {
                        const direction = sortState.column === column.name ? sortState.direction : 'none';
                        const width = columnWidths[column.name] || column.width || 110;
                        return `
                            <th style="width:${width}px" class="${index === 0 ? 'selected-head' : ''}" draggable="true" data-header-column="${escapeHtml(column.name)}">
                                <span class="column-title">${escapeHtml(column.label || column.name)}</span>
                                <button class="column-sort ${direction !== 'none' ? 'active' : ''}" data-sort-column="${escapeHtml(column.name)}" data-direction="${escapeHtml(direction)}" title="Sort ${escapeHtml(column.label || column.name)}">
                                    <i class="fas ${direction === 'asc' ? 'fa-sort-up' : direction === 'desc' ? 'fa-sort-down' : 'fa-sort'}" aria-hidden="true"></i>
                                </button>
                                <span class="column-resizer" data-column-resizer="${escapeHtml(column.name)}" title="Resize column"></span>
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
                        <td class="row-head" data-row-menu-target="${rowIndex}">${rowIndex === 0 ? '*' : ''}<span class="row-height-resizer" data-row-height-resizer title="Resize rows"></span></td>
                        ${columns.map(column => tableCellMarkup(column, row[column.name])).join('')}
                        ${allowAddColumn ? '<td class="add-column-cell"></td>' : ''}
                    </tr>
                `).join('')}
                ${showInsertRow ? `
                    <tr class="insert-row" data-insert-row>
                        <td class="row-head" data-row-menu-target="insert">*<span class="row-height-resizer" data-row-height-resizer title="Resize rows"></span></td>
                        ${columns.map((column, index) => tableCellMarkup(column, insertDraft[column.name] ?? (index === 0 ? '(New)' : ''), { insert: true, placeholder: index === 0 && insertDraft[column.name] === undefined })).join('')}
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

function showColumnDialog({
    title,
    label,
    value,
    friendlyName = '',
    comment = '',
    confirmText,
    includeType = false,
    typeValue = 'Short Text',
    onSubmit
}) {
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
                    <label class="dialog-field">
                        <span>Friendly name</span>
                        <input name="friendlyName" value="${escapeHtml(friendlyName)}" autocomplete="off" placeholder="Optional display name">
                    </label>
                    ${includeType ? `
                        <label class="dialog-field">
                            <span>Data type</span>
                            <select name="fieldType">
                                ${addColumnTypes.map(type => `<option value="${escapeHtml(type)}" ${type === typeValue ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}
                            </select>
                        </label>
                    ` : ''}
                    <label class="dialog-field dialog-field-tall">
                        <span>Comment</span>
                        <textarea name="fieldComment" rows="3" placeholder="Optional SQL column comment">${escapeHtml(comment)}</textarea>
                    </label>
                    <p class="dialog-help">The field name is the real SQL column name. Friendly name is only used as the table header when set.</p>
                    <p class="dialog-error" data-dialog-error hidden></p>
                </div>
                <div class="dialog-actions">
                    <button value="cancel" type="button" data-dialog-cancel>Cancel</button>
                    <button class="primary" value="default" type="submit">${escapeHtml(confirmText)}</button>
                </div>
            </form>
        `;
        document.body.appendChild(dialog);
        const input = dialog.querySelector('input[name="fieldName"]');
        const friendlyInput = dialog.querySelector('input[name="friendlyName"]');
        const commentInput = dialog.querySelector('textarea[name="fieldComment"]');
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
                    type: typeSelect?.value || typeValue,
                    friendlyName: friendlyInput?.value.trim() || '',
                    comment: commentInput?.value.trim() || ''
                });
                settled = true;
                dialog.close();
                dialog.remove();
                resolve(result ?? {
                    name: nextName,
                    type: typeSelect?.value || typeValue,
                    friendlyName: friendlyInput?.value.trim() || '',
                    comment: commentInput?.value.trim() || ''
                });
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

let openMessageDialogPromise = null;

function showMessageDialog({ title, message, confirmText = 'OK' }) {
    if (openMessageDialogPromise) {
        return openMessageDialogPromise;
    }

    openMessageDialogPromise = new Promise(resolve => {
        const finish = () => {
            dialog.remove();
            openMessageDialogPromise = null;
            resolve();
        };

        const dialog = document.createElement('dialog');
        dialog.className = 'access-dialog';
        dialog.innerHTML = `
            <form method="dialog">
                <div class="access-dialog-title">
                    <span>${escapeHtml(title)}</span>
                    <button type="button" data-dialog-close aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="access-dialog-body">
                    <p class="dialog-error">${escapeHtml(message)}</p>
                </div>
                <div class="dialog-actions">
                    <button class="primary" type="button" data-dialog-close>${escapeHtml(confirmText)}</button>
                </div>
            </form>
        `;
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
            button.addEventListener('click', () => dialog.close(), { once: true });
        });
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            dialog.close();
        });
        dialog.addEventListener('close', finish, { once: true });
        dialog.showModal();
    });

    return openMessageDialogPromise;
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

function tablePrefsKey(tableName) {
    return `msAccessWeb.table.${tableName}.viewPrefs`;
}

function readTablePrefs(tableName) {
    try {
        return JSON.parse(localStorage.getItem(tablePrefsKey(tableName)) || '{}') || {};
    } catch {
        return {};
    }
}

function writeTablePrefs(tableName, prefs) {
    localStorage.setItem(tablePrefsKey(tableName), JSON.stringify(prefs));
}

function orderedTableColumns(tableDef, prefs) {
    const baseColumns = tableDef.structure.columns;
    const order = Array.isArray(prefs.columnOrder) ? prefs.columnOrder : [];
    const byName = new Map(baseColumns.map(column => [column.name, column]));
    const ordered = order.map(name => byName.get(name)).filter(Boolean);
    const missing = baseColumns.filter(column => !order.includes(column.name));
    return [...ordered, ...missing];
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
let rowMenu = null;

function rowClipboardKey(tableName) {
    return `msAccessWeb.table.${tableName}.rowClipboard`;
}

function closeRowMenu() {
    rowMenu?.remove();
    rowMenu = null;
}

document.addEventListener('click', event => {
    if (rowMenu && !event.target.closest('.row-popup-menu') && !event.target.closest('[data-row-menu-target]')) {
        closeRowMenu();
    }
});

function positionActiveCellEditor() {
    if (!activeCellEditor) {
        return;
    }

    const { editor, cell } = activeCellEditor;
    if (!cell.isConnected) {
        closeActiveCellEditor(false);
        return;
    }

    const rect = cell.getBoundingClientRect();
    editor.style.left = `${rect.left}px`;
    editor.style.top = `${rect.top}px`;
    editor.style.width = `${rect.width}px`;
    editor.style.height = `${rect.height}px`;
}

function normalizeCellValue(value, type) {
    const text = String(value ?? '').trim();
    if (text === '' || text === '(New)') return '';

    if (isYesNoColumn(type)) {
        return coerceYesNo(value) ? '1' : '0';
    }

    if (isNumericColumn(type)) {
        const cleaned = text.replace(/[$,]/g, '');
        const number = Number(cleaned);
        if (!Number.isFinite(number)) {
            throw new Error(`${type} fields must contain a valid number.`);
        }
        return type === 'Currency' ? number.toFixed(2) : String(Math.trunc(number));
    }

    if (isDateColumn(type)) {
        const date = new Date(text);
        if (Number.isNaN(date.getTime())) {
            throw new Error('Date/Time fields must contain a valid date.');
        }
        return text;
    }

    return text;
}

function dateInputValue(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toISOString().slice(0, 10);
}

function showValidationDialog(message) {
    return showMessageDialog({
        title: 'Validation Error',
        message,
        confirmText: 'Edit'
    });
}

function closeActiveCellEditor(commit = true) {
    if (!activeCellEditor) {
        return true;
    }

    const {
        input,
        editor,
        cell,
        row,
        rowIndex,
        column,
        columnDef,
        type,
        originalValue,
        insertRow,
        onInsertEdit,
        onCancelInsert,
        onRowEdit,
        onCancelRowEdit,
        onClose
    } = activeCellEditor;
    let nextValue = commit ? (input.type === 'checkbox' ? input.checked : input.value) : originalValue;

    if (commit) {
        try {
            nextValue = normalizeCellValue(nextValue, type);
        } catch (error) {
            showValidationDialog(error.message);
            input.focus();
            return false;
        }
    }

    if (insertRow) {
        if (commit) {
            onInsertEdit?.(column, nextValue);
        } else {
            onCancelInsert?.(column, originalValue);
        }
    } else {
        if (commit) {
            onRowEdit?.(rowIndex, column, nextValue);
            cell.outerHTML = tableCellMarkup(columnDef || { name: column, type }, nextValue);
        } else {
            onCancelRowEdit?.(rowIndex);
        }
    }

    cell.classList.remove('editing-cell');
    editor.remove();
    activeCellEditor = null;
    onClose?.();
    return true;
}

function shouldKeepCellEditorOpen(target) {
    return Boolean(target?.closest?.('.cell-edit-input, header, .create-menu, .more-fields-menu, [data-add-column], [data-add-column-button]'));
}

function enableEditableCells(container, rows, options = {}) {
    const columnDefs = options.columns || [];

    function openCellEditor(cell) {
        if (!cell) {
            return false;
        }

        const row = cell.closest('tr');
        const isInsertRow = row?.hasAttribute('data-insert-row');
        const rowIndex = Number(row?.dataset.rowIndex);
        if (!isInsertRow && (!Number.isInteger(rowIndex) || !rows[rowIndex])) {
            return false;
        }

        if (!closeActiveCellEditor(true)) {
            return false;
        }

        const column = cell.dataset.column;
        const columnDef = columnDefs.find(item => item.name === column) || { name: column, type: cell.dataset.type };
        const type = cell.dataset.type;
        const originalValue = isInsertRow
            ? (options.getInsertValue?.(column) ?? '')
            : rowIndex >= 0 && rows[rowIndex]
                ? rows[rowIndex][column]
                : isYesNoColumn(type)
                    ? (cell.querySelector('input[type="checkbox"]')?.checked ? '1' : '0')
                    : cell.textContent.trim();
        const editor = document.createElement('div');
        const input = document.createElement('input');

        editor.className = `cell-edit-control ${isDateColumn(type) ? 'date-editor' : ''}`;
        input.type = isYesNoColumn(type) ? 'checkbox' : isDateColumn(type) ? 'date' : 'text';
        input.className = 'cell-edit-input';
        if (isYesNoColumn(type)) {
            input.checked = isInsertRow ? false : coerceYesNo(originalValue);
        } else {
            const editValue = isInsertRow || originalValue === '(New)' ? '' : originalValue;
            input.value = isDateColumn(type) ? dateInputValue(editValue) : editValue;
        }
        editor.appendChild(input);

        cell.classList.add('editing-cell');
        document.body.appendChild(editor);
        activeCellEditor = {
            editor,
            input,
            cell,
            row: isInsertRow ? null : rows[rowIndex],
            rowIndex: isInsertRow ? null : rowIndex,
            column,
            columnDef,
            type,
            originalValue,
            insertRow: isInsertRow,
            onInsertEdit: options.onInsertEdit,
            onCancelInsert: options.onCancelInsert,
            onRowEdit: options.onRowEdit,
            onCancelRowEdit: options.onCancelRowEdit,
            onClose: options.onClose
        };
        positionActiveCellEditor();

        input.focus();
        input.select?.();

        input.addEventListener('keydown', async keyEvent => {
            if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
                closeActiveCellEditor(true);
            }

            if (keyEvent.key === 'Escape') {
                keyEvent.preventDefault();
                closeActiveCellEditor(false);
            }

            if (keyEvent.key === 'Tab') {
                keyEvent.preventDefault();
                if (closeActiveCellEditor(true)) {
                    await options.onNavigateFromEditor?.(keyEvent.key, keyEvent.shiftKey);
                }
            }
        });

        return true;
    }

    container.addEventListener('dblclick', event => {
        const cell = event.target.closest('td[data-column]');
        if (cell) {
            options.onSelectCell?.(cell);
            openCellEditor(cell);
        }
    });

    container.addEventListener('access-edit-cell', event => {
        openCellEditor(event.detail?.cell);
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
        let prefs = readTablePrefs(tableName);
        let displayColumns = orderedTableColumns(tableDef, prefs);
        let insertDraft = {};
        let activeColumnName = tableDef.structure.columns[0]?.name || '';
        let cursorRowIndex = rows.length ? 0 : 0;
        let cursorColumnName = activeColumnName;
        let insertValidationActive = false;
        const dirtyRows = new Map();

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
            displayColumns = orderedTableColumns(tableDef, prefs);
            if (!displayColumns.some(column => column.name === cursorColumnName)) {
                cursorColumnName = displayColumns[0]?.name || '';
            }
            cursorRowIndex = Math.max(0, Math.min(cursorRowIndex, rows.length));
            if (sortState.direction === 'none') {
                resetRowsToOriginalOrder(rows);
            } else {
                sortRowsByColumn(rows, sortState.column, sortState.direction);
            }
            host.innerHTML = buildTableMarkup(tableDef, rows, {
                allowAddColumn: true,
                columns: displayColumns.map(column => column.name),
                columnWidths: prefs.columnWidths || {},
                emptyRows: 0,
                insertDraft,
                rowHeight: prefs.rowHeight || 24,
                showInsertRow: true,
                sortState
            });
            host.tabIndex = 0;
        }

        function savePrefs(nextPrefs = prefs) {
            prefs = nextPrefs;
            writeTablePrefs(tableName, prefs);
        }

        function updateActiveRow() {
            host.querySelectorAll('tbody tr').forEach(row => row.classList.remove('active-row'));
            const row = cursorRowIndex >= rows.length
                ? host.querySelector('tbody tr[data-insert-row]')
                : host.querySelector(`tbody tr[data-row-index="${cursorRowIndex}"]`);
            row?.classList.add('active-row');
            if (position) {
                activeIndex = Math.max(0, Math.min(cursorRowIndex, Math.max(rows.length - 1, 0)));
                position.value = `${rows.length ? activeIndex + 1 : 0} of ${rows.length}`;
            }
        }

        function selectedCellElement() {
            const row = cursorRowIndex >= rows.length
                ? host.querySelector('tbody tr[data-insert-row]')
                : host.querySelector(`tbody tr[data-row-index="${cursorRowIndex}"]`);
            return row?.querySelector(`td[data-column="${CSS.escape(cursorColumnName)}"]`) || null;
        }

        function updateCellCursor() {
            host.querySelectorAll('.selected-cell').forEach(cell => cell.classList.remove('selected-cell'));
            const cell = selectedCellElement();
            cell?.classList.add('selected-cell');
            updateActiveRow();
            setActiveColumn(cursorColumnName);
        }

        function primaryKeyName() {
            return tableDef.structure.primaryKey;
        }

        function dirtyRowKey(rowIndex) {
            const key = primaryKeyName();
            const row = rows[rowIndex];
            return row && key ? String(row[key]) : String(rowIndex);
        }

        function snapshotRow(row) {
            return Object.fromEntries(tableDef.structure.columns.map(column => [column.name, row?.[column.name] ?? '']));
        }

        function assignRowOrderMetadata() {
            rows.forEach((nextRow, index) => {
                if (nextRow.__accessOrder === undefined) {
                    Object.defineProperty(nextRow, '__accessOrder', {
                        value: index,
                        enumerable: false,
                        configurable: true
                    });
                }
            });
        }

        function pasteableRowData(data = {}) {
            const primaryKey = primaryKeyName();
            return Object.fromEntries(tableDef.structure.columns
                .filter(column => !(column.name === primaryKey && column.type === 'AutoNumber'))
                .map(column => [column.name, data[column.name] ?? '']));
        }

        function markDirtyRow(rowIndex) {
            const row = rows[rowIndex];
            if (!row) {
                return null;
            }

            const key = dirtyRowKey(rowIndex);
            if (!dirtyRows.has(key)) {
                dirtyRows.set(key, {
                    original: snapshotRow(row),
                    primaryKeyValue: row[primaryKeyName()]
                });
            }

            return dirtyRows.get(key);
        }

        function isRowDirty(rowIndex) {
            return dirtyRows.has(dirtyRowKey(rowIndex));
        }

        function revertDirtyRow(rowIndex) {
            const key = dirtyRowKey(rowIndex);
            const dirty = dirtyRows.get(key);
            if (!dirty || !rows[rowIndex]) {
                return;
            }

            Object.assign(rows[rowIndex], dirty.original);
            dirtyRows.delete(key);
            renderTable();
            updateCellCursor();
            status.textContent = 'Row changes reverted';
        }

        async function deleteRow(rowIndex) {
            const row = rows[rowIndex];
            const primaryKey = primaryKeyName();
            if (!row || !primaryKey) {
                return;
            }

            try {
                status.textContent = 'Deleting record...';
                const response = await postRecordAction({
                    action: 'delete',
                    table: tableName,
                    primaryKeyValue: row[primaryKey]
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    assignRowOrderMetadata();
                } else {
                    rows.splice(rowIndex, 1);
                }

                dirtyRows.clear();
                cursorRowIndex = Math.max(0, Math.min(rowIndex, rows.length - 1));
                renderTable();
                updateCellCursor();
                status.textContent = 'Record deleted';
            } catch (error) {
                await showMessageDialog({
                    title: 'Delete Row Error',
                    message: error.message,
                    confirmText: 'OK'
                });
            }
        }

        function copiedRowData() {
            try {
                const payload = JSON.parse(localStorage.getItem(rowClipboardKey(tableName)) || 'null');
                return payload?.table === tableName && payload?.row ? payload.row : null;
            } catch {
                return null;
            }
        }

        function copyRow(rowIndex) {
            const row = rows[rowIndex];
            if (!row) {
                return;
            }

            localStorage.setItem(rowClipboardKey(tableName), JSON.stringify({
                table: tableName,
                copiedAt: new Date().toISOString(),
                row: snapshotRow(row)
            }));
            status.textContent = 'Row copied';
        }

        function pasteRow(rowTarget) {
            const data = copiedRowData();
            if (!data) {
                status.textContent = 'No copied row available';
                return;
            }

            const values = pasteableRowData(data);
            if (rowTarget === 'insert') {
                insertDraft = { ...insertDraft, ...values };
                cursorRowIndex = rows.length;
            } else {
                const rowIndex = Number(rowTarget);
                if (!rows[rowIndex]) {
                    return;
                }
                markDirtyRow(rowIndex);
                Object.assign(rows[rowIndex], values);
                cursorRowIndex = rowIndex;
            }

            cursorColumnName = Object.keys(values)[0] || cursorColumnName;
            renderTable();
            updateCellCursor();
            status.textContent = 'Row pasted';
        }

        function openRowMenu(target, anchor) {
            closeRowMenu();
            const hasCopiedRow = Boolean(copiedRowData());
            const isInsert = target === 'insert';
            rowMenu = document.createElement('div');
            rowMenu.className = 'row-popup-menu';
            rowMenu.innerHTML = `
                <button type="button" data-row-action="copy" ${isInsert ? 'disabled' : ''}><i class="fas fa-copy"></i><span>Copy Row</span></button>
                <button type="button" data-row-action="paste" ${hasCopiedRow ? '' : 'disabled'}><i class="fas fa-paste"></i><span>Paste Row</span></button>
                <button type="button" data-row-action="delete" ${isInsert ? 'disabled' : ''}><i class="fas fa-trash-alt"></i><span>Delete Row</span></button>
            `;
            document.body.appendChild(rowMenu);
            const rect = anchor.getBoundingClientRect();
            rowMenu.style.left = `${rect.right + 2}px`;
            rowMenu.style.top = `${rect.top}px`;
            rowMenu.dataset.rowTarget = String(target);
            rowMenu.addEventListener('click', async event => {
                const actionButton = event.target.closest('[data-row-action]');
                if (!actionButton || actionButton.disabled) {
                    return;
                }

                const rowTarget = rowMenu.dataset.rowTarget;
                const action = actionButton.dataset.rowAction;
                closeRowMenu();

                if (action === 'copy') {
                    copyRow(Number(rowTarget));
                }

                if (action === 'paste') {
                    pasteRow(rowTarget);
                }

                if (action === 'delete') {
                    await deleteRow(Number(rowTarget));
                }
            });
        }

        async function commitDirtyRow(rowIndex) {
            if (!isRowDirty(rowIndex)) {
                return true;
            }

            if (!closeActiveCellEditor(true)) {
                return false;
            }

            const row = rows[rowIndex];
            const dirtyKey = dirtyRowKey(rowIndex);
            const dirty = dirtyRows.get(dirtyKey);
            if (!row || !dirty) {
                return true;
            }

            try {
                const cleanRow = {};
                tableDef.structure.columns.forEach(column => {
                    cleanRow[column.name] = normalizeCellValue(row[column.name] ?? '', column.type);
                });

                status.textContent = 'Saving record...';
                const response = await postRecordAction({
                    action: 'update',
                    table: tableName,
                    primaryKeyValue: dirty.primaryKeyValue,
                    row: cleanRow
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    rows.forEach((nextRow, index) => {
                        if (nextRow.__accessOrder === undefined) {
                            Object.defineProperty(nextRow, '__accessOrder', {
                                value: index,
                                enumerable: false,
                                configurable: true
                            });
                        }
                    });
                }

                dirtyRows.delete(dirtyKey);
                renderTable();
                updateCellCursor();
                status.textContent = 'Record saved';
                return true;
            } catch (error) {
                await showMessageDialog({
                    title: 'Row Validation Error',
                    message: error.message,
                    confirmText: 'Edit Row'
                });
                renderTable();
                updateCellCursor();
                return false;
            }
        }

        async function commitBeforeLeavingSelection(targetRowIndex, targetColumnName = cursorColumnName) {
            if (targetRowIndex === cursorRowIndex && targetColumnName === cursorColumnName) {
                return closeActiveCellEditor(true);
            }

            if (!closeActiveCellEditor(true)) {
                return false;
            }

            if (cursorRowIndex >= rows.length) {
                if (targetRowIndex === cursorRowIndex) {
                    return true;
                }

                return Object.keys(insertDraft).length ? validateAndCommitInsertDraft() : true;
            }

            return commitDirtyRow(cursorRowIndex);
        }

        function setCellCursor(rowIndex, columnName) {
            cursorRowIndex = Math.max(0, Math.min(rowIndex, rows.length));
            cursorColumnName = columnName || cursorColumnName || displayColumns[0]?.name || '';
            updateCellCursor();
            host.focus({ preventScroll: true });
        }

        function moveCellCursor(rowDelta, columnDelta) {
            const names = displayColumns.map(column => column.name);
            const currentColumnIndex = Math.max(0, names.indexOf(cursorColumnName));
            const nextColumnIndex = Math.max(0, Math.min(names.length - 1, currentColumnIndex + columnDelta));
            setCellCursor(cursorRowIndex + rowDelta, names[nextColumnIndex] || cursorColumnName);
            selectedCellElement()?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        async function navigateFromEditor(key, shiftKey = false) {
            if (key !== 'Tab') {
                return;
            }

            const names = displayColumns.map(column => column.name);
            const currentColumnIndex = Math.max(0, names.indexOf(cursorColumnName));
            const nextColumnIndex = Math.max(0, Math.min(names.length - 1, currentColumnIndex + (shiftKey ? -1 : 1)));
            const targetColumn = names[nextColumnIndex] || cursorColumnName;
            if (await commitBeforeLeavingSelection(cursorRowIndex, targetColumn)) {
                moveCellCursor(0, shiftKey ? -1 : 1);
            }
        }

        function editSelectedCell() {
            const cell = selectedCellElement();
            if (!cell) {
                return;
            }
            host.dispatchEvent(new CustomEvent('access-edit-cell', { detail: { cell } }));
        }

        function columnByName(name) {
            return tableDef.structure.columns.find(column => column.name === name) || tableDef.structure.columns[0] || null;
        }

        function setActiveColumn(name) {
            activeColumnName = name || activeColumnName;
            updateFieldsRibbonState(columnByName(activeColumnName));
        }

        async function openColumnDialog(columnName = activeColumnName) {
            const oldName = columnName;
            const columnDef = columnByName(oldName) || {};
            if (!oldName) {
                return null;
            }

            const result = await showColumnDialog({
                title: 'Rename Field',
                label: 'Field name',
                value: oldName,
                friendlyName: columnDef.friendlyName || '',
                comment: columnDef.comment || '',
                confirmText: 'Rename',
                onSubmit: async ({ name, friendlyName, comment }) => {
                    status.textContent = 'Renaming field...';
                    await postSchemaAction({
                        action: 'renameColumn',
                        table: tableName,
                        oldName,
                        newName: name,
                        friendlyName,
                        comment
                    });
                    return { name, friendlyName, comment };
                }
            });

            if (!result) {
                return null;
            }

            status.textContent = result.name === oldName ? `Updated ${oldName}` : `Renamed ${oldName} to ${result.name}`;
            await loadView(currentView, { replaceActive: true });
            return result;
        }

        async function toggleColumnValidation(property) {
            const column = columnByName(activeColumnName);
            if (!column) {
                return;
            }

            if (column.primaryKey) {
                await showMessageDialog({
                    title: 'Field Validation',
                    message: 'Primary key fields are read only for Required, Unique, and Indexed settings.',
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(column);
                return;
            }

            if (!await commitBeforeLeavingSelection(cursorRowIndex, cursorColumnName)) {
                updateFieldsRibbonState(column);
                return;
            }

            const enabled = !Boolean(column[property]);

            try {
                status.textContent = 'Updating field validation...';
                const response = await postSchemaAction({
                    action: 'setColumnValidation',
                    table: tableName,
                    column: column.name,
                    property,
                    enabled
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    assignRowOrderMetadata();
                }

                renderTable();
                updateCellCursor();
                status.textContent = `${column.name} ${property} ${enabled ? 'enabled' : 'disabled'}`;
            } catch (error) {
                await showMessageDialog({
                    title: 'Field Validation Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(columnByName(activeColumnName));
            }
        }

        async function changeColumnType(mysqlType) {
            const column = columnByName(activeColumnName);
            const nextType = String(mysqlType || '').toUpperCase();
            if (!column || !mysqlDataTypes.includes(nextType)) {
                updateFieldsRibbonState(column);
                return;
            }

            if (column.primaryKey) {
                await showMessageDialog({
                    title: 'Data Type',
                    message: 'Primary key fields are read only for data type changes.',
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(column);
                return;
            }

            if (String(column.mysqlType || '').toUpperCase() === nextType) {
                return;
            }

            if (!await commitBeforeLeavingSelection(cursorRowIndex, cursorColumnName)) {
                updateFieldsRibbonState(column);
                return;
            }

            try {
                status.textContent = 'Updating data type...';
                const response = await postSchemaAction({
                    action: 'setColumnType',
                    table: tableName,
                    column: column.name,
                    type: nextType
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    assignRowOrderMetadata();
                }

                renderTable();
                updateCellCursor();
                status.textContent = `${column.name} data type changed to ${nextType}`;
            } catch (error) {
                await showMessageDialog({
                    title: 'Data Type Change Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(columnByName(activeColumnName));
            }
        }

        renderTable();
        updateCellCursor();
        window.accessActiveTableController = {
            tableName,
            openColumnDialog: () => openColumnDialog(activeColumnName),
            setActiveColumn,
            toggleColumnValidation,
            changeColumnType
        };
        enableEditableCells(host, rows, {
            columns: tableDef.structure.columns,
            getInsertValue(column) {
                return insertDraft[column] ?? '';
            },
            onSelectCell(cell) {
                const row = cell.closest('tr');
                const rowIndex = row?.hasAttribute('data-insert-row') ? rows.length : Number(row?.dataset.rowIndex);
                setCellCursor(rowIndex, cell.dataset.column);
            },
            onClose() {
                updateCellCursor();
                host.focus({ preventScroll: true });
            },
            onNavigateFromEditor: navigateFromEditor,
            onInsertEdit(column, value) {
                if (value === '') {
                    delete insertDraft[column];
                } else {
                    insertDraft[column] = value;
                }
                renderTable();
                updateCellCursor();
            },
            onRowEdit(rowIndex, column, value) {
                markDirtyRow(rowIndex);
                rows[rowIndex][column] = value;
                renderTable();
                updateCellCursor();
            },
            onCancelRowEdit(rowIndex) {
                revertDirtyRow(rowIndex);
            },
            onCancelInsert() {
                insertDraft = {};
                renderTable();
                updateCellCursor();
            }
        });
        updateCellCursor();
        host.focus({ preventScroll: true });

        async function validateAndCommitInsertDraft() {
            if (!Object.keys(insertDraft).length || insertValidationActive) {
                return true;
            }

            insertValidationActive = true;
            try {
                const newRow = {};
                tableDef.structure.columns.forEach(column => {
                    newRow[column.name] = normalizeCellValue(insertDraft[column.name] ?? '', column.type);
                });

                status.textContent = 'Inserting record...';
                const response = await postRecordAction({
                    action: 'insert',
                    table: tableName,
                    row: newRow
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    rows.forEach((row, index) => {
                        if (row.__accessOrder === undefined) {
                            Object.defineProperty(row, '__accessOrder', {
                                value: index,
                                enumerable: false,
                                configurable: true
                            });
                        }
                    });
                } else if (response.row) {
                    rows.push(response.row);
                }

                insertDraft = {};
                const primaryKey = tableDef.structure.primaryKey;
                const insertedKey = response.row?.[primaryKey];
                renderTable();
                const insertedIndex = primaryKey && insertedKey !== undefined
                    ? rows.findIndex(row => String(row[primaryKey]) === String(insertedKey))
                    : rows.length - 1;
                cursorRowIndex = insertedIndex >= 0 ? insertedIndex : rows.length - 1;
                updateCellCursor();
                status.textContent = 'Record inserted';
                return true;
            } catch (error) {
                await showMessageDialog({
                    title: 'Insert Validation Error',
                    message: error.message,
                    confirmText: 'Edit Row'
                });
                renderTable();
                updateCellCursor();
                return false;
            } finally {
                insertValidationActive = false;
            }
        }

        host.addEventListener('click', async event => {
            if (event.target.closest('dialog')) {
                return;
            }

            if (!event.target.closest('.row-popup-menu')) {
                closeRowMenu();
            }

            const addColumnTarget = event.target.closest('[data-add-column], [data-add-column-button]');
            const sortButton = event.target.closest('[data-sort-column]');
            const cell = event.target.closest('td[data-column]');
            const rowHead = event.target.closest('[data-row-menu-target]');
            const header = event.target.closest('th[data-header-column]');
            const row = event.target.closest('tr[data-row-index]');
            const clickedInsertRow = event.target.closest('[data-insert-row]');
            const targetRowIndex = cell
                ? (cell.closest('tr')?.hasAttribute('data-insert-row') ? rows.length : Number(cell.closest('tr')?.dataset.rowIndex))
                : rowHead
                    ? (rowHead.dataset.rowMenuTarget === 'insert' ? rows.length : Number(rowHead.dataset.rowMenuTarget))
                : row
                    ? Number(row.dataset.rowIndex)
                    : null;
            const targetColumnName = cell?.dataset.column || header?.dataset.headerColumn || null;

            if ((cell || row || rowHead || header || sortButton || addColumnTarget) && !event.target.closest('.cell-edit-control')) {
                const leaveTarget = targetRowIndex === null ? cursorRowIndex : targetRowIndex;
                const leaveColumn = targetColumnName || cursorColumnName;
                if (!await commitBeforeLeavingSelection(leaveTarget, leaveColumn)) {
                    event.preventDefault();
                    return;
                }
            }

            if (rowHead) {
                event.preventDefault();
                const target = rowHead.dataset.rowMenuTarget;
                if (target === 'insert') {
                    cursorRowIndex = rows.length;
                } else {
                    cursorRowIndex = Number(target);
                }
                updateCellCursor();
                openRowMenu(target, rowHead);
                return;
            }

            if (!clickedInsertRow && Object.keys(insertDraft).length) {
                const committed = await validateAndCommitInsertDraft();
                if (!committed) {
                    return;
                }
            }

            if (addColumnTarget) {
                event.preventDefault();
                const result = await showColumnDialog({
                    title: 'Add Field',
                    label: 'Field name',
                    value: generatedFieldName(tableDef.structure.columns),
                    confirmText: 'Add',
                    includeType: true,
                    onSubmit: async ({ name, type, friendlyName, comment }) => {
                        status.textContent = 'Adding field...';
                        await postSchemaAction({
                            action: 'addColumn',
                            table: tableName,
                            name,
                            type,
                            friendlyName,
                            comment
                        });
                        return { name, type, friendlyName, comment };
                    }
                });

                if (result) {
                    status.textContent = `Added ${result.name}`;
                    await loadView(currentView, { replaceActive: true });
                }
                return;
            }

            if (sortButton) {
                const column = sortButton.dataset.sortColumn;
                setActiveColumn(column);
                const current = sortState.column === column ? sortState.direction : 'none';
                sortState.column = column;
                sortState.direction = nextSortDirection(current);
                if (sortState.direction === 'none') {
                    sortState.column = null;
                }
                cursorRowIndex = 0;
                renderTable();
                updateCellCursor();
                return;
            }

            if (row) {
                cursorRowIndex = targetRowIndex;
            }

            if (cell) {
                setCellCursor(targetRowIndex, targetColumnName);
            } else if (header) {
                setActiveColumn(targetColumnName);
            } else if (row) {
                updateCellCursor();
            }
        });

        host.addEventListener('dblclick', async event => {
            const header = event.target.closest('th[data-header-column]');
            if (!header || event.target.closest('[data-sort-column]')) {
                return;
            }

            event.preventDefault();
            setActiveColumn(header.dataset.headerColumn);
            await openColumnDialog(header.dataset.headerColumn);
        });

        host.addEventListener('keydown', async event => {
            if (event.target.closest('input, textarea, select') || openMessageDialogPromise) {
                return;
            }

            const handledKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape'];
            if (!handledKeys.includes(event.key)) {
                return;
            }

            if (activeCellEditor) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    closeActiveCellEditor(true);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    closeActiveCellEditor(false);
                }
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                editSelectedCell();
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                if (cursorRowIndex >= rows.length) {
                    insertDraft = {};
                    renderTable();
                    updateCellCursor();
                    status.textContent = 'New row cleared';
                    return;
                }
                if (isRowDirty(cursorRowIndex)) {
                    revertDirtyRow(cursorRowIndex);
                    return;
                }
                updateCellCursor();
                return;
            }

            event.preventDefault();
            if (event.key === 'ArrowUp') {
                const targetRow = Math.max(0, cursorRowIndex - 1);
                if (await commitBeforeLeavingSelection(targetRow, cursorColumnName)) moveCellCursor(-1, 0);
            }
            if (event.key === 'ArrowDown') {
                const targetRow = Math.min(rows.length, cursorRowIndex + 1);
                if (await commitBeforeLeavingSelection(targetRow, cursorColumnName)) moveCellCursor(1, 0);
            }
            if (event.key === 'ArrowLeft') {
                const names = displayColumns.map(column => column.name);
                const currentColumnIndex = Math.max(0, names.indexOf(cursorColumnName));
                const targetColumn = names[Math.max(0, currentColumnIndex - 1)] || cursorColumnName;
                if (await commitBeforeLeavingSelection(cursorRowIndex, targetColumn)) moveCellCursor(0, -1);
            }
            if (event.key === 'ArrowRight') {
                const names = displayColumns.map(column => column.name);
                const currentColumnIndex = Math.max(0, names.indexOf(cursorColumnName));
                const targetColumn = names[Math.min(names.length - 1, currentColumnIndex + 1)] || cursorColumnName;
                if (await commitBeforeLeavingSelection(cursorRowIndex, targetColumn)) moveCellCursor(0, 1);
            }
            if (event.key === 'Tab') {
                const names = displayColumns.map(column => column.name);
                const currentColumnIndex = Math.max(0, names.indexOf(cursorColumnName));
                const targetColumn = names[Math.max(0, Math.min(names.length - 1, currentColumnIndex + (event.shiftKey ? -1 : 1)))] || cursorColumnName;
                if (await commitBeforeLeavingSelection(cursorRowIndex, targetColumn)) moveCellCursor(0, event.shiftKey ? -1 : 1);
            }
        });

        host.addEventListener('dragstart', event => {
            const header = event.target.closest('th[data-header-column]');
            if (!header || event.target.closest('.column-resizer, button')) {
                event.preventDefault();
                return;
            }

            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', header.dataset.headerColumn);
            header.classList.add('column-dragging');
        });

        host.addEventListener('dragend', event => {
            event.target.closest('th[data-header-column]')?.classList.remove('column-dragging');
            host.querySelectorAll('.column-drop-target').forEach(header => header.classList.remove('column-drop-target'));
        });

        host.addEventListener('dragover', event => {
            const header = event.target.closest('th[data-header-column]');
            if (!header) {
                return;
            }

            event.preventDefault();
            host.querySelectorAll('.column-drop-target').forEach(node => node.classList.remove('column-drop-target'));
            header.classList.add('column-drop-target');
        });

        host.addEventListener('drop', event => {
            const targetHeader = event.target.closest('th[data-header-column]');
            const sourceName = event.dataTransfer.getData('text/plain');
            const targetName = targetHeader?.dataset.headerColumn;
            if (!sourceName || !targetName || sourceName === targetName) {
                return;
            }

            const names = displayColumns.map(column => column.name);
            const sourceIndex = names.indexOf(sourceName);
            const targetIndex = names.indexOf(targetName);
            if (sourceIndex === -1 || targetIndex === -1) {
                return;
            }

            names.splice(sourceIndex, 1);
            names.splice(targetIndex, 0, sourceName);
            savePrefs({ ...prefs, columnOrder: names });
            renderTable();
            updateCellCursor();
        });

        host.addEventListener('pointerdown', event => {
            const columnHandle = event.target.closest('[data-column-resizer]');
            if (columnHandle) {
                event.preventDefault();
                const columnName = columnHandle.dataset.columnResizer;
                const header = columnHandle.closest('th');
                const startX = event.clientX;
                const startWidth = header.getBoundingClientRect().width;

                const onMove = moveEvent => {
                    const nextWidth = Math.max(48, Math.round(startWidth + moveEvent.clientX - startX));
                    savePrefs({
                        ...prefs,
                        columnWidths: {
                            ...(prefs.columnWidths || {}),
                            [columnName]: nextWidth
                        }
                    });
                    header.style.width = `${nextWidth}px`;
                    host.querySelectorAll(`[data-column="${CSS.escape(columnName)}"]`).forEach(cell => {
                        cell.style.width = `${nextWidth}px`;
                    });
                };

                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    renderTable();
                    updateCellCursor();
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
                return;
            }

            const rowHandle = event.target.closest('[data-row-height-resizer]');
            if (rowHandle) {
                event.preventDefault();
                const startY = event.clientY;
                const startHeight = Number(prefs.rowHeight || 24);

                const onMove = moveEvent => {
                    const nextHeight = Math.max(20, Math.min(72, Math.round(startHeight + moveEvent.clientY - startY)));
                    savePrefs({ ...prefs, rowHeight: nextHeight });
                    host.querySelector('.access-grid')?.style.setProperty('--access-row-height', `${nextHeight}px`);
                };

                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    renderTable();
                    updateCellCursor();
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }
        });

        view.addEventListener('click', async event => {
            if (event.target.closest('dialog') || openMessageDialogPromise) {
                return;
            }

            if (!event.target.closest('[data-table-host]') && Object.keys(insertDraft).length) {
                const committed = await validateAndCommitInsertDraft();
                if (!committed) {
                    return;
                }
            }

            const button = event.target.closest('[data-nav]');
            if (!button || !rows.length) {
                return;
            }

            const action = button.dataset.nav;
            let targetRow = cursorRowIndex;
            if (action === 'first') targetRow = 0;
            if (action === 'previous') targetRow = Math.max(0, cursorRowIndex - 1);
            if (action === 'next') targetRow = Math.min(rows.length - 1, cursorRowIndex + 1);
            if (action === 'last') targetRow = rows.length - 1;
            if (!await commitBeforeLeavingSelection(targetRow, cursorColumnName)) {
                event.preventDefault();
                return;
            }

            cursorRowIndex = targetRow;
            updateCellCursor();
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
                ['Caption', column.friendlyName || ''],
                ['Default Value', ''],
                ['Validation Rule', ''],
                ['Validation Text', ''],
                ['Required', isPrimary ? 'Yes' : 'No'],
                ['Allow Zero Length', column.type === 'Short Text' ? 'Yes' : ''],
                ['Indexed', isPrimary ? 'Yes (No Duplicates)' : 'No'],
                ['Unicode Compression', column.type === 'Short Text' ? 'Yes' : ''],
                ['IME Mode', column.type === 'Short Text' ? 'No Control' : ''],
                ['IME Sentence Mode', column.type === 'Short Text' ? 'None' : ''],
                ['Description', column.comment || ''],
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
                ['Caption', column.friendlyName || ''],
                ['Description', column.comment || ''],
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
                                        <td>${escapeHtml(column.comment || (column.name === tableDef.structure.primaryKey ? 'Primary key' : ''))}</td>
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
