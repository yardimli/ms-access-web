const tableDataTypes = [
    'Short Text',
    'Long Text',
    'HTML Text',
    'Number',
    'Large Number',
    'Date/Time',
    'Currency',
    'AutoNumber',
    'Yes/No',
    'OLE Object',
    'Hyperlink',
    'Attachment',
    'Lookup & Relationship',
    'Calculated',
    'Lookup Wizard...'
];

const fieldFormatOptions = {
    Number: ['General Number', 'Currency', 'Euro', 'Fixed', 'Standard', 'Percent', 'Scientific'],
    'Large Number': ['General Number', 'Currency', 'Euro', 'Fixed', 'Standard', 'Percent', 'Scientific'],
    Currency: ['General Number', 'Currency', 'Euro', 'Fixed', 'Standard', 'Percent', 'Scientific'],
    'Date/Time': ['General Date', 'Long Date', 'Medium Date', 'Short Date', 'Long Time', 'Medium Time', 'Short Time'],
    'Yes/No': ['True/False', 'Yes/No', 'On/Off']
};

const defaultFieldFormats = {
    Number: 'General Number',
    'Large Number': 'General Number',
    Currency: 'Currency',
    'Date/Time': 'General Date',
    'Yes/No': 'Yes/No'
};

function acaciadbTypeForColumn(column) {
    return column?.acaciadbType || column?.type || 'Short Text';
}

function isMemoColumn(column) {
    return ['Long Text', 'HTML Text', 'Rich Text'].includes(acaciadbTypeForColumn(column));
}

function fieldFormatForColumn(column) {
    const type = acaciadbTypeForColumn(column);
    return column?.acaciadbFormat || defaultFieldFormats[type] || 'Formatting';
}

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
                    <label><span>Data Type:</span><select data-field-data-type>${tableDataTypes.filter(type => !['Calculated', 'Lookup Wizard...'].includes(type)).map(type => `<option>${escapeHtml(type)}</option>`).join('')}</select></label>
                    <label data-field-format-row><span>Format:</span><select data-field-format></select></label>
                    <div class="fields-format-icons">
                        <button type="button" data-format-command="currency">${ribbonIcon('currency-symbol')}</button>
                        <button type="button" data-format-command="percent">${ribbonIcon('percent')}</button>
                        <button type="button" data-format-command="standard">${ribbonIcon('comma')}</button>
                        <button class="decimal-button" type="button" data-format-command="decimal-less">${decimalRibbonIcon('less')}</button>
                        <button class="decimal-button" type="button" data-format-command="decimal-more">${decimalRibbonIcon('more')}</button>
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

function updateFieldsRibbonState(column = window.acaciadbActiveTableColumn) {
    if (!ribbon?.querySelector?.('.fields-ribbon')) {
        return;
    }

    window.acaciadbActiveTableColumn = column || window.acaciadbActiveTableColumn || null;
    const activeColumn = window.acaciadbActiveTableColumn;
    const sizeRow = ribbon.querySelector('[data-field-size-row]');
    const sizeInput = ribbon.querySelector('[data-field-size-input]');
    const typeSelect = ribbon.querySelector('[data-field-data-type]');
    const formatRow = ribbon.querySelector('[data-field-format-row]');
    const formatSelect = ribbon.querySelector('[data-field-format]');
    const formatButtons = ribbon.querySelectorAll('[data-format-command]');
    const defaultButton = ribbon.querySelector('[data-command="default"]');
    const lookupButton = ribbon.querySelector('[data-command="lookup"]');
    const expressionButton = ribbon.querySelector('[data-command="expression"]');
    const memoButton = ribbon.querySelector('[data-command="memo"]');
    const isCalculated = acaciadbTypeForColumn(activeColumn) === 'Calculated Field' || Boolean(activeColumn?.calculatedJavascript);
    const isLookup = Boolean(activeColumn?.lookup);
    const protectedFieldSettings = Boolean(activeColumn?.primaryKey || isCalculated || isLookup);

    if (defaultButton) {
        defaultButton.classList.toggle('disabled', !activeColumn || isCalculated);
        if (!activeColumn || isCalculated) {
            defaultButton.setAttribute('disabled', 'disabled');
        } else {
            defaultButton.removeAttribute('disabled');
        }
    }

    if (expressionButton) {
        expressionButton.classList.toggle('disabled', !activeColumn || !isCalculated);
        if (!activeColumn || !isCalculated) {
            expressionButton.setAttribute('disabled', 'disabled');
        } else {
            expressionButton.removeAttribute('disabled');
        }
    }

    if (lookupButton) {
        lookupButton.classList.toggle('disabled', !activeColumn || !isLookup);
        if (!activeColumn || !isLookup) {
            lookupButton.setAttribute('disabled', 'disabled');
        } else {
            lookupButton.removeAttribute('disabled');
        }
    }

    if (memoButton) {
        const enabled = Boolean(activeColumn && isMemoColumn(activeColumn));
        memoButton.classList.toggle('disabled', !enabled);
        if (enabled) {
            memoButton.removeAttribute('disabled');
        } else {
            memoButton.setAttribute('disabled', 'disabled');
        }
    }

    if (typeSelect && activeColumn) {
        const acaciadbType = acaciadbTypeForColumn(activeColumn);
        typeSelect.value = tableDataTypes.includes(acaciadbType) ? acaciadbType : 'Short Text';
        typeSelect.disabled = Boolean(protectedFieldSettings || acaciadbType === 'Attachment');
    }

    if (formatRow && formatSelect) {
        const acaciadbType = acaciadbTypeForColumn(activeColumn);
        const options = fieldFormatOptions[acaciadbType] || [];
        const enabled = options.length > 0 && !protectedFieldSettings;
        formatRow.classList.toggle('disabled', !enabled);
        formatSelect.disabled = !enabled;
        formatSelect.innerHTML = enabled
            ? options.map(option => `<option>${escapeHtml(option)}</option>`).join('')
            : '<option>Formatting</option>';
        formatSelect.value = enabled && options.includes(fieldFormatForColumn(activeColumn))
            ? fieldFormatForColumn(activeColumn)
            : (enabled ? options[0] : 'Formatting');
        formatButtons.forEach(button => {
            const command = button.dataset.formatCommand;
            const isDecimal = command === 'decimal-less' || command === 'decimal-more';
            const buttonEnabled = ['Number', 'Large Number', 'Currency'].includes(acaciadbType)
                && (!isDecimal || acaciadbType !== 'Yes/No')
                && !protectedFieldSettings;
            button.disabled = !buttonEnabled;
            button.classList.toggle('disabled', !buttonEnabled);
        });
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
