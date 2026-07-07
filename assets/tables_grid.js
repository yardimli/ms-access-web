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

function isHtmlTextColumn(type) {
    return type === 'HTML Text' || type === 'Rich Text';
}

function sanitizeHtmlText(value) {
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '');
    const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'P', 'DIV', 'SPAN', 'UL', 'OL', 'LI']);
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const nodes = [];
    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }
    nodes.forEach(node => {
        if (!allowedTags.has(node.tagName)) {
            node.replaceWith(document.createTextNode(node.textContent || ''));
            return;
        }
        [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
    });
    return template.innerHTML;
}

function formatColumnValue(column, value) {
    if (value === null || value === undefined || value === '') return '';
    if (column.lookup?.source) {
        const labelFor = raw => {
            const match = column.lookup.source.find(option => lookupOptionValue(option) === String(raw));
            return match ? lookupOptionLabel(match) : String(raw);
        };
        if (column.lookup.mode === 'multiple') {
            return String(value).split(',').map(item => item.trim()).filter(Boolean).map(labelFor).join(', ');
        }
        return labelFor(value);
    }
    const type = column.accessType || column.type;
    const format = column.accessFormat || defaultFieldFormats[type] || '';
    const decimalPlaces = Number.isFinite(Number(column.decimalPlaces)) ? Number(column.decimalPlaces) : 2;

    if (['Number', 'Large Number', 'Currency'].includes(type)) {
        const number = Number(String(value).replace(/[$,% ,]/g, ''));
        if (!Number.isFinite(number)) return value;
        if (format === 'Currency') return number.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
        if (format === 'Euro') return number.toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
        if (format === 'Percent') return number.toLocaleString(undefined, { style: 'percent', minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
        if (format === 'Fixed') return number.toFixed(decimalPlaces);
        if (format === 'Standard') return number.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
        if (format === 'Scientific') return number.toExponential(decimalPlaces);
        return number.toLocaleString();
    }

    if (type === 'Date/Time') {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        if (format === 'Long Date') return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (format === 'Medium Date') return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
        if (format === 'Short Date') return date.toLocaleDateString();
        if (format === 'Long Time') return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        if (format === 'Medium Time') return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        if (format === 'Short Time') return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        return date.toLocaleString();
    }

    if (type === 'Yes/No') {
        const checked = coerceYesNo(value);
        if (format === 'True/False') return checked ? 'True' : 'False';
        if (format === 'On/Off') return checked ? 'On' : 'Off';
        return checked ? 'Yes' : 'No';
    }

    return formatValue(value, type);
}

function tableCellMarkup(column, value, options = {}) {
    const classes = [];
    if (isNumericColumn(column.type)) classes.push('numeric-cell');
    if (isYesNoColumn(column.type)) classes.push('yes-no-cell');
    if (isHtmlTextColumn(column.type)) classes.push('html-text-cell');
    if (options.placeholder) classes.push('new-record-cell');

    const attrs = [
        `class="${classes.join(' ')}"`,
        `data-column="${escapeHtml(column.name)}"`,
        `data-type="${escapeHtml(column.type)}"`
    ];
    if (options.insert) attrs.push('data-insert-cell="true"');

    const displayValue = value === '(New)' ? '(New)' : formatColumnValue(column, value);
    let content = escapeHtml(displayValue);
    if (isYesNoColumn(column.type) && value !== '(New)') {
        content = `<input type="checkbox" ${coerceYesNo(value) ? 'checked' : ''} disabled aria-label="${escapeHtml(column.label || column.name)}">`;
    } else if (isHtmlTextColumn(column.type) && value !== '(New)') {
        content = sanitizeHtmlText(value);
    }

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
    'HTML Text',
    'Long Text',
    'Attachment',
    'Hyperlink',
    'Calculated Field',
    'Address',
    'Category',
    'Name',
    'Payment Type',
    'Phone',
    'Priority',
    'Start and End Dates',
    'Status',
    'Tag'
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

function showConfirmDialog({ title, message, confirmText = 'Delete', cancelText = 'Cancel' }) {
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
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="dialog-actions">
                    <button type="button" data-dialog-cancel>${escapeHtml(cancelText)}</button>
                    <button class="primary" type="submit">${escapeHtml(confirmText)}</button>
                </div>
            </form>
        `;
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-dialog-cancel]').forEach(button => {
            button.addEventListener('click', () => dialog.close('cancel'), { once: true });
        });
        dialog.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            dialog.close('confirm');
        });
        dialog.addEventListener('close', () => {
            const confirmed = dialog.returnValue === 'confirm';
            dialog.remove();
            resolve(confirmed);
        }, { once: true });
        dialog.showModal();
    });
}

function showChoiceDialog({ title, message, choices = [] }) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'access-dialog';
        dialog.innerHTML = `
            <form method="dialog">
                <div class="access-dialog-title">
                    <span>${escapeHtml(title)}</span>
                    <button type="button" data-dialog-choice="" aria-label="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="access-dialog-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="dialog-actions">
                    ${choices.map(choice => `
                        <button class="${choice.primary ? 'primary' : ''}" type="button" data-dialog-choice="${escapeHtml(choice.value)}">
                            ${escapeHtml(choice.label)}
                        </button>
                    `).join('')}
                </div>
            </form>
        `;
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-dialog-choice]').forEach(button => {
            button.addEventListener('click', () => dialog.close(button.dataset.dialogChoice || ''), { once: true });
        });
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            dialog.close('');
        });
        dialog.addEventListener('close', () => {
            const value = dialog.returnValue || '';
            dialog.remove();
            resolve(value);
        }, { once: true });
        dialog.showModal();
    });
}

function showColumnHistoryDialog({ tableName, columnName, history = [] }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'access-dialog column-history-dialog';
    const lines = history.length
        ? history.map(item => {
            const date = new Date(item.changedAt);
            const label = Number.isNaN(date.getTime()) ? item.changedAt : date.toLocaleString();
            return `[Version: ${escapeHtml(label)} ] ${escapeHtml(item.value)}`;
        }).join('\n')
        : 'No history has been recorded for this row and field.';

    dialog.innerHTML = `
        <form method="dialog">
            <div class="access-dialog-title">
                <span>History for ${escapeHtml(columnName)}</span>
                <button type="button" data-dialog-close aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="access-dialog-body">
                <div class="history-meta">
                    <p>History of changes for:</p>
                    <p><span>Column name:</span> ${escapeHtml(columnName)}</p>
                    <p><span>Table name:</span> ${escapeHtml(tableName)}</p>
                </div>
                <textarea class="history-list" readonly>${lines}</textarea>
            </div>
            <div class="dialog-actions">
                <button class="primary" type="submit">OK</button>
            </div>
        </form>
    `;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-dialog-close]').forEach(button => {
        button.addEventListener('click', () => dialog.close(), { once: true });
    });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal();
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

