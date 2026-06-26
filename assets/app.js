const ribbons = {
    home: [
        ['Views', [['grid', 'View', '@datasheet'], ['design', 'Design View', '@design']]],
        ['Clipboard', [['paste', 'Paste'], ['cut', 'Cut'], ['copy', 'Copy']]],
        ['Sort & Filter', [['filter', 'Filter'], ['sort-asc', 'Ascending'], ['sort-desc', 'Descending'], ['find', 'Find']]],
        ['Records', [['new', 'New'], ['delete', 'Delete'], ['refresh', 'Refresh']]],
        ['Text Formatting', [['bold', 'Bold'], ['italic', 'Italic'], ['align', 'Align']]]
    ],
    create: [
        ['Tables', [['table', 'Customers', 'table-customers'], ['design', 'Table Design', 'table-detail']]],
        ['Forms', [['form', 'Customer Orders', 'form-customer-orders'], ['form', 'Invoice Entry', 'form-invoice-entry']]],
        ['Queries', [['query', 'Open Orders', 'query-open-orders'], ['query', 'Sales Region', 'query-sales-region']]],
        ['Reports', [['report', 'Invoice Summary', 'report']]]
    ],
    external: [
        ['Import & Link', [['import', 'Saved Imports'], ['excel', 'Excel'], ['access', 'Access'], ['odbc', 'ODBC'], ['more', 'More']]],
        ['Export', [['export', 'Saved Exports'], ['excel', 'Excel'], ['text', 'Text File'], ['email', 'Email']]]
    ],
    database: [
        ['Tools', [['relationships', 'Relationships'], ['deps', 'Object Dependencies'], ['analyze', 'Analyze Table']]],
        ['Macro', [['code', 'Visual Basic'], ['run', 'Run Macro'], ['secure', 'Macro Security']]]
    ],
    fields: [
        ['Views', [['grid', 'View', '@datasheet'], ['design', 'Design View', '@design']]],
        ['Add & Delete', [['text-field', 'Short Text'], ['number', 'Number'], ['currency', 'Currency'], ['date', 'Date & Time'], ['yes-no', 'Yes/No'], ['more-fields', 'More Fields'], ['delete', 'Delete']]],
        ['Properties', [['caption', 'Name & Caption'], ['default', 'Default Value'], ['field-size', 'Field Size'], ['lookup', 'Modify Lookups'], ['expression', 'Modify Expression'], ['memo', 'Memo Settings']]],
        ['Formatting', [['data-type', 'Data Type: AutoNumber'], ['format', 'Format: Formatting'], ['currency-symbol', '$'], ['percent', '%'], ['comma', ','], ['decimal-less', '.00 -> .0'], ['decimal-more', '.0 -> .00']]],
        ['Field Validation', [['required', 'Required'], ['unique', 'Unique'], ['indexed', 'Indexed'], ['validation', 'Validation']]]
    ],
    table: [
        ['Properties', [['properties', 'Table Properties']]],
        ['Before Events', [['before-change', 'Before Change'], ['before-delete', 'Before Delete']]],
        ['After Events', [['after-insert', 'After Insert'], ['after-update', 'After Update'], ['after-delete', 'After Delete']]],
        ['Named Macros', [['macro', 'Named Macro']]],
        ['Relationships', [['relationships', 'Relationships'], ['deps', 'Object Dependencies']]]
    ],
    'table-design': [
        ['Views', [['grid', 'View', '@datasheet']]],
        ['Tools', [['primary-key', 'Primary Key'], ['builder', 'Builder'], ['test-validation', 'Test Validation Rules']]],
        ['Rows', [['insert-row', 'Insert Rows'], ['delete', 'Delete Rows'], ['lookup', 'Modify Lookups']]],
        ['Show/Hide', [['properties', 'Property Sheet'], ['index', 'Indexes']]],
        ['Field, Record & Table Events', [['macro', 'Create Data Macros'], ['rename', 'Rename/Delete Macro']]],
        ['Relationships', [['relationships', 'Relationships'], ['deps', 'Object Dependencies']]]
    ],
    file: [
        ['Backstage', [['save', 'Save'], ['save-as', 'Save As'], ['print', 'Print'], ['options', 'Options']]]
    ],
    help: [
        ['Help', [['find', 'Search Help'], ['options', 'Access Options'], ['secure', 'Privacy']]]
    ]
};

const viewTitles = {
    'table-customers': 'Customers',
    'table-orders': 'Orders',
    'table-order-items': 'OrderItems',
    'table-products': 'Products',
    'table-regions': 'Regions',
    'table-sales-targets': 'SalesTargets',
    'design-customers': 'Customers',
    'design-orders': 'Orders',
    'design-order-items': 'OrderItems',
    'design-products': 'Products',
    'design-regions': 'Regions',
    'design-sales-targets': 'SalesTargets',
    'table-detail': 'Customers',
    'form-customer-orders': 'CustomerOrders',
    'form-invoice-entry': 'InvoiceEntry',
    'design-form-customer-orders': 'CustomerOrders',
    'design-form-invoice-entry': 'InvoiceEntry',
    'query-open-orders': 'OpenOrders',
    'query-sales-region': 'SalesByRegion',
    report: 'InvoiceSummary'
};

const content = document.querySelector('#content');
const ribbon = document.querySelector('#ribbon');
const tabs = document.querySelector('#document-tabs');
const status = document.querySelector('#view-status');
const app = document.querySelector('#access-app');
const workspaceMain = document.querySelector('#workspace-main');
const objectPane = document.querySelector('#object-pane');
const contextualToolsLabel = document.querySelector('#contextual-tools-label');
const tableToolsTabs = document.querySelector('#table-tools-tabs');
const formToolsTabs = document.querySelector('#form-tools-tabs');
const objectList = document.querySelector('#object-list');
const statusViewButtons = document.querySelector('#status-view-buttons');

let databasePromise = null;
let currentView = app.dataset.initialView || 'table-customers';
let openTabs = [];
let currentRibbon = 'home';
let moreFieldsMenu = null;
let createMenu = null;
let statusModeOverride = null;

const moreFieldsGroups = [
    ['Basic Types', [
        ['rich-text', 'Rich Text'],
        ['attachment', 'Attachment'],
        ['hyperlink', 'Hyperlink'],
        ['long-text', 'Long Text'],
        ['lookup', 'Lookup & Relationship']
    ]],
    ['Number', [
        ['number', 'General'],
        ['currency', 'Currency'],
        ['euro', 'Euro'],
        ['number', 'Fixed'],
        ['number', 'Standard'],
        ['scientific', 'Scientific']
    ]],
    ['Large Number', [
        ['number', 'General'],
        ['number', 'Fixed'],
        ['number', 'Standard'],
        ['scientific', 'Scientific']
    ]],
    ['Date and Time', [
        ['short-date', 'Short Date'],
        ['short-date', 'Medium Date'],
        ['short-date', 'Long Date'],
        ['time', 'Time am/pm'],
        ['time', 'Medium Time'],
        ['time', 'Time 24hour']
    ]],
    ['Yes/No', [
        ['checkbox', 'Check Box'],
        ['checkbox', 'Yes/No'],
        ['checkbox', 'True/False'],
        ['checkbox', 'On/Off']
    ]],
    ['Quick Start', [
        ['quick-start', 'Address'],
        ['quick-start', 'Category'],
        ['quick-start', 'Name'],
        ['calculated', 'Calculated Field'],
        ['save-as', 'Save Selection as New Data Type']
    ]]
];

const createDropdowns = {
    navigation: [
        ['navigation', 'Horizontal Tabs'],
        ['navigation', 'Vertical Tabs, Left'],
        ['navigation', 'Vertical Tabs, Right'],
        ['navigation', 'Horizontal Tabs, 2 Levels'],
        ['navigation', 'Horizontal Tabs and Vertical Tabs, Left'],
        ['navigation', 'Horizontal Tabs and Vertical Tabs, Right']
    ],
    'more-forms': [
        ['form', 'Multiple Items'],
        ['table', 'Datasheet'],
        ['split-form', 'Split Form'],
        ['modal-dialog', 'Modal Dialog']
    ]
};

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

let tableViewPairs = {};
let designViewPairs = {};
let formViewPairs = {};
let formDesignViewPairs = {};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function objectSlug(name) {
    return String(name ?? '')
        .replace(/(?!^)([A-Z])/g, '-$1')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function titleFromObjectName(name) {
    return String(name ?? '').replace(/(?!^)([A-Z])/g, ' $1').replace(/_/g, ' ');
}

function formatValue(value, type) {
    if (value === null || value === undefined) {
        return '';
    }

    if (type === 'Currency') {
        return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }

    return String(value);
}

function getDatabase() {
    if (!databasePromise) {
        databasePromise = fetch('api/database.php', { cache: 'no-store' }).then(response => {
            if (!response.ok) {
                throw new Error('Unable to load database from MariaDB');
            }
            return response.json();
        });
    }

    return databasePromise;
}

function mergeViewData(db, data = {}) {
    db.tables = { ...(db.tables || {}), ...(data.tables || {}) };
    db.forms = { ...(db.forms || {}), ...(data.forms || {}) };
    db.queries = { ...(db.queries || {}), ...(data.queries || {}) };
    db.reports = { ...(db.reports || {}), ...(data.reports || {}) };
    normalizeDatabaseReferences(db);
    return db;
}

function resolveTableName(db, tableName) {
    const tables = db.tables || {};
    if (tables[tableName]) {
        return tableName;
    }

    const lower = String(tableName || '').toLowerCase();
    return Object.keys(tables).find(name => name.toLowerCase() === lower) || tableName;
}

function normalizeFieldRef(db, ref) {
    const [tableName, fieldName] = String(ref || '').split('.');
    if (!tableName || !fieldName) {
        return ref;
    }

    return `${resolveTableName(db, tableName)}.${fieldName}`;
}

function normalizeDatabaseReferences(db) {
    Object.values(db.forms || {}).forEach(form => {
        form.parentTable = resolveTableName(db, form.parentTable);
        if (form.subform?.table) {
            form.subform.table = resolveTableName(db, form.subform.table);
        }
    });

    Object.values(db.queries || {}).forEach(query => {
        query.tables = (query.tables || []).map(table => resolveTableName(db, table));
        query.connections = (query.connections || []).map(connection => ({
            ...connection,
            from: normalizeFieldRef(db, connection.from),
            to: normalizeFieldRef(db, connection.to)
        }));
        query.fields = (query.fields || []).map(field => ({
            ...field,
            table: resolveTableName(db, field.table)
        }));
    });

    return db;
}

function getDefinitionByName(collection, name) {
    if (!collection) {
        return null;
    }

    if (collection[name]) {
        return collection[name];
    }

    const lower = String(name || '').toLowerCase();
    const key = Object.keys(collection).find(item => item.toLowerCase() === lower);
    return key ? collection[key] : null;
}

function registerView(view, title) {
    viewTitles[view] = title;
}

function configureObjectMaps(db) {
    tableViewPairs = {};
    designViewPairs = {};
    formViewPairs = {};
    formDesignViewPairs = {};

    Object.keys(db.tables || {}).forEach(tableName => {
        const slug = objectSlug(tableName);
        const tableView = `table-${slug}`;
        const designView = `design-${slug}`;
        tableViewPairs[tableView] = designView;
        designViewPairs[designView] = tableView;
        registerView(tableView, tableName);
        registerView(designView, tableName);
    });

    Object.keys(db.forms || {}).forEach(formName => {
        const slug = objectSlug(formName);
        const formView = `form-${slug}`;
        const designView = `design-form-${slug}`;
        formViewPairs[formView] = designView;
        formDesignViewPairs[designView] = formView;
        registerView(formView, formName);
        registerView(designView, formName);
    });

    Object.keys(db.queries || {}).forEach(queryName => {
        registerView(`query-${objectSlug(queryName)}`, queryName);
    });

    Object.keys(db.reports || {}).forEach(reportName => {
        registerView(`report-${objectSlug(reportName)}`, reportName);
    });
}

function objectSectionMarkup(title, items, iconClass, iconTypeClass) {
    return `
        <div class="object-section">
            <div class="object-heading">
                <span>${escapeHtml(title)}</span>
                <button class="object-toggle" type="button" aria-label="Collapse ${escapeHtml(title)}" aria-expanded="true"><i class="fas fa-chevron-up"></i></button>
            </div>
            ${items.map(item => `
                <button class="object-link" data-view="${escapeHtml(item.view)}">
                    <i class="${iconClass} ${iconTypeClass}"></i>${escapeHtml(item.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderObjectList(db) {
    const tables = Object.keys(db.tables || {}).map(tableName => ({
        view: `table-${objectSlug(tableName)}`,
        label: tableName
    }));
    const forms = Object.keys(db.forms || {}).map(formName => ({
        view: `form-${objectSlug(formName)}`,
        label: formName
    }));
    const queries = Object.keys(db.queries || {}).map(queryName => ({
        view: `query-${objectSlug(queryName)}`,
        label: queryName
    }));
    const reports = Object.keys(db.reports || {}).map(reportName => ({
        view: `report-${objectSlug(reportName)}`,
        label: reportName
    }));

    objectList.innerHTML = [
        objectSectionMarkup('Tables', tables, 'fas fa-table', 'table-icon'),
        objectSectionMarkup('Forms', forms, 'fas fa-window-restore', 'form-icon'),
        objectSectionMarkup('Queries', queries, 'fas fa-project-diagram', 'query-icon'),
        objectSectionMarkup('Reports', reports, 'fas fa-file-alt', 'report-icon')
    ].join('');
}

function ribbonIcon(name) {
    const map = {
        grid: 'fas fa-table',
        table: 'fas fa-table',
        design: 'fas fa-pencil-ruler',
        paste: 'fas fa-paste',
        cut: 'fas fa-cut',
        copy: 'fas fa-copy',
        filter: 'fas fa-filter',
        'sort-asc': 'fas fa-sort-alpha-down',
        'sort-desc': 'fas fa-sort-alpha-up-alt',
        find: 'fas fa-search',
        new: 'fas fa-plus-square',
        delete: 'fas fa-trash-alt',
        refresh: 'fas fa-sync-alt',
        bold: 'fas fa-bold',
        italic: 'fas fa-italic',
        align: 'fas fa-align-left',
        form: 'fas fa-window-restore',
        'form-design': 'fas fa-pencil-ruler',
        'blank-form': 'far fa-window-maximize',
        'form-wizard': 'fas fa-magic',
        navigation: 'far fa-window-restore',
        'more-forms': 'fas fa-caret-square-down',
        'split-form': 'fas fa-columns',
        'modal-dialog': 'far fa-window-maximize',
        themes: 'fas fa-palette',
        colors: 'fas fa-th-large',
        font: 'fas fa-font',
        pointer: 'fas fa-mouse-pointer',
        label: 'fas fa-font',
        'button-control': 'far fa-square',
        folder: 'far fa-folder',
        'web-browser': 'fas fa-globe',
        subform: 'far fa-window-restore',
        image: 'far fa-image',
        chart: 'fas fa-chart-bar',
        logo: 'far fa-image',
        title: 'far fa-file-alt',
        'add-fields': 'fas fa-columns',
        'tab-order': 'fas fa-sort-numeric-down',
        gridlines: 'fas fa-border-all',
        stacked: 'fas fa-th-list',
        tabular: 'fas fa-table',
        'remove-layout': 'fas fa-eraser',
        'insert-above': 'fas fa-arrow-up',
        'insert-below': 'fas fa-arrow-down',
        'insert-left': 'fas fa-arrow-left',
        'insert-right': 'fas fa-arrow-right',
        'select-layout': 'far fa-object-group',
        'select-column': 'fas fa-columns',
        merge: 'fas fa-compress-arrows-alt',
        'split-vertical': 'fas fa-columns',
        'split-horizontal': 'fas fa-grip-lines',
        'move-up': 'fas fa-arrow-up',
        'move-down': 'fas fa-arrow-down',
        margins: 'fas fa-text-width',
        padding: 'fas fa-border-style',
        anchoring: 'fas fa-anchor',
        'size-space': 'fas fa-arrows-alt',
        'bring-front': 'fas fa-clone',
        'send-back': 'far fa-clone',
        'select-all': 'fas fa-mouse-pointer',
        'alternate-row': 'fas fa-fill-drip',
        'quick-styles': 'fas fa-paint-brush',
        'change-shape': 'fas fa-shapes',
        conditional: 'fas fa-list-ol',
        'shape-fill': 'fas fa-fill',
        'shape-outline': 'far fa-square',
        'shape-effects': 'fas fa-magic',
        report: 'fas fa-file-alt',
        'report-design': 'fas fa-chart-bar',
        'blank-report': 'far fa-file',
        'report-wizard': 'fas fa-magic',
        labels: 'fas fa-tags',
        query: 'fas fa-project-diagram',
        'query-wizard': 'fas fa-magic',
        sharepoint: 'fas fa-list-alt',
        module: 'fas fa-cubes',
        'class-module': 'fas fa-code-branch',
        relationships: 'fas fa-link',
        excel: 'fas fa-file-excel',
        access: 'fas fa-database',
        odbc: 'fas fa-server',
        import: 'fas fa-file-import',
        export: 'fas fa-file-export',
        text: 'fas fa-file-alt',
        email: 'fas fa-envelope',
        more: 'fas fa-ellipsis-h',
        deps: 'fas fa-sitemap',
        analyze: 'fas fa-chart-line',
        code: 'fas fa-code',
        run: 'fas fa-play-circle',
        secure: 'fas fa-shield-alt',
        'text-field': 'fas fa-font',
        number: 'fas fa-sort-numeric-down',
        currency: 'fas fa-dollar-sign',
        caption: 'fas fa-heading',
        required: 'fas fa-exclamation-circle',
        unique: 'fas fa-check',
        validation: 'fas fa-check-square',
        default: 'fas fa-clipboard-list',
        'field-size': 'fas fa-text-width',
        date: 'fas fa-calendar-alt',
        'yes-no': 'fas fa-check-square',
        'more-fields': 'fas fa-list',
        'rich-text': 'fas fa-italic',
        attachment: 'fas fa-paperclip',
        hyperlink: 'fas fa-globe',
        'long-text': 'fas fa-font',
        euro: 'fas fa-euro-sign',
        scientific: 'fas fa-superscript',
        'short-date': 'far fa-calendar-alt',
        time: 'far fa-clock',
        checkbox: 'far fa-check-square',
        'quick-start': 'fas fa-magic',
        calculated: 'fas fa-calculator',
        expression: 'fas fa-function',
        memo: 'fas fa-align-left',
        'data-type': 'fas fa-list-alt',
        format: 'fas fa-font',
        'currency-symbol': 'fas fa-dollar-sign',
        percent: 'fas fa-percent',
        comma: 'fas fa-quote-right',
        'decimal-less': 'fas fa-angle-left',
        'decimal-more': 'fas fa-angle-right',
        indexed: 'fas fa-check-square',
        properties: 'fas fa-list-alt',
        index: 'fas fa-bolt',
        macro: 'fas fa-bolt',
        rename: 'fas fa-i-cursor',
        'before-change': 'fas fa-check',
        'before-delete': 'fas fa-trash-alt',
        'after-insert': 'fas fa-plus-square',
        'after-update': 'fas fa-sync-alt',
        'after-delete': 'fas fa-times-circle',
        'primary-key': 'fas fa-key',
        builder: 'fas fa-magic',
        'test-validation': 'fas fa-clipboard-check',
        'insert-row': 'fas fa-plus-square',
        lookup: 'fas fa-search-plus',
        save: 'fas fa-save',
        'save-as': 'fas fa-save',
        print: 'fas fa-print',
        options: 'fas fa-cog'
    };

    return `<i class="${map[name] || map.more}" aria-hidden="true"></i>`;
}

function closeMoreFieldsMenu() {
    moreFieldsMenu?.remove();
    moreFieldsMenu = null;
    document.querySelector('[data-command="more-fields"]')?.classList.remove('active');
}

function closeCreateMenu() {
    createMenu?.remove();
    createMenu = null;
    document.querySelector('.create-command.active, .create-mini.active')?.classList.remove('active');
}

function buildMoreFieldsMenu() {
    return `
        <div class="more-fields-scroll">
            ${moreFieldsGroups.map(([group, items]) => `
                <section class="more-fields-group">
                    <h3>${escapeHtml(group)}</h3>
                    ${items.map(([icon, label]) => `
                        <button class="more-fields-item" type="button" data-more-field="${escapeHtml(label)}">
                            <span class="more-fields-icon">${ribbonIcon(icon)}</span>
                            <span>${escapeHtml(label)}</span>
                            ${label === 'Calculated Field' ? '<i class="fas fa-caret-right more-fields-arrow"></i>' : ''}
                        </button>
                    `).join('')}
                </section>
            `).join('')}
        </div>
    `;
}

function openMoreFieldsMenu(button) {
    if (moreFieldsMenu && moreFieldsMenu.dataset.owner === 'more-fields') {
        closeMoreFieldsMenu();
        return;
    }

    closeMoreFieldsMenu();
    const box = button.getBoundingClientRect();
    moreFieldsMenu = document.createElement('div');
    moreFieldsMenu.className = 'more-fields-menu';
    moreFieldsMenu.dataset.owner = 'more-fields';
    moreFieldsMenu.innerHTML = buildMoreFieldsMenu();
    document.body.appendChild(moreFieldsMenu);

    const menuWidth = moreFieldsMenu.offsetWidth;
    const left = Math.min(box.left, window.innerWidth - menuWidth - 8);
    const top = box.bottom + 2;
    moreFieldsMenu.style.left = `${Math.max(4, left)}px`;
    moreFieldsMenu.style.top = `${top}px`;
    moreFieldsMenu.style.maxHeight = `${Math.max(260, window.innerHeight - top - 8)}px`;
    button.classList.add('active');
}

function buildCreateMenu(items) {
    return `
        <div class="create-menu-list">
            ${items.map(([icon, label]) => `
                <button class="create-menu-item" type="button">
                    <span>${ribbonIcon(icon)}</span>
                    <strong>${escapeHtml(label)}</strong>
                </button>
            `).join('')}
        </div>
    `;
}

function openCreateMenu(button, key) {
    if (createMenu?.dataset.owner === key) {
        closeCreateMenu();
        return;
    }

    closeCreateMenu();
    const items = createDropdowns[key] || [];
    const box = button.getBoundingClientRect();
    createMenu = document.createElement('div');
    createMenu.className = 'create-menu';
    createMenu.dataset.owner = key;
    createMenu.innerHTML = buildCreateMenu(items);
    document.body.appendChild(createMenu);
    createMenu.style.left = `${Math.max(4, Math.min(box.left, window.innerWidth - createMenu.offsetWidth - 8))}px`;
    createMenu.style.top = `${box.bottom + 1}px`;
    button.classList.add('active');
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

function createCommand(icon, label, options = {}) {
    return `
        <button class="create-command" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-create-menu="${options.menu}"` : ''}>
            <span class="create-command-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function createMini(icon, label, options = {}) {
    return `
        <button class="create-mini" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-create-menu="${options.menu}"` : ''}>
            <span>${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function renderCreateRibbon() {
    closeCreateMenu();
    ribbon.innerHTML = `
        <div class="create-ribbon">
            <div class="create-group" data-label="Tables">
                ${createCommand('table', 'Table')}
                ${createCommand('design', 'Table Design', { view: 'table-detail' })}
                ${createCommand('sharepoint', 'SharePoint Lists', { caret: true })}
            </div>
            <div class="create-group" data-label="Queries">
                ${createCommand('query-wizard', 'Query Wizard')}
                ${createCommand('query', 'Query Design', { view: 'query-sales-by-region' })}
            </div>
            <div class="create-group create-forms-group" data-label="Forms">
                ${createCommand('form', 'Form')}
                ${createCommand('form-design', 'Form Design')}
                ${createCommand('blank-form', 'Blank Form')}
                <div class="create-stack">
                    ${createMini('form-wizard', 'Form Wizard')}
                    ${createMini('navigation', 'Navigation', { caret: true, menu: 'navigation' })}
                    ${createMini('more-forms', 'More Forms', { caret: true, menu: 'more-forms' })}
                </div>
            </div>
            <div class="create-group create-reports-group" data-label="Reports">
                ${createCommand('report', 'Report')}
                ${createCommand('report-design', 'Report Design')}
                ${createCommand('blank-report', 'Blank Report')}
                <div class="create-stack">
                    ${createMini('report-wizard', 'Report Wizard')}
                    ${createMini('labels', 'Labels')}
                </div>
            </div>
            <div class="create-group" data-label="Macros & Code">
                ${createCommand('macro', 'Macro')}
                <div class="create-stack">
                    ${createMini('module', 'Module')}
                    ${createMini('class-module', 'Class Module')}
                    ${createMini('code', 'Visual Basic')}
                </div>
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

function formRibbonCommand(icon, label, options = {}) {
    return `
        <button class="form-ribbon-command" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''}>
            <span class="form-ribbon-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function formRibbonMini(icon, label, options = {}) {
    return `
        <button class="form-ribbon-mini" type="button" data-command="${escapeHtml(icon)}">
            <span>${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function renderFormDesignRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Views">${formRibbonCommand('grid', 'View', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Themes">
                ${formRibbonCommand('themes', 'Themes', { caret: true })}
                <div class="form-ribbon-stack">
                    ${formRibbonMini('colors', 'Colors', { caret: true })}
                    ${formRibbonMini('font', 'Fonts', { caret: true })}
                </div>
            </div>
            <div class="form-ribbon-group form-controls-group" data-label="Controls">
                ${formRibbonCommand('pointer', 'Select')}
                ${formRibbonCommand('text-field', 'Text Box')}
                ${formRibbonCommand('label', 'Label')}
                ${formRibbonCommand('button-control', 'Button')}
                ${formRibbonCommand('folder', 'Tab')}
                ${formRibbonCommand('hyperlink', 'Hyperlink')}
                ${formRibbonCommand('web-browser', 'Web Browser')}
                ${formRibbonCommand('subform', 'Subform')}
                ${formRibbonCommand('image', 'Insert Image', { caret: true })}
                ${formRibbonCommand('chart', 'Insert Modern Chart', { caret: true })}
            </div>
            <div class="form-ribbon-group" data-label="Header / Footer">
                <div class="form-ribbon-stack">
                    ${formRibbonMini('logo', 'Logo')}
                    ${formRibbonMini('title', 'Title')}
                    ${formRibbonMini('date', 'Date and Time')}
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Tools">
                ${formRibbonCommand('add-fields', 'Add Existing Fields')}
                ${formRibbonCommand('properties', 'Property Sheet')}
                ${formRibbonCommand('tab-order', 'Tab Order')}
                ${formRibbonCommand('chart', 'Chart Settings')}
            </div>
        </div>
    `;
}

function renderFormArrangeRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Table">
                ${formRibbonCommand('gridlines', 'Gridlines', { caret: true })}
                ${formRibbonCommand('stacked', 'Stacked')}
                ${formRibbonCommand('tabular', 'Tabular')}
                ${formRibbonCommand('remove-layout', 'Remove Layout')}
            </div>
            <div class="form-ribbon-group" data-label="Rows & Columns">
                <div class="form-ribbon-stack">
                    ${formRibbonMini('insert-above', 'Insert Above')}
                    ${formRibbonMini('insert-below', 'Insert Below')}
                    ${formRibbonMini('insert-left', 'Insert Left')}
                </div>
                <div class="form-ribbon-stack">
                    ${formRibbonMini('insert-right', 'Insert Right')}
                    ${formRibbonMini('select-layout', 'Select Layout')}
                    ${formRibbonMini('select-column', 'Select Column')}
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Merge / Split">${formRibbonCommand('merge', 'Merge')}${formRibbonCommand('split-vertical', 'Split Vertically')}${formRibbonCommand('split-horizontal', 'Split Horizontally')}</div>
            <div class="form-ribbon-group" data-label="Move">${formRibbonCommand('move-up', 'Move Up')}${formRibbonCommand('move-down', 'Move Down')}</div>
            <div class="form-ribbon-group" data-label="Position">${formRibbonCommand('margins', 'Control Margins', { caret: true })}${formRibbonCommand('padding', 'Control Padding', { caret: true })}${formRibbonCommand('anchoring', 'Anchoring', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Sizing & Ordering">${formRibbonCommand('size-space', 'Size/Space', { caret: true })}${formRibbonCommand('align', 'Align', { caret: true })}${formRibbonCommand('bring-front', 'Bring to Front')}${formRibbonCommand('send-back', 'Send to Back')}</div>
        </div>
    `;
}

function renderFormFormatRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Selection">
                <div class="form-selection-box"><i class="fas fa-sliders-h"></i><select><option>Form</option><option>Detail</option><option>Text Box</option></select></div>
                ${formRibbonMini('select-all', 'Select All')}
            </div>
            <div class="form-ribbon-group" data-label="Font">
                <div class="form-ribbon-stack wide">
                    <select><option>Calibri</option></select>
                    <select><option>11</option></select>
                    <div class="mini-icon-row"><button>B</button><button><i>I</i></button><button><u>U</u></button><button>A</button></div>
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Number">
                <select><option>Formatting</option></select>
                <div class="mini-icon-row"><button>$</button><button>%</button><button>,</button><button>.0</button><button>.00</button></div>
            </div>
            <div class="form-ribbon-group" data-label="Background">${formRibbonCommand('image', 'Background Image', { caret: true })}${formRibbonCommand('alternate-row', 'Alternate Row Color', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Control Formatting">${formRibbonCommand('quick-styles', 'Quick Styles')}${formRibbonCommand('change-shape', 'Change Shape')}${formRibbonCommand('conditional', 'Conditional Formatting')}${formRibbonCommand('shape-fill', 'Shape Fill')}${formRibbonCommand('shape-outline', 'Shape Outline')}${formRibbonCommand('shape-effects', 'Shape Effects')}</div>
        </div>
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
                    <div class="fields-mini disabled">
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

function renderRibbon(name) {
    closeMoreFieldsMenu();
    closeCreateMenu();
    if (name === 'create') {
        renderCreateRibbon();
        return;
    }

    if (name === 'fields') {
        renderFieldsRibbon();
        return;
    }

    if (name === 'table-design') {
        renderTableDesignRibbon();
        return;
    }

    if (name === 'form-design') {
        renderFormDesignRibbon();
        return;
    }

    if (name === 'form-arrange') {
        renderFormArrangeRibbon();
        return;
    }

    if (name === 'form-format') {
        renderFormFormatRibbon();
        return;
    }

    const groups = ribbons[name] || ribbons.home;
    ribbon.innerHTML = `<div class="ribbon-content">${groups.map(([label, commands]) => `
        <div class="ribbon-group" data-label="${label}">
            ${commands.map(([icon, text, view]) => `
                <button class="ribbon-command" data-command="${escapeHtml(icon)}" ${view ? `data-view="${view}"` : ''}>
                    <span class="icon">${ribbonIcon(icon)}</span>
                    <span>${escapeHtml(text)}</span>
                </button>
            `).join('')}
        </div>
    `).join('')}</div>`;
}

function isTableDatasheetView(view) {
    return Object.prototype.hasOwnProperty.call(tableViewPairs, view);
}

function isTableDesignView(view) {
    return Object.prototype.hasOwnProperty.call(designViewPairs, view);
}

function updateContextualRibbon(view) {
    const tableDatasheet = isTableDatasheetView(view);
    const tableDesign = isTableDesignView(view);
    const showTableTools = tableDatasheet || tableDesign;
    const formDesign = view.startsWith('design-form-');

    contextualToolsLabel.textContent = formDesign ? 'Form Design Tools' : 'Table Tools';
    contextualToolsLabel?.classList.toggle('hidden', !showTableTools && !formDesign);
    tableToolsTabs?.classList.toggle('hidden', !showTableTools);
    formToolsTabs?.classList.toggle('hidden', !formDesign);
    document.querySelectorAll('[data-table-context="datasheet"]').forEach(tab => {
        tab.classList.toggle('hidden', !tableDatasheet);
    });
    document.querySelectorAll('[data-table-context="design"]').forEach(tab => {
        tab.classList.toggle('hidden', !tableDesign);
    });

    if (tableDesign && currentRibbon !== 'table-design') {
        activateRibbonTab('table-design');
        return;
    }

    if (formDesign && !['form-design', 'form-arrange', 'form-format'].includes(currentRibbon)) {
        activateRibbonTab('form-design');
        return;
    }

    if (tableDatasheet && !['fields', 'table'].includes(currentRibbon)) {
        activateRibbonTab('fields');
        return;
    }

    if (!showTableTools && !formDesign && ['fields', 'table', 'table-design', 'form-design', 'form-arrange', 'form-format'].includes(currentRibbon)) {
        activateRibbonTab('home');
    }
}

function activateRibbonTab(name) {
    currentRibbon = name;
    document.querySelectorAll('.ribbon-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.ribbon === name);
    });
    renderRibbon(name);
}

function setActiveObject(view) {
    const objectView = designViewPairs[view] || formDesignViewPairs[view] || view;
    document.querySelectorAll('.object-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === objectView);
    });
}

function findTabIndex(view) {
    return openTabs.findIndex(tab => tab.view === view);
}

function objectTabKey(view) {
    if (designViewPairs[view]) {
        return designViewPairs[view];
    }

    if (tableViewPairs[view]) {
        return view;
    }

    if (formDesignViewPairs[view]) {
        return formDesignViewPairs[view];
    }

    if (formViewPairs[view]) {
        return view;
    }

    return view;
}

function findOpenObjectTab(view) {
    const objectKey = objectTabKey(view);
    return openTabs.find(tab => objectTabKey(tab.view) === objectKey);
}

function activeObjectKind(view = currentView) {
    if (isTableDatasheetView(view) || isTableDesignView(view)) return 'table';
    if (view.startsWith('form-') || view.startsWith('design-form-')) return 'form';
    if (view.startsWith('query-')) return 'query';
    if (view === 'report' || view.startsWith('report-')) return 'report';
    return 'object';
}

function activeViewMode(view = currentView) {
    if (isTableDesignView(view)) return 'design';
    if (isTableDatasheetView(view)) return 'datasheet';
    if (view.startsWith('design-form-')) return 'design';
    if (view.startsWith('form-')) return statusModeOverride || 'form';
    if (view.startsWith('query-')) return statusModeOverride || 'design';
    if (view === 'report' || view.startsWith('report-')) return statusModeOverride || 'report';
    return '';
}

function statusModesForCurrentView() {
    const kind = activeObjectKind();
    if (kind === 'table') {
        return [
            ['datasheet', 'Datasheet View', 'fas fa-table'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    if (kind === 'form') {
        return [
            ['form', 'Form View', 'fas fa-window-restore'],
            ['layout', 'Layout View', 'fas fa-object-group'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    if (kind === 'query') {
        return [
            ['datasheet', 'Datasheet View', 'fas fa-table'],
            ['sql', 'SQL View', 'fas fa-code'],
            ['design', 'Design View', 'fas fa-project-diagram']
        ];
    }
    if (kind === 'report') {
        return [
            ['report', 'Report View', 'fas fa-file-alt'],
            ['print', 'Print Preview', 'fas fa-search-plus'],
            ['layout', 'Layout View', 'fas fa-object-group'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    return [];
}

function renderStatusViewButtons() {
    const modes = statusModesForCurrentView();
    const active = activeViewMode();
    statusViewButtons.innerHTML = modes.map(([mode, label, icon]) => `
        <button class="status-view-btn ${mode === active ? 'active' : ''}" type="button" data-status-view="${mode}" title="${escapeHtml(label)}">
            <i class="${icon}"></i>
        </button>
    `).join('');
}

function setSoftViewMode(mode, label) {
    statusModeOverride = mode;
    status.textContent = label;
    renderStatusViewButtons();
}

function activateStatusView(mode) {
    const kind = activeObjectKind();
    if ((kind === 'table' || kind === 'form') && mode === 'design') {
        statusModeOverride = null;
        switchTableMode('design');
        return;
    }
    if ((kind === 'table' && mode === 'datasheet') || (kind === 'form' && mode === 'form')) {
        statusModeOverride = null;
        switchTableMode('datasheet');
        return;
    }

    const label = statusModesForCurrentView().find(([value]) => value === mode)?.[1] || 'Ready';
    setSoftViewMode(mode, label);
}

function getTabIcon(view) {
    if (view.startsWith('table-') || view.startsWith('design-') && !view.startsWith('design-form-')) {
        return 'fas fa-table tab-icon-table';
    }

    if (view.startsWith('form-') || view.startsWith('design-form-')) {
        return 'fas fa-window-restore tab-icon-form';
    }

    if (view.startsWith('query-')) {
        return 'fas fa-project-diagram tab-icon-query';
    }

    if (view === 'report' || view.startsWith('report-')) {
        return 'fas fa-file-alt tab-icon-report';
    }

    return 'fas fa-file tab-icon-file';
}

function renderDocumentTabs() {
    if (!openTabs.length) {
        tabs.innerHTML = '';
        return;
    }

    tabs.innerHTML = `
        <div class="doc-tab-strip">
            ${openTabs.map(tab => `
                <button class="doc-tab ${tab.view === currentView ? 'active' : ''}" data-tab-view="${escapeHtml(tab.view)}">
                    <i class="${getTabIcon(tab.view)}"></i>
                    <span>${escapeHtml(tab.title)}</span>
                </button>
            `).join('')}
        </div>
        <button class="doc-close ml-auto mr-2 self-center" title="Close active tab"><i class="fas fa-times"></i></button>
    `;
}

function templateIdForView(view) {
    if (view.type === 'table' && view.mode === 'design') return 'template-table-design';
    if (view.type === 'table') return 'template-table-datasheet';
    if (view.type === 'form' && view.mode === 'design') return 'template-form-design';
    if (view.type === 'form') return 'template-form-view';
    if (view.type === 'query') return 'template-query-builder';
    if (view.type === 'report') return 'template-report-view';
    return '';
}

function renderViewTemplate(view) {
    const template = document.querySelector(`#${templateIdForView(view)}`);
    if (!template) {
        content.innerHTML = '<div class="p-6 text-red-700">The selected view template was not found.</div>';
        return null;
    }

    const fragment = template.content.cloneNode(true);
    const shell = fragment.querySelector('.view-shell');
    if (shell) {
        shell.dataset.title = view.title || view.object || 'Object';
        shell.dataset.status = view.status || 'Ready';
    }

    const objectTargets = fragment.querySelectorAll('[data-table-id], [data-form-id], [data-query-id], [data-report-id]');
    objectTargets.forEach(target => {
        if (target.hasAttribute('data-table-id')) target.dataset.tableId = view.object;
        if (target.hasAttribute('data-form-id')) target.dataset.formId = view.object;
        if (target.hasAttribute('data-query-id')) target.dataset.queryId = view.object;
        if (target.hasAttribute('data-report-id')) target.dataset.reportId = view.object;
    });

    content.replaceChildren(fragment);
    return content.querySelector('.view-shell');
}

async function loadView(view, options = {}) {
    const replaceActive = options.replaceActive === true;
    const existingObjectTab = replaceActive ? null : findOpenObjectTab(view);

    if (existingObjectTab) {
        view = existingObjectTab.view;
    }

    const existingIndex = findTabIndex(view);

    if (replaceActive && openTabs.length) {
        const activeIndex = Math.max(0, findTabIndex(currentView));
        openTabs[activeIndex] = {
            view,
            title: viewTitles[view] || 'Object'
        };
    } else if (existingIndex === -1) {
        openTabs.push({
            view,
            title: viewTitles[view] || 'Object'
        });
    }

    currentView = view;
    statusModeOverride = null;
    content.innerHTML = '<div class="p-6 text-neutral-500">Loading...</div>';
    renderDocumentTabs();
    const response = await fetch(`api/view.php?view=${encodeURIComponent(view)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!response.ok) {
        content.innerHTML = '<div class="p-6 text-red-700">The selected object could not be opened.</div>';
        return;
    }

    const payload = await response.json();
    const db = await getDatabase();
    if (payload.ok) {
        mergeViewData(db, payload.view?.data);
    }

    const shell = payload.ok ? renderViewTemplate(payload.view) : null;
    if (!shell) {
        return;
    }

    const title = shell?.dataset.title || viewTitles[view] || 'Object';
    const activeTab = openTabs[findTabIndex(view)];
    if (activeTab) {
        activeTab.title = title;
    }
    renderDocumentTabs();
    status.textContent = shell?.dataset.status || 'Ready';
    setActiveObject(view);
    updateContextualRibbon(view);
    renderStatusViewButtons();
    await initCurrentView();
}

function closeActiveTab() {
    const activeIndex = findTabIndex(currentView);
    if (activeIndex === -1) {
        return;
    }

    openTabs.splice(activeIndex, 1);

    if (!openTabs.length) {
        currentView = '';
        content.innerHTML = '<div class="p-6 text-neutral-500">Double-click an object to open it.</div>';
        status.textContent = 'Ready';
        renderDocumentTabs();
        setActiveObject('');
        updateContextualRibbon('');
        renderStatusViewButtons();
        return;
    }

    const nextTab = openTabs[Math.max(0, activeIndex - 1)];
    loadView(nextTab.view);
}

function switchTableMode(mode) {
    const target = mode === 'design'
        ? tableViewPairs[currentView] || formViewPairs[currentView] || currentView
        : designViewPairs[currentView] || formDesignViewPairs[currentView] || currentView;

    if (target === currentView) {
        return;
    }

    loadView(target, { replaceActive: true });
}

async function initCurrentView() {
    const db = await getDatabase();
    initTableViews(db);
    initDesignViews(db);
    initFormViews(db);
    initFormDesignViews(db);
    initReportViews(db);
    initQueryBuilders(db);
}

function buildTableMarkup(tableDef, rows, options = {}) {
    const columns = options.columns
        ? tableDef.structure.columns.filter(column => options.columns.includes(column.name))
        : tableDef.structure.columns;
    const emptyRows = Math.max(options.emptyRows ?? 8, 0);
    const sortState = options.sortState || {};

    const minWidth = columns.reduce((sum, column) => sum + (column.width || 110), 40);

    return `
        <table class="access-grid" style="min-width:${minWidth}px">
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
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, rowIndex) => `
                    <tr class="${rowIndex === 0 ? 'active-row' : ''}" data-row-index="${rowIndex}">
                        <td class="row-head">${rowIndex === 0 ? '*' : ''}</td>
                        ${columns.map(column => `<td data-column="${escapeHtml(column.name)}" data-type="${escapeHtml(column.type)}">${escapeHtml(formatValue(row[column.name], column.type))}</td>`).join('')}
                    </tr>
                `).join('')}
                ${Array.from({ length: emptyRows }, () => `<tr><td class="row-head"></td>${columns.map(() => '<td></td>').join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
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

function enableEditableCells(container, rows) {
    container.addEventListener('dblclick', event => {
        const cell = event.target.closest('td[data-column]');
        if (!cell) {
            return;
        }

        const row = cell.closest('tr');
        const rowIndex = Number(row.dataset.rowIndex);
        if (!Number.isInteger(rowIndex) || !rows[rowIndex]) {
            return;
        }

        cell.contentEditable = 'true';
        cell.classList.add('editing-cell');
        cell.focus();
        document.execCommand?.('selectAll', false, null);

        const save = () => {
            cell.contentEditable = 'false';
            cell.classList.remove('editing-cell');
            rows[rowIndex][cell.dataset.column] = cell.textContent.trim();
            cell.removeEventListener('blur', save);
        };

        cell.addEventListener('blur', save);
        cell.addEventListener('keydown', keyEvent => {
            if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
                cell.blur();
            }
        }, { once: true });
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
            host.innerHTML = buildTableMarkup(tableDef, rows, { emptyRows: 18, sortState });
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
        enableEditableCells(host, rows);
        updateActiveRow();

        host.addEventListener('click', event => {
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

function initFormViews(db) {
    content.querySelectorAll('[data-form-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const form = db.forms[view.dataset.formId];
        let index = 0;

        function renderForm() {
            if (!form) {
                view.innerHTML = '<div class="p-6 text-red-700">Form definition was not found.</div>';
                return;
            }

            const parentTable = db.tables[form.parentTable];
            if (!parentTable) {
                view.innerHTML = `<div class="p-6 text-red-700">Parent table ${escapeHtml(form.parentTable)} was not found.</div>`;
                return;
            }

            const parentRows = parentTable.data;
            const parent = parentRows[index];
            const subform = form.subform;
            const subTable = db.tables[subform.table];
            if (!subTable) {
                view.innerHTML = `<div class="p-6 text-red-700">Subform table ${escapeHtml(subform.table)} was not found.</div>`;
                return;
            }

            if (!parent) {
                view.innerHTML = '<div class="p-6 text-neutral-500">This form has no records.</div>';
                return;
            }

            const subRows = subTable.data.filter(row => String(row[subform.foreignKey]) === String(parent[form.parentKey]));
            const parentColumns = parentTable.structure.columns.filter(column => form.fields.includes(column.name));
            const total = subRows.reduce((sum, row) => sum + Number(row.Total || row.UnitPrice * row.Quantity || 0), 0);

            view.innerHTML = `
                <div class="access-form">
                    <div class="form-title">${escapeHtml(form.title)}</div>
                    <div class="form-body">
                        <div class="form-fields">
                            ${parentColumns.map(column => `
                                <label class="form-label">${escapeHtml(column.label || column.name)}</label>
                                <input class="form-input" data-form-field="${escapeHtml(column.name)}" value="${escapeHtml(formatValue(parent[column.name], column.type))}">
                            `).join('')}
                        </div>
                        <div class="form-summary">
                            <div class="mb-2 font-semibold">Record Summary</div>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between"><span>Parent table</span><strong>${escapeHtml(form.parentTable)}</strong></div>
                                <div class="flex justify-between"><span>Child rows</span><strong>${subRows.length}</strong></div>
                                <div class="flex justify-between"><span>Sub total</span><strong>${formatValue(total, 'Currency')}</strong></div>
                            </div>
                        </div>
                    </div>
                    <div class="subform-panel">
                        <div class="subform-title">${escapeHtml(subform.title)}</div>
                        <div class="subform-scroll" data-subform-host>
                            ${buildTableMarkup(subTable, subRows, { columns: subform.columns, emptyRows: 12 })}
                        </div>
                        <div class="subform-footer">
                            <div class="record-bar form-record-bar">
                                <span>Record:</span>
                                <button data-form-nav="first" title="First record"><i class="fas fa-step-backward"></i></button>
                                <button data-form-nav="previous" title="Previous record"><i class="fas fa-caret-left"></i></button>
                                <input value="${index + 1} of ${parentRows.length}" readonly>
                                <button data-form-nav="next" title="Next record"><i class="fas fa-caret-right"></i></button>
                                <button data-form-nav="last" title="Last record"><i class="fas fa-step-forward"></i></button>
                                <button class="opacity-40" disabled title="New record"><i class="fas fa-asterisk"></i></button>
                                <span class="border-l border-[#c6c6c6] pl-2 text-neutral-500">No Filter</span>
                                <input class="ml-2 h-5 w-24 border border-[#b8b8b8] px-1" value="Search">
                            </div>
                            <div class="subform-scrollbar-pad"></div>
                        </div>
                    </div>
                </div>
            `;

            const subformHost = view.querySelector('[data-subform-host]');
            enableEditableCells(subformHost, subRows);
            enableSubformSorting(subformHost, subTable, subRows, subform.columns);
        }

        view.addEventListener('click', event => {
            const button = event.target.closest('[data-form-nav]');
            if (!button) {
                return;
            }

            const count = db.tables[form.parentTable]?.data.length || 0;
            if (button.dataset.formNav === 'first') index = 0;
            if (button.dataset.formNav === 'previous') index = Math.max(0, index - 1);
            if (button.dataset.formNav === 'next') index = Math.min(count - 1, index + 1);
            if (button.dataset.formNav === 'last') index = count - 1;
            renderForm();
        });

        renderForm();
    });
}

function initFormDesignViews(db) {
    content.querySelectorAll('[data-form-design-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const form = db.forms[view.dataset.formId];
        if (!form) {
            view.innerHTML = '<div class="p-6 text-red-700">Form definition was not found.</div>';
            return;
        }

        const parentTable = db.tables[form.parentTable];
        if (!parentTable) {
            view.innerHTML = `<div class="p-6 text-red-700">Parent table ${escapeHtml(form.parentTable)} was not found.</div>`;
            return;
        }

        const parentColumns = parentTable.structure.columns.filter(column => form.fields.includes(column.name));
        const subTable = db.tables[form.subform.table];
        if (!subTable) {
            view.innerHTML = `<div class="p-6 text-red-700">Subform table ${escapeHtml(form.subform.table)} was not found.</div>`;
            return;
        }

        const subColumns = subTable.structure.columns.filter(column => form.subform.columns.includes(column.name));

        const firstColumn = parentColumns[0];
        view.innerHTML = `
            <div class="form-design-layout">
                <div class="form-designer">
                    <div class="designer-tab"><i class="fas fa-window-restore"></i><span>${escapeHtml(form.title)}</span></div>
                    <div class="designer-rulers">
                        <div class="designer-corner"></div>
                        <div class="designer-ruler-x">${Array.from({ length: 10 }, (_, index) => `<span>${index}</span>`).join('')}</div>
                    </div>
                    <div class="designer-body">
                        <div class="designer-nav-label">Navigation Pane</div>
                        <div class="designer-canvas">
                            <section class="designer-section form-header-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Form Header</div>
                                <div class="designer-band form-header-band">
                                    <div class="designer-form-icon"><i class="fas fa-window-restore"></i></div>
                                    <div class="designer-title-control">${escapeHtml(form.title)}</div>
                                </div>
                            </section>
                            <section class="designer-section detail-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Detail</div>
                                <div class="designer-band detail-band">
                                    ${parentColumns.map((column, index) => `
                                        <label class="designer-label" style="top:${34 + index * 64}px">${escapeHtml(column.label || column.name)}</label>
                                        <div class="designer-input ${index === 0 ? 'selected-control' : ''}" style="top:${28 + index * 64}px">${escapeHtml(column.name)}</div>
                                    `).join('')}
                                    <div class="designer-subform">
                                        <div class="designer-subform-title">${escapeHtml(form.subform.title)}</div>
                                        <div class="designer-subform-grid">
                                            ${subColumns.slice(0, 5).map(column => `<span>${escapeHtml(column.label || column.name)}</span>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <section class="designer-section form-footer-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Form Footer</div>
                                <div class="designer-band form-footer-band"></div>
                            </section>
                        </div>
                    </div>
                </div>
                <aside class="property-sheet form-property-sheet" data-property-sheet>
                    <button class="property-close" title="Close Property Sheet"><i class="fas fa-times"></i></button>
                    <h2>Property Sheet</h2>
                    <p>Selection type: Text Box</p>
                    <select class="form-property-select"><option>${escapeHtml(firstColumn?.name || 'Form')}</option></select>
                    <div class="field-tabs"><button class="active">Format</button><button>Data</button><button>Event</button><button>Other</button><button>All</button></div>
                    <div class="property-grid">
                        ${[
                            ['Name', firstColumn?.name || form.title],
                            ['Label Name', 'Label0'],
                            ['Control Source', firstColumn?.name || ''],
                            ['Format', ''],
                            ['Decimal Places', 'Auto'],
                            ['Visible', 'Yes'],
                            ['Text Format', 'Plain Text'],
                            ['Width', '6.825"'],
                            ['Height', '0.2493"'],
                            ['Top', '0.25"'],
                            ['Left', '1.1833"'],
                            ['Back Style', 'Normal'],
                            ['Border Style', 'Solid'],
                            ['Font Name', 'Calibri (Detail)'],
                            ['Font Size', '11'],
                            ['Text Align', 'Left']
                        ].map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('')}
                    </div>
                </aside>
            </div>
        `;

        view.addEventListener('click', event => {
            if (event.target.closest('.property-close')) {
                view.querySelector('[data-property-sheet]')?.classList.add('hidden');
            }
        });
    });
}

function initReportViews(db) {
    content.querySelectorAll('[data-report-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const report = db.reports?.[view.dataset.reportId];

        if (!report) {
            view.innerHTML = '<div class="p-6 text-red-700">Report definition was not found.</div>';
            return;
        }

        const columns = report.columns || [];
        const rows = report.rows || [];
        const colors = ['#5b9bd5', '#ed7d31', '#70ad47', '#ffc000', '#9e67ab'];

        view.innerHTML = `
            <div class="mx-auto min-h-[720px] w-[760px] bg-white p-10 shadow-xl">
                <div class="border-b-4 border-[#a92f35] pb-4">
                    <h2 class="text-3xl font-semibold text-[#a92f35]">${escapeHtml(report.title || 'Report')}</h2>
                    <p class="text-neutral-500">${escapeHtml(report.period || '')}</p>
                </div>
                <div class="mt-8 grid grid-cols-3 gap-4 text-center">
                    ${(report.stats || []).map(stat => `
                        <div class="report-stat">
                            <span>${escapeHtml(stat.label)}</span>
                            <strong>${escapeHtml(stat.value)}</strong>
                        </div>
                    `).join('')}
                </div>
                <table class="mt-8 w-full border-collapse text-sm">
                    <thead>
                        <tr class="bg-[#eceff3]">
                            ${columns.map(column => `<th class="report-th">${escapeHtml(column)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${columns.map(column => `<td class="report-td">${escapeHtml(row[column] ?? '')}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="mt-12 h-40 border border-dashed border-[#9aa6b2] bg-[#f8fafc] p-4">
                    <div class="mb-3 text-sm font-semibold text-neutral-600">Sales by category</div>
                    <div class="flex h-24 items-end gap-4">
                        ${(report.chart || []).map((height, index) => `
                            <div class="w-20" style="height:${Number(height) || 0}%; background:${colors[index % colors.length]}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });
}

function initQueryBuilders(db) {
    content.querySelectorAll('[data-query-builder]').forEach(builder => {
        if (builder.dataset.ready === 'true') {
            return;
        }

        builder.dataset.ready = 'true';
        const query = getDefinitionByName(db.queries, builder.dataset.queryId);
        const canvas = builder.querySelector('[data-query-canvas]');
        const wires = builder.querySelector('[data-query-wires]');
        const picker = builder.querySelector('[data-table-picker]');
        const gridHost = builder.querySelector('[data-query-grid]');

        if (!query) {
            canvas.innerHTML = '<div class="p-6 text-red-700">Query definition was not found.</div>';
            return;
        }

        const tables = new Set((query.tables || [])
            .map(table => resolveTableName(db, table))
            .filter(table => db.tables[table]));
        let connections = (query.connections || []).map(connection => ({
            from: normalizeFieldRef(db, connection.from),
            fromSide: 'right',
            to: normalizeFieldRef(db, connection.to),
            toSide: 'left'
        }));
        let selectedConnection = null;
        let dragConnection = null;
        let selectedFields = (query.fields || []).map(field => ({
            ...field,
            table: resolveTableName(db, field.table)
        }));

        picker.innerHTML = Object.keys(db.tables).map(table => `<option value="${escapeHtml(table)}">${escapeHtml(table)}</option>`).join('');

        function renderNodes() {
            canvas.querySelectorAll('.query-node').forEach(node => node.remove());
            const availableTables = Array.from(tables).filter(tableName => db.tables[tableName]);

            if (!availableTables.length) {
                canvas.insertAdjacentHTML('beforeend', '<div class="p-6 text-neutral-600">This query does not reference any available tables.</div>');
                drawWires();
                return;
            }

            availableTables.forEach((tableName, index) => {
                const table = db.tables[tableName];
                const node = document.createElement('section');
                node.className = 'query-node table-node';
                node.dataset.node = tableName;
                node.style.left = `${34 + ((index % 3) * 280)}px`;
                node.style.top = `${26 + (Math.floor(index / 3) * 210)}px`;
                node.innerHTML = `
                    <header><span>${escapeHtml(tableName)}</span><small>Table</small></header>
                    ${table.structure.columns.map(column => `
                        <div class="query-field-row" data-ref="${escapeHtml(tableName)}.${escapeHtml(column.name)}" data-table="${escapeHtml(tableName)}" data-field="${escapeHtml(column.name)}" data-type="${escapeHtml(column.type)}">
                            <button class="query-handle query-handle-left" data-side="left" title="Connect from left"></button>
                            <label class="query-field-check">
                                <input type="checkbox" data-query-field-check ${selectedFields.some(field => field.table === tableName && field.field === column.name) ? 'checked' : ''}>
                                <span>${escapeHtml(column.name)}</span>
                            </label>
                            <small>${escapeHtml(column.type)}</small>
                            <button class="query-handle query-handle-right" data-side="right" title="Connect from right"></button>
                        </div>
                    `).join('')}
                `;
                canvas.appendChild(node);
                makeDraggable(node);
            });
            drawWires();
        }

        function renderDesignGrid() {
            const fields = selectedFields.length ? selectedFields : [{ field: '', table: '', sort: '', show: true, criteria: '' }];
            gridHost.innerHTML = `
                <table class="query-grid bg-white">
                    <tbody>
                        <tr><th>Field:</th>${fields.map(field => `<td>${escapeHtml(field.field)}</td>`).join('')}</tr>
                        <tr><th>Table:</th>${fields.map(field => `<td>${escapeHtml(field.table)}</td>`).join('')}</tr>
                        <tr><th>Sort:</th>${fields.map(field => `<td>${escapeHtml(field.sort || '')}</td>`).join('')}</tr>
                        <tr><th>Show:</th>${fields.map(field => `<td><input type="checkbox" ${field.show !== false ? 'checked' : ''}></td>`).join('')}</tr>
                        <tr><th>Criteria:</th>${fields.map(field => `<td>${escapeHtml(field.criteria || '')}</td>`).join('')}</tr>
                        <tr><th>or:</th>${fields.map(() => '<td></td>').join('')}</tr>
                    </tbody>
                </table>
            `;
        }

        function handleCenter(ref, side) {
            const row = canvas.querySelector(`[data-ref="${CSS.escape(ref)}"]`);
            const handle = row?.querySelector(`[data-side="${side}"]`);
            if (!handle) return null;
            const canvasBox = canvas.getBoundingClientRect();
            const portBox = handle.getBoundingClientRect();
            return {
                x: portBox.left - canvasBox.left + canvas.scrollLeft + (portBox.width / 2),
                y: portBox.top - canvasBox.top + canvas.scrollTop + (portBox.height / 2)
            };
        }

        function canvasPointFromEvent(event) {
            const canvasBox = canvas.getBoundingClientRect();
            return {
                x: event.clientX - canvasBox.left + canvas.scrollLeft,
                y: event.clientY - canvasBox.top + canvas.scrollTop
            };
        }

        function buildWirePath(start, end, startSide = 'right', endSide = 'left') {
            const direction = startSide === 'right' ? 1 : -1;
            const endDirection = endSide === 'left' ? -1 : 1;
            const control = Math.max(70, Math.abs(end.x - start.x) * .45);
            return `M ${start.x} ${start.y} C ${start.x + (control * direction)} ${start.y}, ${end.x + (control * endDirection)} ${end.y}, ${end.x} ${end.y}`;
        }

        function drawWires() {
            wires.innerHTML = '';
            const width = Math.max(canvas.scrollWidth, canvas.clientWidth, 1120);
            const height = Math.max(canvas.scrollHeight, canvas.clientHeight, 430);
            wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
            wires.style.width = `${width}px`;
            wires.style.height = `${height}px`;

            connections.forEach((connection, index) => {
                const start = handleCenter(connection.from, connection.fromSide || 'right');
                const end = handleCenter(connection.to, connection.toSide || 'left');
                if (!start || !end) return;

                const path = buildWirePath(start, end, connection.fromSide || 'right', connection.toSide || 'left');
                const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                shadow.setAttribute('d', path);
                shadow.setAttribute('class', 'query-wire shadow');
                wire.setAttribute('d', path);
                wire.setAttribute('class', `query-wire ${selectedConnection === index ? 'selected' : ''}`);
                wire.dataset.connectionIndex = String(index);
                wires.append(shadow, wire);
            });

            if (dragConnection?.cursor) {
                const sourceRow = dragConnection.handle.closest('.query-field-row');
                const start = handleCenter(sourceRow.dataset.ref, dragConnection.side);
                const end = dragConnection.cursor;
                if (start && end) {
                    const preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    preview.setAttribute('d', buildWirePath(start, end, dragConnection.side, dragConnection.side === 'right' ? 'left' : 'right'));
                    preview.setAttribute('class', 'query-wire preview');
                    wires.append(preview);
                }
            }
        }

        function makeDraggable(node) {
            const handle = node.querySelector('header');
            let drag = null;

            handle.addEventListener('pointerdown', event => {
                drag = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    nodeX: node.offsetLeft,
                    nodeY: node.offsetTop
                };
                node.classList.add('dragging');
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener('pointermove', event => {
                if (!drag) return;
                node.style.left = `${Math.max(8, drag.nodeX + event.clientX - drag.startX)}px`;
                node.style.top = `${Math.max(8, drag.nodeY + event.clientY - drag.startY)}px`;
                drawWires();
            });

            handle.addEventListener('pointerup', event => {
                if (!drag) return;
                handle.releasePointerCapture(event.pointerId);
                node.classList.remove('dragging');
                drag = null;
                drawWires();
            });
        }

        function updateSelectedField(row, checked) {
            const table = row.dataset.table;
            const field = row.dataset.field;
            selectedFields = selectedFields.filter(item => !(item.table === table && item.field === field));

            if (checked) {
                const existing = query.fields.find(item => item.table === table && item.field === field);
                selectedFields.push(existing ? { ...existing, show: true } : {
                    table,
                    field,
                    sort: '',
                    show: true,
                    criteria: ''
                });
            }

            renderDesignGrid();
        }

        function finishConnection(targetHandle) {
            if (!dragConnection) {
                return;
            }

            const targetRow = targetHandle?.closest('.query-field-row');
            const sourceRow = dragConnection.handle.closest('.query-field-row');
            const sourceSide = dragConnection.side;
            const targetSide = targetHandle?.dataset.side;

            if (targetRow && sourceRow && sourceRow.dataset.table !== targetRow.dataset.table && sourceSide !== targetSide) {
                const fromIsRight = sourceSide === 'right';
                connections.push({
                    from: fromIsRight ? sourceRow.dataset.ref : targetRow.dataset.ref,
                    fromSide: fromIsRight ? sourceSide : targetSide,
                    to: fromIsRight ? targetRow.dataset.ref : sourceRow.dataset.ref,
                    toSide: fromIsRight ? targetSide : sourceSide
                });
            }

            dragConnection.handle.classList.remove('dragging');
            dragConnection = null;
            drawWires();
        }

        canvas.addEventListener('click', event => {
            const wire = event.target.closest('.query-wire:not(.shadow)');
            if (wire) {
                selectedConnection = Number(wire.dataset.connectionIndex);
                drawWires();
                return;
            }

            const checkbox = event.target.closest('[data-query-field-check]');
            if (checkbox) {
                updateSelectedField(checkbox.closest('.query-field-row'), checkbox.checked);
                return;
            }
        });

        canvas.addEventListener('pointerdown', event => {
            const handle = event.target.closest('.query-handle');
            if (!handle) return;
            selectedConnection = null;
            dragConnection = {
                handle,
                side: handle.dataset.side,
                cursor: canvasPointFromEvent(event)
            };
            handle.classList.add('dragging');
            handle.setPointerCapture(event.pointerId);
            drawWires();
            event.preventDefault();
        });

        canvas.addEventListener('pointermove', event => {
            if (!dragConnection) return;
            dragConnection.cursor = canvasPointFromEvent(event);
            drawWires();
        });

        canvas.addEventListener('pointerup', event => {
            if (!dragConnection) return;
            const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
            const targetHandle = dropTarget?.closest('.query-handle');
            finishConnection(targetHandle);
        });

        canvas.addEventListener('pointercancel', () => {
            if (!dragConnection) return;
            dragConnection.handle.classList.remove('dragging');
            dragConnection = null;
            drawWires();
        });

        canvas.addEventListener('keydown', event => {
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedConnection !== null) {
                connections.splice(selectedConnection, 1);
                selectedConnection = null;
                drawWires();
            }
        });

        builder.querySelector('[data-clear-connections]').addEventListener('click', () => {
            connections = [];
            selectedConnection = null;
            dragConnection = null;
            drawWires();
        });

        builder.querySelector('[data-add-selected-table]').addEventListener('click', () => {
            tables.add(picker.value);
            renderNodes();
        });

        renderNodes();
        renderDesignGrid();
    });
}

document.addEventListener('click', event => {
    const statusButton = event.target.closest('[data-status-view]');
    if (statusButton) {
        activateStatusView(statusButton.dataset.statusView);
        return;
    }

    const createMenuButton = event.target.closest('[data-create-menu]');
    if (createMenuButton) {
        openCreateMenu(createMenuButton, createMenuButton.dataset.createMenu);
        return;
    }

    if (createMenu && !event.target.closest('.create-menu')) {
        closeCreateMenu();
    }

    const propertySheetCommand = event.target.closest('[data-command="properties"]');
    if (propertySheetCommand && (isTableDesignView(currentView) || currentView.startsWith('design-form-'))) {
        content.querySelector('[data-property-sheet]')?.classList.toggle('hidden');
        return;
    }

    const moreFieldsButton = event.target.closest('[data-command="more-fields"]');
    if (moreFieldsButton) {
        openMoreFieldsMenu(moreFieldsButton);
        return;
    }

    const moreFieldsItem = event.target.closest('[data-more-field]');
    if (moreFieldsItem) {
        closeMoreFieldsMenu();
        return;
    }

    if (moreFieldsMenu && !event.target.closest('.more-fields-menu')) {
        closeMoreFieldsMenu();
    }

    const docClose = event.target.closest('.doc-close');
    if (docClose) {
        closeActiveTab();
        return;
    }

    const docTab = event.target.closest('[data-tab-view]');
    if (docTab) {
        loadView(docTab.dataset.tabView);
        return;
    }

    const paneToggle = event.target.closest('#object-pane-toggle');
    if (paneToggle) {
        const isCollapsed = objectPane.classList.toggle('collapsed');
        workspaceMain.classList.toggle('object-pane-collapsed', isCollapsed);
        paneToggle.setAttribute('aria-expanded', String(!isCollapsed));
        paneToggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} object pane`);
        paneToggle.querySelector('i').className = `fas ${isCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`;
        return;
    }

    const objectToggle = event.target.closest('.object-toggle');
    if (objectToggle) {
        const section = objectToggle.closest('.object-section');
        const isCollapsed = section.classList.toggle('collapsed');
        objectToggle.setAttribute('aria-expanded', String(!isCollapsed));
        objectToggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${section.querySelector('.object-heading span')?.textContent || 'section'}`);
        objectToggle.querySelector('i').className = `fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`;
        return;
    }

    const ribbonTab = event.target.closest('.ribbon-tab');
    if (ribbonTab) {
        activateRibbonTab(ribbonTab.dataset.ribbon);
        return;
    }

    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
        if (viewButton.closest('#object-list')) {
            const openTab = findOpenObjectTab(viewButton.dataset.view);
            setActiveObject(viewButton.dataset.view);
            if (openTab) {
                loadView(openTab.view);
            }
            return;
        }

        if (viewButton.dataset.view === '@design') {
            switchTableMode('design');
            return;
        }

        if (viewButton.dataset.view === '@datasheet') {
            switchTableMode('datasheet');
            return;
        }

        loadView(viewButton.dataset.view);
    }
});

document.addEventListener('dblclick', event => {
    const objectLink = event.target.closest('#object-list [data-view]');
    if (!objectLink) {
        return;
    }

    loadView(objectLink.dataset.view);
});

async function bootstrapApp() {
    activateRibbonTab('home');

    try {
        const db = await getDatabase();
        configureObjectMaps(db);
        renderObjectList(db);

        const requestedView = app.dataset.initialView || '';
        const firstTableView = Object.keys(tableViewPairs)[0];
        const initialView = viewTitles[requestedView] ? requestedView : firstTableView;

        if (initialView) {
            await loadView(initialView);
            return;
        }

        content.innerHTML = '<div class="p-6 text-neutral-500">No database tables were found.</div>';
        status.textContent = 'Ready';
    } catch (error) {
        content.innerHTML = `<div class="p-6 text-red-700">Unable to load database: ${escapeHtml(error.message)}</div>`;
        status.textContent = 'Database Error';
    }
}

bootstrapApp();
