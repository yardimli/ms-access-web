const designFieldTypes = [
    'Short Text', 'Long Text', 'HTML Text', 'Number', 'Large Number',
    'Date/Time', 'Currency', 'AutoNumber', 'Yes/No', 'Hyperlink', 'Attachment', 'OLE Object', 'Calculated Field'
];

const designLookupTypes = new Set(['Short Text', 'Number']);

function cloneDesignValue(value) {
    return JSON.parse(JSON.stringify(value ?? null));
}

function designBaseType(column) {
    if (!column?.lookup) return column?.acaciadbType || column?.type || 'Short Text';
    return /(?:^|\W)(?:tinyint|smallint|mediumint|int|bigint|decimal|numeric)(?:\W|$)/i.test(column.actualMysqlType || column.mysqlType || '')
        ? 'Number'
        : 'Short Text';
}

function showDesignSaveDialog(tableName, descriptions, destructive) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'acaciadb-dialog design-save-dialog';
        dialog.innerHTML = `<form method="dialog"><div class="acaciadb-dialog-title"><span>Save Table Design</span>
            <button type="button" data-dialog-cancel aria-label="Close"><i class="fas fa-times"></i></button></div>
            <div class="acaciadb-dialog-body"><p>Apply these design changes to <strong>${escapeHtml(tableName)}</strong>?</p>
            <ul class="design-save-list">${descriptions.map(description => `<li>${escapeHtml(description)}</li>`).join('')}</ul>
            ${destructive ? '<p class="design-save-warning"><i class="fas fa-exclamation-triangle"></i> Type conversions and deleted fields can permanently lose data. MariaDB will test conversions before applying them.</p>' : ''}
            <p class="dialog-error" data-dialog-error hidden></p></div><div class="dialog-actions">
            <button type="button" data-dialog-cancel>Keep Designing</button><button class="primary" type="submit">Save</button></div></form>`;
        document.body.appendChild(dialog);
        dialog.querySelectorAll('[data-dialog-cancel]').forEach(button => button.addEventListener('click', () => dialog.close('cancel')));
        dialog.querySelector('form').addEventListener('submit', event => { event.preventDefault(); dialog.close('save'); });
        dialog.addEventListener('close', () => { const confirmed = dialog.returnValue === 'save'; dialog.remove(); resolve(confirmed); }, { once: true });
        dialog.showModal();
    });
}

function initDesignViews(db) {
    content.querySelectorAll('[data-design-view]').forEach(view => {
        if (view.dataset.ready === 'true') return;
        view.dataset.ready = 'true';

        const tableName = view.dataset.tableId;
        const tableDef = db.tables[tableName];
        const sourceColumns = tableDef?.structure?.columns || [];
        const columns = sourceColumns.map((column, index) => ({
            ...cloneDesignValue(column), type: designBaseType(column), originalName: column.name,
            originalIndex: index, isNew: false, deleted: false
        }));
        const originalColumns = cloneDesignValue(columns);
        const tableProperties = {
            readOnlyWhenDisconnected: 'No', subdatasheetExpanded: 'No', subdatasheetHeight: '0"',
            orientation: 'Left-to-Right', description: '', defaultView: 'Datasheet', validationRule: '',
            validationText: '', filter: '', orderBy: '', subdatasheetName: '[Auto]', linkChildFields: '',
            linkMasterFields: '', filterOnLoad: 'No', orderByOnLoad: 'Yes',
            ...(cloneDesignValue(tableDef?.structure?.tableProperties) || {})
        };
        const originalTableProperties = cloneDesignValue(tableProperties);
        let selectedIndex = 0;
        let activeFieldTab = 'general';

        const visibleColumns = () => columns.filter(column => !column.deleted);
        const selectedColumn = () => columns[selectedIndex] || visibleColumns()[0] || null;

        function fieldSizeFor(column) {
            if (column.primaryKey || ['Large Number', 'Number'].includes(column.type)) return 'Long Integer';
            if (column.type === 'Currency') return 'Currency';
            if (column.type === 'Yes/No') return 'Yes/No';
            if (column.type === 'Date/Time') return 'General Date';
            if (['Long Text', 'HTML Text'].includes(column.type)) return 'Long Text';
            return String(column.fieldSize || 255);
        }

        function generalProperties(column) {
            if (!column) return [];
            if (column.primaryKey) {
                return [
                    ['Field Size', 'fieldSize', 'Long Integer', 'text', true],
                    ['New Values', 'newValues', 'Increment', 'text', true],
                    ['Format', 'format', column.acaciadbFormat || '', 'text', true],
                    ['Caption', 'friendlyName', column.friendlyName || '', 'text'],
                    ['Indexed', 'indexed', 'Yes (No Duplicates)', 'text', true],
                    ['Text Align', 'textAlign', 'General', 'select', false, ['General', 'Left', 'Center', 'Right']]
                ];
            }
            const rows = [['Field Size', 'fieldSize', fieldSizeFor(column), 'text', column.type !== 'Short Text']];
            if (['Number', 'Currency', 'Date/Time'].includes(column.type)) rows.push(['Format', 'acaciadbFormat', column.acaciadbFormat || '', 'text']);
            if (column.type === 'Number') rows.push(['Decimal Places', 'decimalPlaces', column.decimalPlaces ?? 'Auto', 'text']);
            rows.push(
                ['Input Mask', 'inputMask', column.inputMask || '', 'text'],
                ['Caption', 'friendlyName', column.friendlyName || '', 'text'],
                ['Default Value', 'defaultExpression', column.defaultExpression || '', 'text'],
                ['Validation Rule', 'validationRule', column.validationRule || '', 'text'],
                ['Validation Text', 'validationText', column.validationText || '', 'text'],
                ['Required', 'required', column.required ? 'Yes' : 'No', 'select', false, ['No', 'Yes']],
                ['Allow Zero Length', 'allowZeroLength', column.allowZeroLength === false ? 'No' : 'Yes', 'select', column.type !== 'Short Text', ['No', 'Yes']],
                ['Indexed', 'indexed', column.unique ? 'Yes (No Duplicates)' : column.indexed ? 'Yes (Duplicates OK)' : 'No', 'select', false, ['No', 'Yes (Duplicates OK)', 'Yes (No Duplicates)']],
                ['Unicode Compression', 'unicodeCompression', column.type === 'Short Text' ? 'Yes' : '', 'select', column.type !== 'Short Text', ['No', 'Yes']],
                ['IME Mode', 'imeMode', column.type === 'Short Text' ? 'No Control' : '', 'text', column.type !== 'Short Text'],
                ['IME Sentence Mode', 'imeSentenceMode', column.type === 'Short Text' ? 'None' : '', 'text', column.type !== 'Short Text'],
                ['Description', 'comment', column.comment || '', 'text'],
                ['Text Align', 'textAlign', column.textAlign || 'General', 'select', false, ['General', 'Left', 'Center', 'Right']]
            );
            return rows;
        }

        function lookupProperties(column) {
            if (!column || !designLookupTypes.has(column.type)) return [];
            const lookup = column.lookup || {};
            const sourceType = lookup.kind === 'table' ? 'Table/Query' : 'Value List';
            const rowSource = lookup.kind === 'table'
                ? (lookup.rowSource || `${lookup.sourceObjectName || ''};${(lookup.displayColumns || []).join(',')}`)
                : (lookup.rowSource || (lookup.source || []).map(option => typeof option === 'object' ? (option.value ?? option.label ?? option.key ?? '') : option).join(';'));
            const disabled = !column.lookup;
            return [
                ['Display Control', 'displayControl', lookup.displayControl || (column.lookup ? 'Combo Box' : 'Text Box'), 'select', false, ['Text Box', 'List Box', 'Combo Box']],
                ['Row Source Type', 'rowSourceType', sourceType, 'select', disabled, ['Table/Query', 'Value List']],
                ['Row Source', 'rowSource', rowSource, 'text', disabled],
                ['Bound Column', 'boundColumn', lookup.boundColumn || 1, 'number', disabled],
                ['Column Count', 'columnCount', lookup.columnCount || lookup.columns || 1, 'number', disabled],
                ['Column Heads', 'columnHeads', lookup.columnHeads ? 'Yes' : 'No', 'select', disabled, ['No', 'Yes']],
                ['Column Widths', 'columnWidths', lookup.columnWidths || '', 'text', disabled],
                ['List Rows', 'listRows', lookup.listRows || 16, 'number', disabled],
                ['List Width', 'listWidth', lookup.listWidth || 'Auto', 'text', disabled],
                ['Limit To List', 'limitToList', lookup.limitToList === false ? 'No' : 'Yes', 'select', disabled, ['No', 'Yes']],
                ['Allow Multiple Values', 'allowMultiple', lookup.mode === 'multiple' ? 'Yes' : 'No', 'select', disabled, ['No', 'Yes']],
                ['Allow Value List Edits', 'allowValueListEdits', lookup.allowValueListEdits ? 'Yes' : 'No', 'select', disabled, ['No', 'Yes']],
                ['List Items Edit Form', 'listItemsEditForm', lookup.listItemsEditForm || '', 'text', disabled],
                ['Show Only Row Source Values', 'showOnlyRowSourceValues', lookup.showOnlyRowSourceValues ? 'Yes' : 'No', 'select', disabled, ['No', 'Yes']]
            ];
        }

        function propertyControl(key, value, kind, disabled, options = []) {
            const common = `data-field-property="${escapeHtml(key)}" ${disabled ? 'disabled' : ''}`;
            if (kind === 'select') return `<select ${common}>${options.map(option => `<option ${String(option) === String(value) ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`;
            return `<input type="${kind === 'number' ? 'number' : 'text'}" value="${escapeHtml(value)}" ${common}>`;
        }

        function renderFieldProperties() {
            const column = selectedColumn();
            const host = view.querySelector('[data-field-property-grid]');
            if (!host || !column) return;
            const lookupTab = view.querySelector('[data-field-tab="lookup"]');
            lookupTab.disabled = false;
            view.querySelectorAll('[data-field-tab]').forEach(button => button.classList.toggle('active', button.dataset.fieldTab === activeFieldTab));
            const rows = activeFieldTab === 'lookup' ? lookupProperties(column) : generalProperties(column);
            host.classList.toggle('empty', rows.length === 0);
            host.innerHTML = rows.length
                ? rows.map(([label, key, value, kind, disabled, options]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${propertyControl(key, value, kind, disabled, options)}</div>`).join('')
                : '';
        }

        function renderPropertySheet() {
            const host = view.querySelector('[data-property-sheet-grid]');
            if (!host) return;
            const rows = [
                ['Read Only When Disconnected', 'readOnlyWhenDisconnected', ['No', 'Yes']], ['Subdatasheet Expanded', 'subdatasheetExpanded', ['No', 'Yes']],
                ['Subdatasheet Height', 'subdatasheetHeight'], ['Orientation', 'orientation', ['Left-to-Right', 'Right-to-Left']],
                ['Description', 'description'], ['Default View', 'defaultView', ['Datasheet', 'PivotTable', 'PivotChart']],
                ['Validation Rule', 'validationRule'], ['Validation Text', 'validationText'], ['Filter', 'filter'], ['Order By', 'orderBy'],
                ['Subdatasheet Name', 'subdatasheetName'], ['Link Child Fields', 'linkChildFields'], ['Link Master Fields', 'linkMasterFields'],
                ['Filter On Load', 'filterOnLoad', ['No', 'Yes']], ['Order By On Load', 'orderByOnLoad', ['No', 'Yes']]
            ];
            host.innerHTML = rows.map(([label, key, options]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${options
                ? `<select data-table-property="${key}">${options.map(option => `<option ${option === tableProperties[key] ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`
                : `<input data-table-property="${key}" value="${escapeHtml(tableProperties[key] || '')}">`}</div>`).join('');
        }

        function renderRows() {
            const body = view.querySelector('[data-design-body]');
            if (!body) return;
            body.innerHTML = visibleColumns().map(column => {
                const index = columns.indexOf(column);
                return `<tr class="${index === selectedIndex ? 'editing' : ''}" data-design-row="${index}">
                    <td class="row-head" data-design-row-head="${index}">${column.primaryKey ? '<i class="fas fa-key"></i>' : index === selectedIndex ? '<i class="fas fa-caret-right"></i>' : ''}</td>
                    <td><input class="design-cell-input" data-design-name value="${escapeHtml(column.name)}" ${column.primaryKey ? 'disabled' : ''}></td>
                    <td class="design-type-cell"><select data-design-type ${column.primaryKey || column.lookup || column.calculatedJavascript ? 'disabled' : ''}>${designFieldTypes.map(type => `<option ${type === column.type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select></td>
                    <td><input class="design-cell-input" data-design-comment value="${escapeHtml(column.comment || '')}"></td>
                </tr>`;
            }).join('') + Array.from({ length: Math.max(3, 8 - visibleColumns().length) }, () => '<tr data-empty-design-row><td class="row-head"></td><td></td><td></td><td></td></tr>').join('');
        }

        function selectDesignRow(index) {
            if (!columns[index] || columns[index].deleted) return;
            selectedIndex = index;
            view.querySelectorAll('[data-design-row]').forEach(row => row.classList.toggle('editing', Number(row.dataset.designRow) === selectedIndex));
            view.querySelectorAll('[data-design-row-head]').forEach(head => {
                const column = columns[Number(head.dataset.designRowHead)];
                head.innerHTML = column?.primaryKey ? '<i class="fas fa-key"></i>' : Number(head.dataset.designRowHead) === selectedIndex ? '<i class="fas fa-caret-right"></i>' : '';
            });
            renderFieldProperties();
        }

        function insertField(afterIndex) {
            const used = new Set(columns.map(column => column.name.toLowerCase()));
            let number = 1;
            while (used.has(`field${number}`.toLowerCase())) number += 1;
            const newColumn = { name: `Field${number}`, originalName: '', type: 'Short Text', comment: '', friendlyName: '', fieldSize: 255, required: false, indexed: false, unique: false, lookup: null, isNew: true, deleted: false, primaryKey: false };
            columns.splice(Math.max(0, Math.min(columns.length, afterIndex + 1)), 0, newColumn);
            selectedIndex = columns.indexOf(newColumn);
            renderRows();
            selectDesignRow(selectedIndex);
            view.querySelector(`[data-design-row="${selectedIndex}"] [data-design-name]`)?.select();
        }

        function deleteField(index) {
            const column = columns[index];
            if (!column || column.primaryKey) return;
            column.deleted = true;
            const next = columns.findIndex((candidate, candidateIndex) => candidateIndex >= index && !candidate.deleted);
            selectedIndex = next >= 0 ? next : Math.max(0, columns.findLastIndex(candidate => !candidate.deleted));
            renderRows();
            renderFieldProperties();
        }

        function showRowMenu(event, index) {
            document.querySelector('.design-row-menu')?.remove();
            const column = columns[index];
            const menu = document.createElement('div');
            menu.className = 'design-row-menu';
            menu.innerHTML = `<button type="button" data-row-action="primary" ${column.primaryKey ? 'disabled' : ''}><i class="fas fa-key"></i><span>Primary Key</span></button>
                <button type="button" data-row-action="cut"><i class="fas fa-cut"></i><span>Cut</span></button><button type="button" data-row-action="copy"><i class="far fa-copy"></i><span>Copy</span></button>
                <button type="button" data-row-action="paste" disabled><i class="fas fa-paste"></i><span>Paste</span></button><hr>
                <button type="button" data-row-action="insert"><i class="fas fa-indent"></i><span>Insert Rows</span></button>
                <button type="button" data-row-action="delete" ${column.primaryKey ? 'disabled' : ''}><i class="fas fa-times text-red-700"></i><span>Delete Rows</span></button>
                <button type="button" data-row-action="properties"><i class="fas fa-list-alt"></i><span>Properties</span></button>`;
            menu.style.left = `${event.clientX}px`;
            menu.style.top = `${event.clientY}px`;
            menu.dataset.rowIndex = String(index);
            menu.addEventListener('click', menuEvent => {
                const action = menuEvent.target.closest('[data-row-action]');
                if (!action || action.disabled) return;
                if (action.dataset.rowAction === 'insert') insertField(index - 1);
                if (action.dataset.rowAction === 'delete') deleteField(index);
                if (action.dataset.rowAction === 'properties') renderFieldProperties();
                menu.remove();
            });
            document.body.appendChild(menu);
        }

        function normalizeLookup(column) {
            if (!column.lookup) return null;
            const lookup = cloneDesignValue(column.lookup);
            lookup.displayControl ||= 'Combo Box';
            lookup.kind ||= 'static';
            lookup.mode ||= 'single';
            lookup.valueType ||= column.type === 'Number' ? 'integer' : 'string';
            if (lookup.kind === 'static') {
                lookup.keyColumn ||= 'Col1';
                lookup.displayColumns ||= ['Col1'];
            }
            lookup.source ||= [];
            lookup.boundColumn = Number(lookup.boundColumn || 1);
            lookup.columnCount = Number(lookup.columnCount || lookup.columns || 1);
            lookup.listRows = Number(lookup.listRows || 16);
            return lookup;
        }

        function comparable(column) {
            const copy = cloneDesignValue(column);
            delete copy.originalIndex;
            return copy;
        }

        function columnChanged(column) {
            if (column.isNew || column.deleted) return true;
            const original = originalColumns.find(candidate => candidate.originalName === column.originalName);
            return !original || JSON.stringify(comparable(column)) !== JSON.stringify(comparable(original));
        }

        function designChanges() {
            return columns.filter(columnChanged).map(column => ({
                originalName: column.originalName, name: column.name, type: column.type, comment: column.comment || '', friendlyName: column.friendlyName || '',
                required: Boolean(column.required), indexed: Boolean(column.indexed), unique: Boolean(column.unique), format: column.acaciadbFormat || '',
                decimalPlaces: column.decimalPlaces ?? 2, lookup: normalizeLookup(column), isNew: Boolean(column.isNew), deleted: Boolean(column.deleted)
            }));
        }

        const isDirty = () => designChanges().length > 0 || JSON.stringify(tableProperties) !== JSON.stringify(originalTableProperties);

        async function saveDesign() {
            const changes = designChanges();
            if (!changes.length && JSON.stringify(tableProperties) === JSON.stringify(originalTableProperties)) return true;
            const invalid = visibleColumns().find(column => !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(column.name));
            if (invalid) {
                await showMessageDialog({ title: 'Invalid Field Name', message: `${invalid.name} is not a valid SQL field name.`, confirmText: 'OK' });
                return false;
            }
            const names = visibleColumns().map(column => column.name.toLowerCase());
            if (new Set(names).size !== names.length) {
                await showMessageDialog({ title: 'Duplicate Field Name', message: 'Every field must have a unique name.', confirmText: 'OK' });
                return false;
            }
            const descriptions = changes.map(change => {
                if (change.deleted) return `Delete ${change.originalName} (all values in this field will be lost)`;
                if (change.isNew) return `Add ${change.name} as ${change.type}`;
                const original = originalColumns.find(column => column.originalName === change.originalName);
                const parts = [];
                if (change.name !== change.originalName) parts.push(`rename to ${change.name}`);
                if (original && change.type !== original.type) parts.push(`convert ${original.type} to ${change.type}; incompatible values may be lost`);
                return parts.length ? `${change.originalName}: ${parts.join(', ')}` : `Update properties for ${change.name}`;
            });
            const destructive = changes.some(change => change.deleted || (!change.isNew && originalColumns.find(column => column.originalName === change.originalName)?.type !== change.type));
            const confirmed = await showDesignSaveDialog(tableName, descriptions.length ? descriptions : ['Update table properties'], destructive);
            if (!confirmed) return false;
            try {
                status.textContent = 'Saving table design...';
                await postSchemaAction({ action: 'applyDesignChanges', table: tableName, columns: changes, tableProperties });
                databasePromise = null;
                status.textContent = 'Table design saved';
                return true;
            } catch (error) {
                await showMessageDialog({ title: 'Table Design Error', message: error.message || 'MariaDB could not apply the table changes.', confirmText: 'OK' });
                status.textContent = 'Table design was not saved';
                return false;
            }
        }

        function togglePropertySheet(force) {
            const sheet = view.querySelector('[data-property-sheet]');
            const layout = view.querySelector('.table-design-layout');
            const hide = typeof force === 'boolean' ? !force : !sheet.classList.contains('hidden');
            sheet.classList.toggle('hidden', hide);
            layout.classList.toggle('sheet-closed', hide);
        }

        view.innerHTML = `<div class="table-design-layout"><div class="table-design-main"><div class="table-design-grid-wrap">
            <table class="acaciadb-grid design-grid"><thead><tr><th class="row-head"></th><th>Field Name</th><th>Data Type</th><th>Description (Optional)</th></tr></thead><tbody data-design-body></tbody></table>
            </div><section class="field-properties"><div class="field-properties-title">Field Properties</div><div class="field-properties-body"><div class="field-properties-editor">
            <div class="field-tabs"><button type="button" class="active" data-field-tab="general">General</button><button type="button" data-field-tab="lookup">Lookup</button></div><div class="property-grid" data-field-property-grid></div>
            </div><p>Changes remain in Design View until you switch back to Datasheet View and confirm the save.</p></div></section></div>
            <aside class="property-sheet table-property-sheet" data-property-sheet><button class="property-close" type="button" title="Close Property Sheet"><i class="fas fa-times"></i></button><h2>Property Sheet</h2>
            <p>Selection type: Table Properties</p><div class="field-tabs"><button type="button" class="active">General</button></div><div class="property-grid" data-property-sheet-grid></div></aside></div>`;

        renderRows();
        renderFieldProperties();
        renderPropertySheet();

        view.addEventListener('click', event => {
            const row = event.target.closest('[data-design-row]');
            if (row) selectDesignRow(Number(row.dataset.designRow));
            const tab = event.target.closest('[data-field-tab]');
            if (tab && !tab.disabled) { activeFieldTab = tab.dataset.fieldTab; renderFieldProperties(); }
            if (event.target.closest('.property-close')) togglePropertySheet(false);
        });

        view.addEventListener('input', event => {
            const row = event.target.closest('[data-design-row]');
            const column = row ? columns[Number(row.dataset.designRow)] : selectedColumn();
            if (event.target.matches('[data-design-name]')) column.name = event.target.value.trim();
            if (event.target.matches('[data-design-comment]')) column.comment = event.target.value;
            const key = event.target.dataset.fieldProperty;
            if (key && column) {
                const value = event.target.value;
                if (key === 'required') column.required = value === 'Yes';
                else if (key === 'indexed') { column.indexed = value !== 'No'; column.unique = value === 'Yes (No Duplicates)'; }
                else if (['displayControl', 'rowSourceType', 'rowSource', 'boundColumn', 'columnCount', 'columnHeads', 'columnWidths', 'listRows', 'listWidth', 'limitToList', 'allowMultiple', 'allowValueListEdits', 'listItemsEditForm', 'showOnlyRowSourceValues'].includes(key)) {
                    column.lookup ||= { kind: 'static', mode: 'single', source: [], createdBy: 'designView' };
                    if (key === 'rowSourceType') {
                        column.lookup.kind = value === 'Table/Query' ? 'table' : 'static';
                        if (column.lookup.kind === 'table') column.lookup.keyColumn = '';
                    } else if (key === 'rowSource') {
                        column.lookup.rowSource = value;
                        if (column.lookup.kind === 'table') {
                            const [sourceObjectName, fields = ''] = value.split(';');
                            column.lookup.sourceObjectName = sourceObjectName.trim();
                            column.lookup.displayColumns = fields.split(',').map(item => item.trim()).filter(Boolean);
                            column.lookup.selectedFields = [...column.lookup.displayColumns];
                        } else {
                            column.lookup.source = value.split(';').map(item => item.trim()).filter(Boolean);
                        }
                    }
                    else if (key === 'allowMultiple') column.lookup.mode = value === 'Yes' ? 'multiple' : 'single';
                    else if (['columnHeads', 'limitToList', 'allowValueListEdits', 'showOnlyRowSourceValues'].includes(key)) column.lookup[key] = value === 'Yes';
                    else column.lookup[key] = ['boundColumn', 'columnCount', 'listRows'].includes(key) ? Number(value || 0) : value;
                    if (key === 'displayControl') renderFieldProperties();
                } else column[key] = value;
            }
            const tableKey = event.target.dataset.tableProperty;
            if (tableKey) tableProperties[tableKey] = event.target.value;
        });

        view.addEventListener('change', event => {
            const typeSelect = event.target.closest('[data-design-type]');
            if (!typeSelect) return;
            const column = columns[Number(typeSelect.closest('[data-design-row]').dataset.designRow)];
            column.type = typeSelect.value;
            if (!designLookupTypes.has(column.type)) column.lookup = null;
            renderFieldProperties();
        });

        view.addEventListener('contextmenu', event => {
            const head = event.target.closest('[data-design-row-head]');
            if (!head) return;
            event.preventDefault();
            const index = Number(head.dataset.designRowHead);
            selectDesignRow(index);
            showRowMenu(event, index);
        });

        document.addEventListener('click', event => {
            if (!event.target.closest('.design-row-menu')) document.querySelector('.design-row-menu')?.remove();
        });

        window.acaciadbActiveDesignController = { tableName, isDirty, saveDesign, togglePropertySheet };
    });
}
