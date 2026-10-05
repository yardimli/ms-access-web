async function initTableViews(db) {
    for (const view of content.querySelectorAll('[data-table-view]')) {
        if (view.dataset.ready === 'true') {
            continue;
        }

        view.dataset.ready = 'true';
        const tableName = view.dataset.tableId;
        const tableDef = db.tables[tableName];
        const rows = tableDef?.data || [];
        const host = view.querySelector('[data-table-host]');
        const position = view.querySelector('[data-record-position]');
        const pageSkipInput = view.querySelector('[data-page-skip]');
        const pageLimitInput = view.querySelector('[data-page-limit]');
        const pageTotal = view.querySelector('[data-page-total]');
        const pageControls = view.querySelector('[data-page-controls]');
        const pagePrevious = view.querySelector('[data-page-nav="previous"]');
        const pageNext = view.querySelector('[data-page-nav="next"]');
        let activeIndex = 0;
        let pagination = {
            skip: Number(tableDef?.pagination?.skip || 0),
            limit: Number(tableDef?.pagination?.limit || 500),
            total: Number(tableDef?.pagination?.total ?? rows.length),
            returned: Number(tableDef?.pagination?.returned ?? rows.length),
            hasPrevious: Boolean(tableDef?.pagination?.hasPrevious),
            hasNext: Boolean(tableDef?.pagination?.hasNext)
        };
        let pageLoading = false;
        const session = await tableLayoutSession(tableName);
        let prefs = session.prefs;
        const sortState = { column: null, direction: 'none', ...prefs.sortState };
        if (!tableDef.structure.columns.some(column => column.name === sortState.column)) {
            sortState.column = null;
            sortState.direction = 'none';
        }
        let displayColumns = orderedTableColumns(tableDef, prefs);
        let insertDraft = {};
        let activeColumnName = tableDef.structure.columns[0]?.name || '';
        let cursorRowIndex = rows.length ? 0 : 0;
        let cursorColumnName = activeColumnName;
        let insertValidationActive = false;
        const dirtyRows = new Map();

        rows.forEach((row, index) => {
            if (row.__acaciadbOrder === undefined) {
                Object.defineProperty(row, '__acaciadbOrder', {
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
            session.prefs = prefs;
        }

        function syncPagination(next = {}) {
            pagination = { ...pagination, ...next };
            tableDef.pagination = { ...pagination };
            if (pageControls) pageControls.classList.toggle('is-hidden', pagination.total < 500);
            if (pageSkipInput) pageSkipInput.value = String(pagination.skip);
            if (pageLimitInput) pageLimitInput.value = String(pagination.limit);
            if (pageTotal) pageTotal.textContent = `Total rows: ${pagination.total.toLocaleString()}`;
            if (pagePrevious) pagePrevious.disabled = pageLoading || !pagination.hasPrevious;
            if (pageNext) pageNext.disabled = pageLoading || !pagination.hasNext;
            if (pageSkipInput) pageSkipInput.disabled = pageLoading;
            if (pageLimitInput) pageLimitInput.disabled = pageLoading;
        }

        function updateActiveRow() {
            host.querySelectorAll('tbody tr').forEach(row => row.classList.remove('active-row'));
            const row = cursorRowIndex >= rows.length
                ? host.querySelector('tbody tr[data-insert-row]')
                : host.querySelector(`tbody tr[data-row-index="${cursorRowIndex}"]`);
            row?.classList.add('active-row');
            if (position) {
                activeIndex = Math.max(0, Math.min(cursorRowIndex, Math.max(rows.length - 1, 0)));
                const globalPosition = rows.length ? pagination.skip + activeIndex + 1 : 0;
                position.value = `${globalPosition} of ${pagination.total}`;
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
                if (nextRow.__acaciadbOrder === undefined) {
                    Object.defineProperty(nextRow, '__acaciadbOrder', {
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
                    displayColumns = orderedTableColumns(tableDef, prefs);
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
                recalculateRow(row);
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
                        if (nextRow.__acaciadbOrder === undefined) {
                            Object.defineProperty(nextRow, '__acaciadbOrder', {
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
            host.dispatchEvent(new CustomEvent('acaciadb-edit-cell', { detail: { cell } }));
        }

        function columnByName(name) {
            return tableDef.structure.columns.find(column => column.name === name) || tableDef.structure.columns[0] || null;
        }

        function hasProtectedFieldSettings(column) {
            return Boolean(
                column?.primaryKey ||
                column?.lookup ||
                column?.acaciadbType === 'Calculated Field' ||
                column?.calculatedJavascript
            );
        }

        function addableAcaciaDBType(type) {
            const normalized = type === 'Date & Time' ? 'Date/Time' : type;
            const numberFormats = new Set(['General', 'Fixed', 'Standard', 'Scientific']);
            const dateFormats = new Set(['Short Date', 'Medium Date', 'Long Date', 'Time am/pm', 'Medium Time', 'Time 24hour']);
            const yesNoFormats = new Set(['Check Box', 'True/False', 'On/Off']);

            if (numberFormats.has(normalized)) {
                return 'Number';
            }
            if (normalized === 'Euro') {
                return 'Currency';
            }
            if (dateFormats.has(normalized)) {
                return 'Date/Time';
            }
            if (yesNoFormats.has(normalized)) {
                return 'Yes/No';
            }

            return normalized;
        }

        function applyTablePayload(payload = {}) {
            if (payload.structure) {
                tableDef.structure = payload.structure;
                displayColumns = orderedTableColumns(tableDef, prefs);
            }
            if (Array.isArray(payload.data)) {
                rows.splice(0, rows.length, ...payload.data);
                assignRowOrderMetadata();
            }
            if (payload.pagination) {
                syncPagination(payload.pagination);
            }
        }

        async function loadTablePage(skip, limit) {
            if (pageLoading) {
                return false;
            }

            const requestedSkip = Math.max(0, Number.parseInt(skip, 10) || 0);
            const requestedLimit = Math.max(1, Math.min(2000, Number.parseInt(limit, 10) || 500));
            pageLoading = true;
            syncPagination();
            status.textContent = 'Loading records...';

            try {
                const viewId = `table-${objectSlug(tableName)}`;
                const response = await fetch(`api/view.php?view=${encodeURIComponent(viewId)}&skip=${requestedSkip}&limit=${requestedLimit}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    cache: 'no-store'
                });
                const data = await response.json();
                if (!response.ok || !data.ok) {
                    throw new Error(data.error || 'Unable to load table records.');
                }

                const nextTables = data.view?.data?.tables || {};
                const resolvedName = Object.keys(nextTables).find(name => name.toLowerCase() === tableName.toLowerCase());
                const nextTable = resolvedName ? nextTables[resolvedName] : null;
                if (!nextTable) {
                    throw new Error('The requested table page was not returned.');
                }

                applyTablePayload(nextTable);
                insertDraft = {};
                dirtyRows.clear();
                cursorRowIndex = 0;
                cursorColumnName = displayColumns[0]?.name || cursorColumnName;
                renderTable();
                updateCellCursor();
                host.scrollTop = 0;
                status.textContent = `Loaded ${rows.length.toLocaleString()} of ${pagination.total.toLocaleString()} records`;
                return true;
            } catch (error) {
                await showMessageDialog({
                    title: 'Load Records Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                return false;
            } finally {
                pageLoading = false;
                syncPagination();
            }
        }

        function rememberInsertedColumnPosition(newColumnName, afterColumnName) {
            if (!newColumnName || !afterColumnName) {
                return;
            }

            const currentOrder = orderedTableColumns(tableDef, prefs).map(column => column.name);
            const withoutNewColumn = currentOrder.filter(name => name !== newColumnName);
            const afterIndex = withoutNewColumn.indexOf(afterColumnName);
            if (afterIndex === -1) {
                return;
            }

            withoutNewColumn.splice(afterIndex + 1, 0, newColumnName);
            savePrefs({
                ...prefs,
                columnOrder: withoutNewColumn
            });
            displayColumns = orderedTableColumns(tableDef, prefs);
        }

        function calculatedColumns() {
            return tableDef.structure.columns.filter(column => column.calculatedJavascript);
        }

        function compileCalculatedFunction(source) {
            return Function('"use strict"; return (' + source + ');')();
        }

        function recalculateRow(row) {
            const fields = { ...row };
            calculatedColumns().forEach(column => {
                try {
                    const fn = compileCalculatedFunction(column.calculatedJavascript);
                    const value = fn(fields);
                    row[column.name] = value ?? '';
                    fields[column.name] = row[column.name];
                } catch (error) {
                    row[column.name] = '#Error';
                    fields[column.name] = '#Error';
                }
            });
        }

        function defaultValueForColumn(column) {
            if (!column?.defaultJavascript) {
                return '';
            }
            try {
                const fn = compileCalculatedFunction(column.defaultJavascript);
                return fn({}) ?? '';
            } catch {
                return '';
            }
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

        async function saveCalculatedField(columnName, expressionResult, options = {}) {
            if (!expressionResult) {
                return;
            }
            const response = await postSchemaAction({
                action: 'setCalculatedField',
                table: tableName,
                column: columnName,
                expression: expressionResult.expression,
                javascript: expressionResult.javascript,
                interpretNatural: Boolean(expressionResult.interpretNatural)
            });
            applyTablePayload(response.payload);
            if (options.updateExistingRows) {
                await updateCalculatedFieldForExistingRows(columnName);
            }
        }

        async function updateCalculatedFieldForExistingRows(columnName) {
            const primaryKey = primaryKeyName();
            if (!primaryKey) {
                await showMessageDialog({
                    title: 'Update Calculated Field',
                    message: 'This table does not have a primary key, so existing rows cannot be updated safely.',
                    confirmText: 'OK'
                });
                return;
            }

            const rowSnapshots = rows.map(row => ({ ...row }));
            let latestPayload = null;
            status.textContent = `Updating ${rowSnapshots.length} rows...`;

            for (let index = 0; index < rowSnapshots.length; index += 1) {
                const row = rowSnapshots[index];
                const primaryKeyValue = row[primaryKey];
                recalculateRow(row);

                const cleanRow = {};
                tableDef.structure.columns.forEach(column => {
                    cleanRow[column.name] = normalizeCellValue(row[column.name] ?? '', column.type);
                });

                status.textContent = `Updating ${columnName}: ${index + 1} of ${rowSnapshots.length}`;
                const response = await postRecordAction({
                    action: 'update',
                    table: tableName,
                    primaryKeyValue,
                    row: cleanRow
                });
                latestPayload = response.payload;
            }

            applyTablePayload(latestPayload);
            renderTable();
            updateCellCursor();
            status.textContent = `Updated ${rowSnapshots.length} rows for ${columnName}`;
        }

        async function calculatedUpdateScopeChoice() {
            return showChoiceDialog({
                title: 'Update Calculated Field',
                message: 'Do you want to update the whole table now, or only apply this calculation to new rows and future edits? Updating the whole table could take time depending on calculation complexity and the number of rows.',
                choices: [
                    { value: 'future', label: 'Only New Rows and Edits' },
                    { value: 'all', label: 'Update Whole Table', primary: true },
                    { value: '', label: 'Cancel' }
                ]
            });
        }

        async function saveDefaultValue(columnName, expressionResult) {
            if (!expressionResult) {
                return;
            }
            const response = await postSchemaAction({
                action: 'setDefaultValue',
                table: tableName,
                column: columnName,
                expression: expressionResult.expression,
                javascript: expressionResult.javascript,
                interpretNatural: Boolean(expressionResult.interpretNatural)
            });
            applyTablePayload(response.payload);
        }

        async function openDefaultValueBuilder() {
            const column = columnByName(activeColumnName);
            if (!column || column.acaciadbType === 'Calculated Field' || column.calculatedJavascript) {
                return;
            }

            const result = await window.ExpressionBuilder?.open?.({
                tableName,
                fieldName: column.name,
                purpose: 'default',
                expression: column.defaultExpression || '',
                javascript: column.defaultJavascript || '',
                interpretNatural: Boolean(column.defaultInterpretNatural),
                columns: []
            });
            await saveDefaultValue(column.name, result);
            renderTable();
            updateCellCursor();
            status.textContent = result ? `Default value saved for ${column.name}` : status.textContent;
        }

        async function openCalculatedExpressionBuilder() {
            const column = columnByName(activeColumnName);
            if (!column || (column.acaciadbType !== 'Calculated Field' && !column.calculatedJavascript)) {
                return;
            }

            const result = await window.ExpressionBuilder?.open?.({
                tableName,
                fieldName: column.name,
                purpose: 'calculated',
                expression: column.calculatedExpression || '',
                javascript: column.calculatedJavascript || '',
                interpretNatural: Boolean(column.calculatedInterpretNatural),
                blockedFieldNames: [column.name],
                columns: tableDef.structure.columns
                    .filter(field => field.name !== column.name)
                    .map(field => ({
                        name: field.name,
                        label: field.label || field.name,
                        type: field.type,
                        mysqlType: field.mysqlType
                    }))
            });
            if (!result) {
                return;
            }

            const updateScope = await calculatedUpdateScopeChoice();
            if (!updateScope) {
                return;
            }

            try {
                await saveCalculatedField(column.name, result, { updateExistingRows: updateScope === 'all' });
                renderTable();
                updateCellCursor();
                if (updateScope !== 'all') {
                    status.textContent = `Expression saved for ${column.name}`;
                }
            } catch (error) {
                await showMessageDialog({
                    title: 'Calculated Field Update Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                renderTable();
                updateCellCursor();
            }
        }

        async function addColumnFromType(type = '', options = {}) {
            const normalizedType = addableAcaciaDBType(type);
            const fixedType = Boolean(normalizedType);
            const afterColumn = columnByName(cursorColumnName)?.name || columnByName(activeColumnName)?.name || '';
            if (normalizedType === 'Lookup & Relationship') {
                return openLookupWizardForColumn(null, afterColumn);
            }
            const result = await showColumnDialog({
                title: 'Add Field',
                label: 'Field name',
                value: generatedFieldName(tableDef.structure.columns),
                confirmText: 'Add',
                includeType: true,
                typeValue: normalizedType || 'Short Text',
                onSubmit: async ({ name, type: dialogType, friendlyName, comment }) => {
                    const selectedType = fixedType ? normalizedType : dialogType;
                    if (selectedType === 'Lookup & Relationship') {
                        return { lookupRequested: true, name, type: selectedType, friendlyName, comment, afterColumn };
                    }
                    status.textContent = 'Adding field...';
                    const response = await postSchemaAction({
                        action: 'addColumn',
                        table: tableName,
                        name,
                        type: selectedType,
                        friendlyName,
                        comment,
                        afterColumn
                    });
                    return { name, type: selectedType, friendlyName, comment, afterColumn, response };
                }
            });

            if (!result) {
                return null;
            }

            if (result.lookupRequested) {
                return openLookupWizardForColumn(null, result.afterColumn, {
                    defaultName: result.name,
                    defaultFriendlyName: result.friendlyName
                });
            }

            applyTablePayload(result.response?.payload);
            rememberInsertedColumnPosition(result.name, result.afterColumn);
            activeColumnName = result.name;
            cursorColumnName = result.name;
            status.textContent = `Added ${result.name}`;

            if (result.type === 'Calculated Field') {
                renderTable();
                updateCellCursor();
                const expressionResult = await window.ExpressionBuilder?.open?.({
                    tableName,
                    fieldName: result.name,
                    expression: '',
                    javascript: '',
                    purpose: 'calculated',
                    interpretNatural: false,
                    blockedFieldNames: [result.name],
                    columns: tableDef.structure.columns
                        .filter(field => field.name !== result.name)
                        .map(field => ({
                            name: field.name,
                            label: field.label || field.name,
                            type: field.type,
                            mysqlType: field.mysqlType
                        }))
                });
                await saveCalculatedField(result.name, expressionResult);
            }

            renderTable();
            updateCellCursor();
            return result;
        }

        async function openLookupWizardForColumn(column = null, afterColumn = '', wizardOptions = {}) {
            if (!window.AcaciaDBLookupWizard?.open) {
                await showMessageDialog({
                    title: 'Lookup Wizard',
                    message: 'The Lookup Wizard could not be loaded.',
                    confirmText: 'OK'
                });
                return null;
            }

            const overviewDb = await getDatabase();
            mergeViewData(overviewDb, { tables: { [tableName]: tableDef } });
            const result = await window.AcaciaDBLookupWizard.open({
                db: overviewDb,
                tableName,
                tableColumns: tableDef.structure.columns,
                existingColumn: column,
                defaultName: wizardOptions.defaultName || column?.name || generatedFieldName(tableDef.structure.columns),
                defaultFriendlyName: wizardOptions.defaultFriendlyName || ''
            });

            if (!result) {
                return null;
            }

            try {
                status.textContent = column ? 'Updating lookup field...' : 'Creating lookup field...';
                const response = await postSchemaAction(column ? {
                    action: 'updateLookupField',
                    table: tableName,
                    column: column.name,
                    friendlyName: result.friendlyName,
                    lookup: result.lookup
                } : {
                    action: 'createLookupField',
                    table: tableName,
                    name: result.name,
                    friendlyName: result.friendlyName,
                    lookup: result.lookup,
                    afterColumn
                });

                applyTablePayload(response.payload);
                if (!column) {
                    rememberInsertedColumnPosition(result.name, afterColumn);
                    activeColumnName = result.name;
                    cursorColumnName = result.name;
                }
                renderTable();
                updateCellCursor();
                databasePromise = null;
                status.textContent = column ? `Lookup updated for ${column.name}` : `Added lookup field ${result.name}`;
                return result;
            } catch (error) {
                await showMessageDialog({
                    title: 'Lookup Wizard Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                renderTable();
                updateCellCursor();
                return null;
            }
        }

        async function modifyActiveLookup() {
            const column = columnByName(activeColumnName);
            if (!column?.lookup) {
                return;
            }

            await openLookupWizardForColumn(column);
        }

        async function deleteActiveColumn() {
            const column = columnByName(activeColumnName);
            if (!column) {
                return;
            }
            if (column.primaryKey) {
                await showMessageDialog({
                    title: 'Delete Field',
                    message: 'Primary key fields cannot be deleted.',
                    confirmText: 'OK'
                });
                return;
            }

            const confirmed = await showConfirmDialog({
                title: 'Delete Field',
                message: `Delete the field "${column.name}" from ${tableName}? This cannot be undone.`,
                confirmText: 'Delete'
            });
            if (!confirmed) {
                return;
            }

            const response = await postSchemaAction({
                action: 'deleteColumn',
                table: tableName,
                column: column.name
            });
            applyTablePayload(response.payload);
            activeColumnName = tableDef.structure.columns[0]?.name || '';
            cursorColumnName = activeColumnName;
            renderTable();
            updateCellCursor();
            status.textContent = `Deleted ${column.name}`;
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

        async function setValidationRule(rule, javascript = '', interpretNatural = false) {
            const column = columnByName(activeColumnName);
            if (!column) {
                return;
            }

            try {
                status.textContent = 'Saving validation rule...';
                const response = await postSchemaAction({
                    action: 'setValidationRule',
                    table: tableName,
                    column: column.name,
                    rule,
                    javascript,
                    interpretNatural
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
                status.textContent = `Validation rule saved for ${column.name}`;
            } catch (error) {
                await showMessageDialog({
                    title: 'Field Validation Rule Error',
                    message: error.message,
                    confirmText: 'OK'
                });
            }
        }

        async function changeColumnType(acaciadbType) {
            const column = columnByName(activeColumnName);
            const nextType = String(acaciadbType || '');
            if (!column || !tableDataTypes.includes(nextType)) {
                updateFieldsRibbonState(column);
                return;
            }

            if (hasProtectedFieldSettings(column)) {
                await showMessageDialog({
                    title: 'Data Type',
                    message: 'This field type is read only for data type changes.',
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(column);
                return;
            }

            if ((column.acaciadbType || column.type) === nextType) {
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
                    acaciadbType: nextType
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

        async function changeColumnFormat(options = {}) {
            const column = columnByName(activeColumnName);
            if (!column) {
                return;
            }
            if (hasProtectedFieldSettings(column)) {
                updateFieldsRibbonState(column);
                return;
            }

            const acaciadbType = column.acaciadbType || column.type;
            let nextFormat = options.format || column.acaciadbFormat || defaultFieldFormats[acaciadbType] || '';
            let nextDecimalPlaces = Number.isFinite(Number(column.decimalPlaces)) ? Number(column.decimalPlaces) : 2;

            if (options.command === 'currency') nextFormat = 'Currency';
            if (options.command === 'percent') nextFormat = 'Percent';
            if (options.command === 'standard') nextFormat = 'Standard';
            if (options.command === 'decimal-less') nextDecimalPlaces = Math.max(0, nextDecimalPlaces - 1);
            if (options.command === 'decimal-more') nextDecimalPlaces = Math.min(6, nextDecimalPlaces + 1);

            try {
                status.textContent = 'Updating field format...';
                const response = await postSchemaAction({
                    action: 'setColumnFormat',
                    table: tableName,
                    column: column.name,
                    format: nextFormat,
                    decimalPlaces: nextDecimalPlaces
                });

                if (response.payload?.structure) {
                    tableDef.structure = response.payload.structure;
                    displayColumns = orderedTableColumns(tableDef, prefs);
                }

                if (Array.isArray(response.payload?.data)) {
                    rows.splice(0, rows.length, ...response.payload.data);
                    assignRowOrderMetadata();
                }

                renderTable();
                updateCellCursor();
                status.textContent = `${column.name} format updated`;
            } catch (error) {
                await showMessageDialog({
                    title: 'Field Format Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(columnByName(activeColumnName));
            }
        }

        function activeRowForHistory() {
            if (cursorRowIndex >= rows.length) {
                return null;
            }
            return rows[cursorRowIndex] || null;
        }

        async function toggleMemoSetting(setting) {
            const column = columnByName(activeColumnName);
            if (!column || !['Long Text', 'HTML Text', 'Rich Text'].includes(column.acaciadbType || column.type)) {
                return;
            }

            const enabled = setting === 'appendOnly'
                ? !Boolean(column.appendOnly)
                : !['HTML Text', 'Rich Text'].includes(column.acaciadbType || column.type);

            try {
                status.textContent = 'Updating Memo Settings...';
                const response = await postSchemaAction({
                    action: 'setMemoSetting',
                    table: tableName,
                    column: column.name,
                    setting,
                    enabled
                });
                applyTablePayload(response.payload);
                renderTable();
                updateCellCursor();
                status.textContent = 'Memo Settings updated';
            } catch (error) {
                await showMessageDialog({
                    title: 'Memo Settings Error',
                    message: error.message,
                    confirmText: 'OK'
                });
                updateFieldsRibbonState(columnByName(activeColumnName));
            }
        }

        async function showColumnHistory() {
            const column = columnByName(activeColumnName);
            const row = activeRowForHistory();
            const primaryKey = primaryKeyName();
            if (!column || !row || !primaryKey) {
                await showMessageDialog({
                    title: 'Column History',
                    message: 'Select an existing row to view column history.',
                    confirmText: 'OK'
                });
                return;
            }

            try {
                const response = await postRecordAction({
                    action: 'history',
                    table: tableName,
                    column: column.name,
                    primaryKeyValue: row[primaryKey]
                });
                showColumnHistoryDialog({
                    tableName,
                    columnName: column.name,
                    history: response.history || []
                });
            } catch (error) {
                await showMessageDialog({
                    title: 'Column History Error',
                    message: error.message,
                    confirmText: 'OK'
                });
            }
        }

        syncPagination(tableDef.pagination || pagination);
        renderTable();
        updateCellCursor();
        window.acaciadbActiveTableController = {
            tableName,
            openColumnDialog: () => openColumnDialog(activeColumnName),
            addColumnFromType,
            deleteActiveColumn,
            openDefaultValueBuilder,
            openCalculatedExpressionBuilder,
            modifyActiveLookup,
            toggleMemoSetting,
            showColumnHistory,
            setActiveColumn,
            toggleColumnValidation,
            changeColumnType,
            changeColumnFormat,
            setValidationRule,
            getPageState: () => ({ skip: pagination.skip, limit: pagination.limit }),
            syncPagination,
            getExpressionContext: () => {
                const column = columnByName(activeColumnName) || tableDef.structure.columns[0] || {};
                return {
                    tableName,
                    fieldName: column.name || activeColumnName || '',
                    purpose: 'validation',
                    expression: column.validationRule || (column.name ? `[${column.name}]` : ''),
                    javascript: column.validationJavascript || '',
                    interpretNatural: Boolean(column.validationInterpretNatural),
                    columns: tableDef.structure.columns.map(field => ({
                        name: field.name,
                        label: field.label || field.name,
                        type: field.type,
                        mysqlType: field.mysqlType
                    }))
                };
            }
        };
        enableEditableCells(host, rows, {
            columns: () => tableDef.structure.columns,
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
                recalculateRow(rows[rowIndex]);
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
                    const draftValue = insertDraft[column.name] ?? '';
                    const nextValue = draftValue === '' ? defaultValueForColumn(column) : draftValue;
                    newRow[column.name] = normalizeCellValue(nextValue, column.type);
                });
                recalculateRow(newRow);

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
                        if (row.__acaciadbOrder === undefined) {
                            Object.defineProperty(row, '__acaciadbOrder', {
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
                await addColumnFromType();
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
                savePrefs({ ...prefs, sortState: { ...sortState } });
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
                    host.querySelector('.acaciadb-grid')?.style.setProperty('--acaciadb-row-height', `${nextHeight}px`);
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

            const pageButton = event.target.closest('[data-page-nav]');
            if (pageButton) {
                const limit = Math.max(1, Math.min(2000, Number.parseInt(pageLimitInput?.value, 10) || pagination.limit));
                const skip = Math.max(0, Number.parseInt(pageSkipInput?.value, 10) || 0);
                const nextSkip = pageButton.dataset.pageNav === 'previous'
                    ? Math.max(0, skip - limit)
                    : skip + limit;
                if (cursorRowIndex < rows.length && isRowDirty(cursorRowIndex)) {
                    const committed = await commitDirtyRow(cursorRowIndex);
                    if (!committed) return;
                }
                await loadTablePage(nextSkip, limit);
                return;
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

        view.addEventListener('change', event => {
            if (event.target === pageSkipInput) {
                pageSkipInput.value = String(Math.max(0, Number.parseInt(pageSkipInput.value, 10) || 0));
            }
            if (event.target === pageLimitInput) {
                pageLimitInput.value = String(Math.max(1, Math.min(2000, Number.parseInt(pageLimitInput.value, 10) || 500)));
            }
        });

        view.addEventListener('keydown', async event => {
            if (event.key !== 'Enter' || (event.target !== pageSkipInput && event.target !== pageLimitInput)) {
                return;
            }
            event.preventDefault();
            if (cursorRowIndex < rows.length && isRowDirty(cursorRowIndex)) {
                const committed = await commitDirtyRow(cursorRowIndex);
                if (!committed) return;
            }
            await loadTablePage(pageSkipInput?.value, pageLimitInput?.value);
        });
    }
}

