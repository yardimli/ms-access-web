let activeCellEditor = null;
let rowMenu = null;

function rowClipboardKey(tableName) {
    return `acaciadbWeb.table.${tableName}.rowClipboard`;
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
    const isMultipleLookup = activeCellEditor.lookupMode === 'multiple';
    const editorWidth = isMultipleLookup ? Math.max(rect.width, 160) : rect.width;
    editor.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - editorWidth - 8))}px`;
    editor.style.top = `${isMultipleLookup ? rect.bottom + 1 : rect.top}px`;
    editor.style.width = `${editorWidth}px`;
    editor.style.height = isMultipleLookup || activeCellEditor.htmlMode ? 'auto' : `${rect.height}px`;
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

function lookupOptionValue(option) {
    return typeof option === 'object' && option !== null ? String(option.key) : String(option);
}

function lookupOptionLabel(option) {
    return typeof option === 'object' && option !== null ? String(option.value) : String(option);
}

function editorValue(activeEditor) {
    if (activeEditor.htmlMode) {
        return sanitizeHtmlText(activeEditor.input.innerHTML);
    }
    if (activeEditor.lookupMode === 'multiple') {
        return Array.from(activeEditor.editor.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => input.value)
            .join(',');
    }
    return activeEditor.input.type === 'checkbox' ? activeEditor.input.checked : activeEditor.input.value;
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
    let nextValue = commit ? editorValue(activeCellEditor) : originalValue;

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
    return Boolean(target?.closest?.('.cell-edit-control, .cell-edit-input, .lookup-checkbox-editor, .html-editor-toolbar, header, .create-menu, .more-fields-menu, [data-add-column], [data-add-column-button]'));
}

function enableEditableCells(container, rows, options = {}) {
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
        const columnDefs = typeof options.columns === 'function' ? options.columns() : (options.columns || []);
        const columnDef = columnDefs.find(item => item.name === column) || { name: column, type: cell.dataset.type };
        if (columnDef.acaciadbType === 'Calculated Field' || columnDef.calculatedJavascript) {
            return false;
        }
        const type = cell.dataset.type;
        const originalValue = isInsertRow
            ? (options.getInsertValue?.(column) ?? '')
            : rowIndex >= 0 && rows[rowIndex]
                ? rows[rowIndex][column]
                : isYesNoColumn(type)
                    ? (cell.querySelector('input[type="checkbox"]')?.checked ? '1' : '0')
                    : cell.textContent.trim();
        const editor = document.createElement('div');
        let input = document.createElement('input');

        editor.className = `cell-edit-control ${isDateColumn(type) ? 'date-editor' : ''} ${isHtmlTextColumn(type) ? 'html-text-control' : ''}`;
        if (isHtmlTextColumn(type)) {
            input = document.createElement('div');
            input.className = 'cell-edit-input html-text-editor';
            input.contentEditable = 'true';
            input.innerHTML = sanitizeHtmlText(isInsertRow || originalValue === '(New)' ? '' : originalValue);
            const toolbar = document.createElement('div');
            toolbar.className = 'html-editor-toolbar';
            toolbar.innerHTML = `
                <button type="button" data-html-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
                <button type="button" data-html-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
                <button type="button" data-html-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
            `;
            toolbar.addEventListener('mousedown', toolbarEvent => toolbarEvent.preventDefault());
            toolbar.addEventListener('click', toolbarEvent => {
                const button = toolbarEvent.target.closest('[data-html-command]');
                if (!button) return;
                document.execCommand(button.dataset.htmlCommand, false, null);
                input.focus();
            });
            editor.appendChild(toolbar);
        } else if (columnDef.lookup?.mode === 'single') {
            input = document.createElement('select');
            input.className = 'cell-edit-input';
            const current = isInsertRow || originalValue === '(New)' ? '' : String(originalValue ?? '');
            input.innerHTML = `<option value=""></option>${(columnDef.lookup.source || []).map(option => {
                const value = lookupOptionValue(option);
                return `<option value="${escapeHtml(value)}" ${value === current ? 'selected' : ''}>${escapeHtml(lookupOptionLabel(option))}</option>`;
            }).join('')}`;
        } else if (columnDef.lookup?.mode === 'multiple') {
            input = document.createElement('input');
            input.type = 'hidden';
            input.className = 'cell-edit-input';
            const selected = new Set(String(isInsertRow || originalValue === '(New)' ? '' : originalValue ?? '').split(',').map(item => item.trim()).filter(Boolean));
            const box = document.createElement('div');
            box.className = 'lookup-checkbox-editor';
            box.innerHTML = (columnDef.lookup.source || []).map(option => {
                const value = lookupOptionValue(option);
                return `<label><input type="checkbox" value="${escapeHtml(value)}" ${selected.has(value) ? 'checked' : ''}> <span>${escapeHtml(lookupOptionLabel(option))}</span></label>`;
            }).join('');
            box.addEventListener('click', event => event.stopPropagation());
            editor.appendChild(box);
        } else if (isYesNoColumn(type)) {
            input.type = 'checkbox';
            input.className = 'cell-edit-input';
            input.checked = isInsertRow ? false : coerceYesNo(originalValue);
        } else {
            input.type = isDateColumn(type) ? 'date' : 'text';
            input.className = 'cell-edit-input';
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
            onClose: options.onClose,
            htmlMode: isHtmlTextColumn(type),
            lookupMode: columnDef.lookup?.mode || ''
        };
        positionActiveCellEditor();

        input.focus();
        input.select?.();

        input.addEventListener('keydown', async keyEvent => {
            if (keyEvent.key === 'Enter') {
                if (isHtmlTextColumn(type) && !keyEvent.ctrlKey && !keyEvent.metaKey) {
                    return;
                }
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

    container.addEventListener('acaciadb-edit-cell', event => {
        openCellEditor(event.detail?.cell);
    });
}
