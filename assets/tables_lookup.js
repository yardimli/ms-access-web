function lookupWizardImage() {
    return '<div class="lookup-wizard-art"><i class="fas fa-table"></i><i class="fas fa-arrow-down"></i><i class="far fa-check-square"></i></div>';
}

function lookupWizardFieldNamesFromQuery(query = {}) {
    return Array.from(new Set((query.fields || []).map(field => field.field).filter(Boolean)));
}

function lookupWizardOptionToRows(source = [], columnCount = 1) {
    return source.map(option => {
        if (typeof option === 'object' && option !== null) {
            return [option.key ?? '', option.value ?? '', ...Array.from({ length: Math.max(0, columnCount - 2) }, () => '')];
        }
        return [option, ...Array.from({ length: Math.max(0, columnCount - 1) }, () => '')];
    });
}

function lookupWizardRowsToSource(rows = [], keyColumn = 'Col1', displayColumns = ['Col1']) {
    const keyIndex = Math.max(0, Number(String(keyColumn).replace(/^Col/i, '')) - 1);
    const displayIndexes = displayColumns.map(name => Math.max(0, Number(String(name).replace(/^Col/i, '')) - 1));
    return rows
        .map(row => {
            const key = String(row[keyIndex] ?? '').trim();
            const label = displayIndexes.map(index => String(row[index] ?? '').trim()).filter(Boolean).join(' ');
            if (!key && !label) return null;
            return label && label !== key ? { key: key || label, value: label } : (key || label);
        })
        .filter(Boolean);
}

function normalizeLookupWizardMetadata(lookup = null) {
    if (!lookup || typeof lookup !== 'object') {
        return null;
    }

    const source = Array.isArray(lookup.source) ? lookup.source : [];
    const hasKeyValueOptions = source.some(option => option && typeof option === 'object');
    const kind = lookup.kind || (lookup.sourceObjectName || lookup.sourceTable ? 'table' : 'static');
    const columns = Math.max(1, Number(lookup.columns || (hasKeyValueOptions ? 2 : 1)));

    return {
        ...lookup,
        kind,
        columns,
        keyColumn: lookup.keyColumn || (kind === 'static' ? 'Col1' : ''),
        displayColumns: Array.isArray(lookup.displayColumns) && lookup.displayColumns.length
            ? [...lookup.displayColumns]
            : (kind === 'static' ? [hasKeyValueOptions ? 'Col2' : 'Col1'] : [...(lookup.selectedFields || [])]),
        selectedFields: [...(lookup.selectedFields || lookup.displayColumns || [])],
        source
    };
}

window.AcaciaDBLookupWizard = {
    open({
        db,
        tableName,
        tableColumns = [],
        existingColumn = null,
        defaultName = 'Field1',
        defaultFriendlyName = ''
    } = {}) {
        return new Promise(resolve => {
            const existingLookup = normalizeLookupWizardMetadata(existingColumn?.lookup);
            const lockedKind = existingLookup?.kind || '';
            const lockedMultipleStorage = existingLookup?.mode === 'multiple';
            const state = {
                step: lockedKind ? 1 : 0,
                kind: lockedKind || 'table',
                viewFilter: 'tables',
                sourceObjectType: existingLookup?.sourceObjectType || 'table',
                sourceObjectName: existingLookup?.sourceObjectName || '',
                selectedFields: [...(existingLookup?.selectedFields || existingLookup?.displayColumns || [])],
                displayColumns: [...(existingLookup?.displayColumns || existingLookup?.selectedFields || [])],
                keyColumn: existingLookup?.keyColumn || '',
                hideKeyColumn: existingLookup?.hideKeyColumn !== false,
                sort: [...(existingLookup?.sort || [])],
                label: existingColumn?.name || existingLookup?.label || defaultName,
                friendlyName: existingColumn?.friendlyName || existingColumn?.label || existingLookup?.label || defaultFriendlyName || '',
                allowMultiple: existingLookup?.mode === 'multiple',
                multipleStorage: existingLookup?.storageMode || (existingLookup?.relationshipTable ? 'relationship' : 'json'),
                limitToList: Boolean(existingLookup?.limitToList),
                dataIntegrity: Boolean(existingLookup?.dataIntegrity),
                cascadeDelete: Boolean(existingLookup?.cascadeDelete),
                staticColumns: existingLookup?.columns || 1,
                staticRows: lookupWizardOptionToRows(existingLookup?.source || ['', '', ''], existingLookup?.columns || 1),
                valueType: existingLookup?.valueType || 'string'
            };

            const dialog = document.createElement('dialog');
            dialog.className = 'lookup-wizard-dialog';
            document.body.appendChild(dialog);

            function tableNames() {
                return Object.keys(db.tables || {});
            }

            function queryNames() {
                return Object.keys(db.queries || {});
            }

            async function ensureSourceTable(name) {
                if (!name || db.tables?.[name]?.structure) return db.tables?.[name] || null;
                const response = await fetch(`api/view.php?view=table-${objectSlug(name)}`, { cache: 'no-store' });
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load lookup source table.');
                mergeViewData(db, payload.view?.data || {});
                return db.tables?.[name] || null;
            }

            async function ensureSourceQuery(name) {
                if (!name || db.queries?.[name]?.fields) return db.queries?.[name] || null;
                const response = await fetch(`api/view.php?view=query-${objectSlug(name)}`, { cache: 'no-store' });
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.error || 'Unable to load lookup source query.');
                mergeViewData(db, payload.view?.data || {});
                return db.queries?.[name] || null;
            }

            function sourceFieldNames() {
                if (state.sourceObjectType === 'query') {
                    return lookupWizardFieldNamesFromQuery(db.queries?.[state.sourceObjectName]);
                }
                const sourceTable = db.tables?.[state.sourceObjectName];
                return (sourceTable?.structure?.columns || []).map(column => column.name);
            }

            function sourcePrimaryKey() {
                return state.sourceObjectType === 'table'
                    ? (db.tables?.[state.sourceObjectName]?.structure?.primaryKey || '')
                    : '';
            }

            function stepsForKind() {
                if (state.kind === 'static') {
                    return ['kind', 'values', 'key', 'finish'];
                }
                return ['kind', 'source', 'fields', 'sort', 'width', 'key', 'finish'];
            }

            function currentStepName() {
                return stepsForKind()[state.step] || 'finish';
            }

            function canGoNext() {
                const step = currentStepName();
                if (step === 'kind') return Boolean(state.kind);
                if (step === 'source') return Boolean(state.sourceObjectName);
                if (step === 'fields') return state.selectedFields.length > 0;
                if (step === 'key') return Boolean(state.keyColumn);
                if (step === 'values') return lookupWizardRowsToSource(state.staticRows, state.keyColumn || 'Col1', state.displayColumns.length ? state.displayColumns : ['Col1']).length > 0;
                if (step === 'finish') return isValidSqlFieldName(state.label);
                return true;
            }

            function staticColumnNames() {
                return Array.from({ length: Math.max(1, Number(state.staticColumns || 1)) }, (_, index) => `Col${index + 1}`);
            }

            function tableDisplayColumns() {
                const selected = Array.from(new Set(state.selectedFields.filter(Boolean)));
                const keyColumn = state.keyColumn || selected[0] || '';
                const visible = state.hideKeyColumn
                    ? selected.filter(field => field !== keyColumn)
                    : selected;
                return visible.length ? visible : (keyColumn ? [keyColumn] : []);
            }

            function wizardConfig() {
                if (state.kind === 'static') {
                    const columnNames = staticColumnNames();
                    const displayColumns = state.displayColumns.length ? state.displayColumns : [columnNames[0]];
                    return {
                        kind: 'static',
                        columns: columnNames.length,
                        keyColumn: state.keyColumn || columnNames[0],
                        displayColumns,
                        label: state.friendlyName || state.label,
                        allowMultiple: state.allowMultiple,
                        limitToList: state.limitToList,
                        valueType: state.valueType,
                        source: lookupWizardRowsToSource(state.staticRows, state.keyColumn || columnNames[0], displayColumns)
                    };
                }

                const primaryKey = sourcePrimaryKey();
                const keyColumn = primaryKey || state.keyColumn;
                return {
                    kind: 'table',
                    sourceObjectType: state.sourceObjectType,
                    sourceObjectName: state.sourceObjectName,
                    selectedFields: Array.from(new Set([keyColumn, ...state.selectedFields].filter(Boolean))),
                    displayColumns: tableDisplayColumns(),
                    keyColumn,
                    hideKeyColumn: state.hideKeyColumn,
                    sort: state.sort.filter(item => item.field),
                    label: state.friendlyName || state.label,
                    allowMultiple: state.allowMultiple,
                    storageMode: state.allowMultiple ? state.multipleStorage : 'column',
                    dataIntegrity: state.dataIntegrity,
                    cascadeDelete: state.cascadeDelete
                };
            }

            function footerMarkup(isFinish = false) {
                return `
                    <div class="lookup-wizard-footer">
                        <button type="button" data-wizard-cancel>Cancel</button>
                        <button type="button" data-wizard-back ${state.step <= (lockedKind ? 1 : 0) ? 'disabled' : ''}>&lt; Back</button>
                        <button type="button" data-wizard-next ${isFinish ? 'disabled' : ''} ${!canGoNext() ? 'disabled' : ''}>Next &gt;</button>
                        <button type="button" data-wizard-finish ${!isFinish || !canGoNext() ? 'disabled' : ''}>Finish</button>
                    </div>
                `;
            }

            function refreshFooterButtons() {
                const isFinish = currentStepName() === 'finish';
                const valid = canGoNext();
                const next = dialog.querySelector('[data-wizard-next]');
                const finishButton = dialog.querySelector('[data-wizard-finish]');
                if (next) next.disabled = isFinish || !valid;
                if (finishButton) finishButton.disabled = !isFinish || !valid;
            }

            function renderKindStep() {
                return `
                    <div class="lookup-wizard-content">
                        ${lookupWizardImage()}
                        <div class="lookup-wizard-pane">
                            <p>This wizard creates a lookup field, which displays a list of values you can choose from. How do you want your lookup field to get its values?</p>
                            <label class="lookup-radio-line"><input type="radio" name="lookupKind" value="table" ${state.kind === 'table' ? 'checked' : ''}> I want the lookup field to get the values from another table or query.</label>
                            <label class="lookup-radio-line"><input type="radio" name="lookupKind" value="static" ${state.kind === 'static' ? 'checked' : ''}> I will type in the values that I want.</label>
                        </div>
                    </div>
                `;
            }

            function renderSourceStep() {
                const names = [
                    ...(state.viewFilter !== 'queries' ? tableNames().map(name => ['table', name]) : []),
                    ...(state.viewFilter !== 'tables' ? queryNames().map(name => ['query', name]) : [])
                ];
                if (!state.sourceObjectName && names[0]) {
                    state.sourceObjectType = names[0][0];
                    state.sourceObjectName = names[0][1];
                }
                return `
                    <div class="lookup-wizard-content">
                        ${lookupWizardImage()}
                        <div class="lookup-wizard-pane">
                            <p>Which table or query should provide the values for your lookup field?</p>
                            <div class="lookup-listbox" data-source-list>
                                ${names.map(([type, name]) => `
                                    <button type="button" class="${type === state.sourceObjectType && name === state.sourceObjectName ? 'active' : ''}" data-source-type="${escapeHtml(type)}" data-source-name="${escapeHtml(name)}">
                                        ${type === 'query' ? 'Query' : 'Table'}: ${escapeHtml(name)}
                                    </button>
                                `).join('')}
                            </div>
                            <fieldset class="lookup-view-filter">
                                <legend>View</legend>
                                ${['tables', 'queries', 'both'].map(value => `<label><input type="radio" name="viewFilter" value="${value}" ${state.viewFilter === value ? 'checked' : ''}> ${value[0].toUpperCase() + value.slice(1)}</label>`).join('')}
                            </fieldset>
                        </div>
                    </div>
                `;
            }

            function renderFieldsStep() {
                const fields = sourceFieldNames();
                state.selectedFields = state.selectedFields.filter(field => fields.includes(field));
                return `
                    <div class="lookup-wizard-content">
                        ${lookupWizardImage()}
                        <div class="lookup-wizard-pane">
                            <p>Which fields of ${escapeHtml(state.sourceObjectName)} contain the values you want included in your lookup field?</p>
                            <div class="lookup-transfer">
                                <label>Available Fields:<select size="8" data-available-fields>${fields.filter(field => !state.selectedFields.includes(field)).map(field => `<option>${escapeHtml(field)}</option>`).join('')}</select></label>
                                <div class="lookup-transfer-buttons">
                                    <button type="button" data-transfer="one">&gt;</button>
                                    <button type="button" data-transfer="all">&gt;&gt;</button>
                                    <button type="button" data-transfer="remove">&lt;</button>
                                    <button type="button" data-transfer="remove-all">&lt;&lt;</button>
                                </div>
                                <label>Selected Fields:<select size="8" data-selected-fields>${state.selectedFields.map(field => `<option>${escapeHtml(field)}</option>`).join('')}</select></label>
                            </div>
                        </div>
                    </div>
                `;
            }

            function renderSortStep() {
                const fields = state.selectedFields.length ? state.selectedFields : sourceFieldNames();
                return `
                    <div class="lookup-wizard-pane lookup-full-pane">
                        <p>What sort order do you want for the items in your list box?</p>
                        <p>You can sort records by up to four fields, in either ascending or descending order.</p>
                        <div class="lookup-sort-rows">
                            ${Array.from({ length: 4 }, (_, index) => {
                                const sort = state.sort[index] || {};
                                return `<div><span>${index + 1}</span><select data-sort-field="${index}"><option></option>${fields.map(field => `<option ${sort.field === field ? 'selected' : ''}>${escapeHtml(field)}</option>`).join('')}</select><button type="button" data-sort-dir="${index}" ${sort.field ? '' : 'disabled'}>${sort.direction === 'desc' ? 'Descending' : 'Ascending'}</button></div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            function renderWidthStep() {
                const rows = (db.tables?.[state.sourceObjectName]?.data || []).slice(0, 6);
                if (!state.keyColumn || !state.selectedFields.includes(state.keyColumn)) {
                    state.keyColumn = state.selectedFields[0] || '';
                }
                const columns = tableDisplayColumns();
                return `
                    <div class="lookup-wizard-pane lookup-full-pane">
                        <p>How wide would you like the columns in your lookup field?</p>
                        <p>To adjust the width of a column, drag its right edge to the width you want, or double-click the right edge of the column heading to get the best fit.</p>
                        <label class="lookup-check-line"><input type="checkbox" data-hide-key ${state.hideKeyColumn ? 'checked' : ''}> Hide key column (recommended)</label>
                        <div class="lookup-preview-grid">
                            <table>
                                <thead><tr>${columns.map(field => `<th>${escapeHtml(field)}</th>`).join('')}</tr></thead>
                                <tbody>${rows.map(row => `<tr>${columns.map(field => `<td>${escapeHtml(row[field] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            function renderKeyStep() {
                const primaryKey = sourcePrimaryKey();
                const fields = state.kind === 'static'
                    ? staticColumnNames()
                    : primaryKey
                        ? [primaryKey]
                        : (state.selectedFields.length ? state.selectedFields : sourceFieldNames());
                if (!state.keyColumn || !fields.includes(state.keyColumn)) {
                    state.keyColumn = fields[0] || '';
                }
                return `
                    <div class="lookup-wizard-content">
                        ${lookupWizardImage()}
                        <div class="lookup-wizard-pane">
                            <p>Choose a field that uniquely identifies each row. Which column in your lookup field contains the value you want to store or use in your database?</p>
                            <label>Available Fields:<select size="6" data-key-field>${fields.map(field => `<option ${field === state.keyColumn ? 'selected' : ''}>${escapeHtml(field)}</option>`).join('')}</select></label>
                        </div>
                    </div>
                `;
            }

            function renderValuesStep() {
                const columnNames = staticColumnNames();
                while (state.staticRows.length < 8) state.staticRows.push(Array.from({ length: columnNames.length }, () => ''));
                state.staticRows = state.staticRows.map(row => columnNames.map((_, index) => row[index] ?? ''));
                if (!state.keyColumn) state.keyColumn = columnNames[0];
                if (!state.displayColumns.length) state.displayColumns = [columnNames[Math.min(1, columnNames.length - 1)] || columnNames[0]];
                return `
                    <div class="lookup-wizard-pane lookup-full-pane">
                        <p>What values do you want to see in your lookup field? Enter the number of columns you want in the list, and then type the values you want in each cell.</p>
                        <label class="lookup-column-count">Number of columns: <input type="number" min="1" max="8" value="${escapeHtml(state.staticColumns)}" data-static-columns></label>
                        <div class="lookup-preview-grid lookup-static-grid">
                            <table>
                                <thead><tr><th></th>${columnNames.map(name => `<th>${escapeHtml(name)}</th>`).join('')}</tr></thead>
                                <tbody>${state.staticRows.map((row, rowIndex) => `<tr><td>${rowIndex + 1}</td>${columnNames.map((name, colIndex) => `<td><input value="${escapeHtml(row[colIndex] ?? '')}" data-static-row="${rowIndex}" data-static-col="${colIndex}"></td>`).join('')}</tr>`).join('')}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            function renderFinishStep() {
                return `
                    <div class="lookup-wizard-content">
                        ${lookupWizardImage()}
                        <div class="lookup-wizard-pane">
                            <label>What label would you like for your lookup field?<input class="lookup-wide-input" value="${escapeHtml(state.label)}" data-lookup-label></label>
                            <label class="lookup-wide-input-label">Friendly name<input class="lookup-wide-input" value="${escapeHtml(state.friendlyName)}" data-lookup-friendly placeholder="Optional display label"></label>
                            ${state.kind === 'static' ? `
                                <label class="lookup-check-line"><input type="checkbox" data-limit-list ${state.limitToList ? 'checked' : ''}> Limit To List</label>
                            ` : `
                                <p>Do you want to enable data integrity between these tables?</p>
                                <label class="lookup-check-line"><input type="checkbox" data-data-integrity ${state.dataIntegrity ? 'checked' : ''}> Enable Data Integrity</label>
                                <label class="lookup-radio-line disabled"><input type="radio" disabled ${state.cascadeDelete ? 'checked' : ''}> Cascade Delete</label>
                                <label class="lookup-radio-line disabled"><input type="radio" disabled ${!state.cascadeDelete ? 'checked' : ''}> Restrict Delete</label>
                            `}
                            <p>Do you want to store multiple values for this lookup?</p>
                            <label class="lookup-check-line ${existingLookup ? 'disabled' : ''}"><input type="checkbox" data-allow-multiple ${state.allowMultiple ? 'checked' : ''} ${existingLookup ? 'disabled' : ''}> Allow Multiple Values</label>
                            ${state.kind === 'table' && state.allowMultiple ? `
                                <p>Should AcaciaDB create an external relational table for this one-to-many relationship?</p>
                                <label class="lookup-radio-line"><input type="radio" name="multipleStorage" value="relationship" ${state.multipleStorage === 'relationship' ? 'checked' : ''} ${lockedMultipleStorage ? 'disabled' : ''}> Yes, create an external relationship table and show a virtual lookup field.</label>
                                <label class="lookup-radio-line"><input type="radio" name="multipleStorage" value="json" ${state.multipleStorage === 'json' ? 'checked' : ''} ${lockedMultipleStorage ? 'disabled' : ''}> No, store selected primary keys and display values as JSON in this table.</label>
                            ` : ''}
                            <p>Those are all the answers the wizard needs to create your lookup field.</p>
                            <p class="dialog-error" data-wizard-error hidden></p>
                        </div>
                    </div>
                `;
            }

            async function render() {
                const step = currentStepName();
                if ((step === 'fields' || step === 'width') && state.sourceObjectType === 'table') {
                    await ensureSourceTable(state.sourceObjectName);
                }
                if (step === 'fields' && state.sourceObjectType === 'query') {
                    await ensureSourceQuery(state.sourceObjectName);
                }
                const isFinish = step === 'finish';
                const body = {
                    kind: renderKindStep,
                    source: renderSourceStep,
                    fields: renderFieldsStep,
                    sort: renderSortStep,
                    width: renderWidthStep,
                    key: renderKeyStep,
                    values: renderValuesStep,
                    finish: renderFinishStep
                }[step]();
                dialog.innerHTML = `
                    <form method="dialog">
                        <div class="lookup-wizard-title"><span>Lookup Wizard</span><button type="button" data-wizard-cancel aria-label="Close"><i class="fas fa-times"></i></button></div>
                        <div class="lookup-wizard-body">${body}</div>
                        ${footerMarkup(isFinish)}
                    </form>
                `;
                bindStepEvents();
            }

            function bindStepEvents() {
                dialog.querySelectorAll('[data-wizard-cancel]').forEach(button => button.addEventListener('click', () => finish(null), { once: true }));
                dialog.querySelector('[data-wizard-back]')?.addEventListener('click', () => {
                    state.step = Math.max(lockedKind ? 1 : 0, state.step - 1);
                    render();
                });
                dialog.querySelector('[data-wizard-next]')?.addEventListener('click', async () => {
                    if (!canGoNext()) return;
                    state.step = Math.min(stepsForKind().length - 1, state.step + 1);
                    await render();
                });
                dialog.querySelector('[data-wizard-finish]')?.addEventListener('click', () => {
                    if (!isValidSqlFieldName(state.label)) {
                        const error = dialog.querySelector('[data-wizard-error]');
                        if (error) {
                            error.textContent = 'Use a SQL-safe field name: letters, numbers, and underscores, starting with a letter or underscore.';
                            error.hidden = false;
                        }
                        return;
                    }
                    finish({
                        name: state.label,
                        friendlyName: state.friendlyName,
                        lookup: wizardConfig()
                    });
                });

                dialog.querySelectorAll('input[name="lookupKind"]').forEach(input => input.addEventListener('change', () => {
                    state.kind = input.value;
                    state.step = 0;
                    render();
                }));
                dialog.querySelectorAll('input[name="viewFilter"]').forEach(input => input.addEventListener('change', () => {
                    state.viewFilter = input.value;
                    state.sourceObjectName = '';
                    render();
                }));
                dialog.querySelectorAll('[data-source-name]').forEach(button => button.addEventListener('click', () => {
                    state.sourceObjectType = button.dataset.sourceType;
                    state.sourceObjectName = button.dataset.sourceName;
                    state.selectedFields = [];
                    state.displayColumns = [];
                    state.keyColumn = '';
                    render();
                }));
                dialog.querySelectorAll('[data-transfer]').forEach(button => button.addEventListener('click', () => {
                    const available = dialog.querySelector('[data-available-fields]');
                    const selected = dialog.querySelector('[data-selected-fields]');
                    const transfer = button.dataset.transfer;
                    if (transfer === 'one') state.selectedFields.push(...Array.from(available.selectedOptions).map(option => option.value || option.textContent));
                    if (transfer === 'all') state.selectedFields.push(...Array.from(available.options).map(option => option.value || option.textContent));
                    if (transfer === 'remove') state.selectedFields = state.selectedFields.filter(field => !Array.from(selected.selectedOptions).some(option => (option.value || option.textContent) === field));
                    if (transfer === 'remove-all') state.selectedFields = [];
                    state.selectedFields = Array.from(new Set(state.selectedFields));
                    state.displayColumns = [...state.selectedFields];
                    render();
                }));
                dialog.querySelectorAll('[data-sort-field]').forEach(select => select.addEventListener('change', () => {
                    const index = Number(select.dataset.sortField);
                    state.sort[index] = { field: select.value, direction: state.sort[index]?.direction || 'asc' };
                    render();
                }));
                dialog.querySelectorAll('[data-sort-dir]').forEach(button => button.addEventListener('click', () => {
                    const index = Number(button.dataset.sortDir);
                    state.sort[index] = { ...(state.sort[index] || {}), direction: state.sort[index]?.direction === 'desc' ? 'asc' : 'desc' };
                    render();
                }));
                dialog.querySelector('[data-hide-key]')?.addEventListener('change', event => {
                    state.hideKeyColumn = event.target.checked;
                    state.displayColumns = tableDisplayColumns();
                    render();
                });
                dialog.querySelector('[data-key-field]')?.addEventListener('change', event => {
                    state.keyColumn = event.target.value;
                    if (!state.displayColumns.length) state.displayColumns = [event.target.value];
                });
                dialog.querySelector('[data-static-columns]')?.addEventListener('change', event => {
                    state.staticColumns = Math.max(1, Math.min(8, Number(event.target.value || 1)));
                    state.keyColumn = 'Col1';
                    state.displayColumns = [`Col${Math.min(2, state.staticColumns)}`];
                    render();
                });
                dialog.querySelectorAll('[data-static-row]').forEach(input => input.addEventListener('input', () => {
                    const row = Number(input.dataset.staticRow);
                    const col = Number(input.dataset.staticCol);
                    state.staticRows[row] ??= [];
                    state.staticRows[row][col] = input.value;
                    refreshFooterButtons();
                }));
                dialog.querySelector('[data-lookup-label]')?.addEventListener('input', event => {
                    state.label = event.target.value.trim();
                    refreshFooterButtons();
                });
                dialog.querySelector('[data-lookup-friendly]')?.addEventListener('input', event => {
                    state.friendlyName = event.target.value.trim();
                });
                dialog.querySelector('[data-limit-list]')?.addEventListener('change', event => {
                    state.limitToList = event.target.checked;
                });
                dialog.querySelector('[data-data-integrity]')?.addEventListener('change', event => {
                    state.dataIntegrity = event.target.checked;
                });
                dialog.querySelector('[data-allow-multiple]')?.addEventListener('change', event => {
                    state.allowMultiple = event.target.checked;
                    render();
                });
                dialog.querySelectorAll('input[name="multipleStorage"]').forEach(input => input.addEventListener('change', () => {
                    state.multipleStorage = input.value;
                }));
            }

            function finish(value) {
                dialog.close();
                dialog.remove();
                resolve(value);
            }

            dialog.addEventListener('cancel', event => {
                event.preventDefault();
                finish(null);
            }, { once: true });
            showMovableModal(dialog);
            render();
        });
    }
};
