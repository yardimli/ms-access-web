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
let validationMenu = null;
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

const homeDropdowns = {
    paste: [
        { icon: 'paste', label: 'Paste' },
        { icon: 'paste-special', label: 'Paste Special...' },
        { icon: 'paste-append', label: 'Paste Append' }
    ],
    view: [
        { icon: 'grid', label: 'Datasheet View', view: '@datasheet', strong: true },
        { icon: 'design', label: 'Design View', view: '@design', strong: true }
    ],
    selection: [
        { icon: 'filter', label: 'Equals Blank' },
        { icon: 'filter', label: 'Does Not Equal Blank' }
    ],
    advanced: [
        { icon: 'clear-filter', label: 'Clear All Filters', disabled: true },
        { icon: 'filter-form', label: 'Filter By Form' },
        { icon: 'apply-filter', label: 'Apply Filter/Sort' },
        { icon: 'advanced-filter', label: 'Advanced Filter/Sort...' },
        { icon: 'folder', label: 'Load from Query...', disabled: true },
        { icon: 'save-as', label: 'Save As Query', disabled: true },
        { icon: 'delete-tab', label: 'Delete Tab' },
        { icon: 'clear-grid', label: 'Clear Grid' },
        { icon: 'close', label: 'Close' }
    ],
    more: [
        { icon: 'outlook', label: 'Add From Outlook', disabled: true },
        { icon: 'contact', label: 'Save As Outlook Contact', disabled: true },
        { icon: 'row-height', label: 'Row Height...' },
        { icon: 'subdatasheet', label: 'Subdatasheet', submenu: [
            { icon: 'subdatasheet', label: 'Subdatasheet...' },
            { icon: 'remove', label: 'Remove', disabled: true },
            { icon: 'expand', label: 'Expand All', disabled: true },
            { icon: 'collapse', label: 'Collapse All', disabled: true }
        ] },
        { icon: 'hide-fields', label: 'Hide Fields' },
        { icon: 'unhide-fields', label: 'Unhide Fields' },
        { icon: 'freeze', label: 'Freeze Fields' },
        { icon: 'unfreeze', label: 'Unfreeze All Fields' },
        { icon: 'field-width', label: 'Field Width' }
    ],
    goto: [
        { icon: 'first', label: 'First' },
        { icon: 'previous', label: 'Previous' },
        { icon: 'next', label: 'Next', disabled: true },
        { icon: 'last', label: 'Last' },
        { icon: 'new', label: 'New', disabled: true }
    ],
    select: [
        { icon: 'pointer', label: 'Select' },
        { icon: 'select-all', label: 'Select All' }
    ],
    font: [
        { label: 'Calibri Light (Header)', family: 'Calibri Light' },
        { label: 'Calibri (Detail)', family: 'Calibri' },
        { label: 'Arial', family: 'Arial' },
        { label: 'Arial Black', family: 'Arial Black', strong: true },
        { label: 'Arial Narrow', family: 'Arial Narrow' },
        { label: 'Bahnschrift', family: 'Bahnschrift' },
        { label: 'Bahnschrift Condensed', family: 'Bahnschrift Condensed' },
        { label: 'Bahnschrift Light', family: 'Bahnschrift Light' },
        { label: 'Bahnschrift SemiBold', family: 'Bahnschrift SemiBold', strong: true },
        { label: 'Book Antiqua', family: 'Book Antiqua' },
        { label: 'Bookman Old Style', family: 'Bookman Old Style' },
        { label: 'Calibri', family: 'Calibri' },
        { label: 'Cambria', family: 'Cambria' },
        { label: 'Candara', family: 'Candara' },
        { label: 'Cascadia Code', family: 'Cascadia Code', strong: true }
    ],
    size: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '22', '24', '26', '28', '36', '48', '72'].map(label => ({ label, active: label === '11' })),
    gridlines: [
        { icon: 'gridlines-both', label: 'Gridlines: Both', strong: true },
        { icon: 'gridlines-horizontal', label: 'Gridlines: Horizontal', strong: true },
        { icon: 'gridlines-vertical', label: 'Gridlines: Vertical', strong: true },
        { icon: 'gridlines-none', label: 'Gridlines: None', strong: true }
    ],
    color: [
        { colorGrid: true }
    ]
};


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
    if (value === '') {
        return '';
    }

    if (type === 'Currency') {
        const number = Number(String(value).replace(/[$,]/g, ''));
        return Number.isFinite(number)
            ? number.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
            : String(value);
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

async function postSchemaAction(payload) {
    const response = await fetch('api/schema.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Schema update failed.');
    }

    return data;
}

async function postRecordAction(payload) {
    const response = await fetch('api/records.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Record update failed.');
    }

    return data;
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
        'paste-special': 'far fa-clipboard',
        'paste-append': 'fas fa-clipboard-list',
        cut: 'fas fa-cut',
        copy: 'fas fa-copy',
        'format-painter': 'fas fa-paint-brush',
        filter: 'fas fa-filter',
        'sort-asc': 'fas fa-sort-alpha-down',
        'sort-desc': 'fas fa-sort-alpha-up-alt',
        'remove-sort': 'fas fa-sort-alpha-down',
        selection: 'fas fa-filter',
        advanced: 'fas fa-filter',
        'toggle-filter': 'fas fa-filter',
        find: 'fas fa-search',
        replace: 'fas fa-exchange-alt',
        'go-to': 'fas fa-arrow-right',
        select: 'fas fa-mouse-pointer',
        new: 'fas fa-plus-square',
        delete: 'fas fa-trash-alt',
        refresh: 'fas fa-sync-alt',
        'refresh-all': 'fas fa-sync-alt',
        totals: 'fas fa-sigma',
        spelling: 'fas fa-spell-check',
        bold: 'fas fa-bold',
        italic: 'fas fa-italic',
        underline: 'fas fa-underline',
        'font-color': 'fas fa-font',
        'text-highlight': 'fas fa-highlighter',
        'fill-color': 'fas fa-fill-drip',
        'align-left': 'fas fa-align-left',
        'align-center': 'fas fa-align-center',
        'align-right': 'fas fa-align-right',
        'bullets': 'fas fa-list-ul',
        'numbered-list': 'fas fa-list-ol',
        indent: 'fas fa-indent',
        outdent: 'fas fa-outdent',
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
        ,
        'clear-filter': 'fas fa-filter',
        'filter-form': 'fas fa-wpforms',
        'apply-filter': 'fas fa-filter',
        'advanced-filter': 'fas fa-magic',
        'delete-tab': 'fas fa-times',
        'clear-grid': 'fas fa-times',
        close: 'fas fa-window-close',
        outlook: 'fab fa-microsoft',
        contact: 'far fa-address-card',
        'row-height': 'fas fa-arrows-alt-v',
        subdatasheet: 'fas fa-table',
        remove: 'fas fa-minus',
        expand: 'fas fa-expand-alt',
        collapse: 'fas fa-compress-alt',
        'hide-fields': 'fas fa-eye-slash',
        'unhide-fields': 'fas fa-eye',
        freeze: 'fas fa-columns',
        unfreeze: 'fas fa-columns',
        'field-width': 'fas fa-arrows-alt-h',
        first: 'fas fa-step-backward',
        previous: 'fas fa-caret-left',
        next: 'fas fa-caret-right',
        last: 'fas fa-step-forward',
        'gridlines-both': 'fas fa-border-all',
        'gridlines-horizontal': 'fas fa-grip-lines',
        'gridlines-vertical': 'fas fa-grip-lines-vertical',
        'gridlines-none': 'far fa-square'
    };

    return `<i class="${map[name] || map.more}" aria-hidden="true"></i>`;
}

function closeMoreFieldsMenu() {
    moreFieldsMenu?.remove();
    moreFieldsMenu = null;
    document.querySelector('[data-command="more-fields"]')?.classList.remove('active');
}

function closeValidationMenu() {
    validationMenu?.remove();
    validationMenu = null;
    document.querySelector('[data-command="validation"]')?.classList.remove('active');
}

function closeCreateMenu() {
    createMenu?.remove();
    createMenu = null;
    document.querySelectorAll('.create-command.active, .create-mini.active, .home-big.active, .home-mini.active, .home-icon-button.active, .home-select.active, .add-column-head.active, .add-column-button.active').forEach(button => {
        button.classList.remove('active');
    });
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

function buildValidationMenu() {
    return `
        <button class="validation-menu-item" type="button" data-validation-menu-item="rule">
            <span class="validation-menu-icon">${ribbonIcon('validation')}</span>
            <span>
                <strong>Field Validation Rule</strong>
                <em>Create an expression that restricts the values that can be entered in the field.</em>
            </span>
        </button>
        <button class="validation-menu-item" type="button" data-validation-menu-item="message">
            <span class="validation-menu-icon">${ribbonIcon('test-validation')}</span>
            <span>
                <strong>Field Validation Message</strong>
                <em>Set the error message for the Field Validation Rule.</em>
            </span>
        </button>
    `;
}

function openValidationMenu(button) {
    if (validationMenu) {
        closeValidationMenu();
        return;
    }

    closeMoreFieldsMenu();
    closeCreateMenu();
    const box = button.getBoundingClientRect();
    validationMenu = document.createElement('div');
    validationMenu.className = 'validation-menu';
    validationMenu.innerHTML = buildValidationMenu();
    document.body.appendChild(validationMenu);

    const menuWidth = validationMenu.offsetWidth;
    const left = Math.min(box.left, window.innerWidth - menuWidth - 8);
    validationMenu.style.left = `${Math.max(4, left)}px`;
    validationMenu.style.top = `${box.bottom + 2}px`;
    button.classList.add('active');
}

function openMoreFieldsMenu(button) {
    if (moreFieldsMenu && moreFieldsMenu.dataset.owner === 'more-fields') {
        closeMoreFieldsMenu();
        return;
    }

    closeMoreFieldsMenu();
    closeValidationMenu();
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

function homeBig(icon, label, options = {}) {
    const classes = ['home-big'];
    if (options.disabled) classes.push('disabled');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-home-menu="${options.menu}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="home-big-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeMini(icon, label, options = {}) {
    const classes = ['home-mini'];
    if (options.disabled) classes.push('disabled');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-home-menu="${options.menu}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="home-mini-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeIconButton(icon, options = {}) {
    return `
        <button class="home-icon-button" type="button" data-command="${escapeHtml(icon)}" ${options.menu ? `data-home-menu="${options.menu}"` : ''} title="${escapeHtml(options.title || icon)}">
            ${ribbonIcon(icon)}
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeSelect(label, key, width = 178) {
    return `
        <button class="home-select" type="button" data-home-menu="${escapeHtml(key)}" style="width:${width}px">
            <span>${escapeHtml(label)}</span>
            <i class="fas fa-chevron-down"></i>
        </button>
    `;
}

function buildColorPalette() {
    const themeColumns = [
        ['#ffffff', '#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#808080', '#595959', '#404040', '#262626', '#0d0d0d'],
        ['#000000', '#7f7f7f', '#595959', '#3f3f3f', '#262626'],
        ['#1f4e79', '#d9eaf7', '#9dc3e6', '#5b9bd5', '#2f75b5', '#1f4e79'],
        ['#ed7d31', '#fce4d6', '#f8cbad', '#f4b183', '#ed7d31', '#c55a11'],
        ['#70ad47', '#e2f0d9', '#c6e0b4', '#a9d18e', '#70ad47', '#548235'],
        ['#ffc000', '#fff2cc', '#ffe699', '#ffd966', '#ffc000', '#bf9000']
    ];
    const standard = ['#ffffff', '#000000', '#7f7f7f', '#1f4e79', '#5b9bd5', '#c00000', '#70ad47', '#8064a2', '#00b0f0', '#f4b183', '#d9d9d9', '#a6a6a6', '#595959', '#dbe5f1', '#b4c6e7', '#f4cccc', '#d9ead3', '#d9d2e9', '#d0e0e3', '#fce5cd', '#ff0000', '#ff9900', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];

    return `
        <div class="color-menu">
            <button class="color-auto" type="button"><span style="background:#111"></span>Automatic</button>
            <h3>Theme Colors</h3>
            <div class="theme-colors">${themeColumns.map(column => `<div>${column.map(color => `<button type="button" style="background:${color}"></button>`).join('')}</div>`).join('')}</div>
            <h3>Standard Colors</h3>
            <div class="standard-colors">${standard.map(color => `<button type="button" style="background:${color}"></button>`).join('')}</div>
            <h3>Recent Colors</h3>
            <div class="recent-colors"><button type="button" style="background:#ff0000"></button></div>
            <button class="more-colors" type="button"><i class="fas fa-circle-notch"></i>More Colors...</button>
        </div>
    `;
}

function buildHomeMenu(key) {
    const items = homeDropdowns[key] || [];
    if (items.some(item => item.colorGrid)) {
        return buildColorPalette();
    }

    return `
        <div class="home-menu-list ${key === 'font' ? 'font-menu-list' : ''} ${key === 'size' ? 'size-menu-list' : ''}">
            ${items.map(item => {
                const rowInner = `
                    ${item.icon ? `<span class="home-menu-icon">${ribbonIcon(item.icon)}</span>` : ''}
                    <span class="${item.strong ? 'font-semibold' : ''}">${escapeHtml(item.label)}</span>
                `;

                if (item.submenu) {
                    return `
                        <div class="home-menu-item home-menu-parent ${item.disabled ? 'disabled' : ''}">
                            ${rowInner}
                            <i class="fas fa-caret-right home-submenu-caret"></i>
                            <span class="home-submenu">${item.submenu.map(sub => `
                                <button class="home-menu-item ${sub.disabled ? 'disabled' : ''}" type="button" data-home-menu-item data-home-value="${escapeHtml(sub.label)}" ${sub.disabled ? 'disabled' : ''}>
                                    <span class="home-menu-icon">${ribbonIcon(sub.icon)}</span>
                                    <span>${escapeHtml(sub.label)}</span>
                                </button>
                            `).join('')}</span>
                        </div>
                    `;
                }

                return `
                    <button class="home-menu-item ${item.disabled ? 'disabled' : ''} ${item.active ? 'active' : ''}" type="button" data-home-menu-item data-home-value="${escapeHtml(item.label)}" ${item.view ? `data-view="${escapeHtml(item.view)}"` : ''} ${item.disabled ? 'disabled' : ''} style="${item.family ? `font-family:${escapeHtml(item.family)}, sans-serif` : ''}">
                        ${rowInner}
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function openHomeMenu(button, key) {
    if (createMenu?.dataset.owner === `home-${key}`) {
        closeCreateMenu();
        return;
    }

    closeCreateMenu();
    const box = button.getBoundingClientRect();
    createMenu = document.createElement('div');
    createMenu.className = `create-menu home-menu home-menu-${key}`;
    createMenu.dataset.owner = `home-${key}`;
    createMenu.innerHTML = buildHomeMenu(key);
    document.body.appendChild(createMenu);
    const left = Math.min(box.left, window.innerWidth - createMenu.offsetWidth - 8);
    createMenu.style.left = `${Math.max(4, left)}px`;
    createMenu.style.top = `${box.bottom + 1}px`;
    button.classList.add('active');
}

function renderHomeRibbon() {
    closeCreateMenu();
    ribbon.innerHTML = `
        <div class="home-ribbon">
            <div class="home-group" data-label="Views">
                ${homeBig('design', 'View', { caret: true, menu: 'view' })}
            </div>
            <div class="home-group" data-label="Clipboard">
                ${homeBig('paste', 'Paste', { caret: true, menu: 'paste' })}
                <div class="home-stack">
                    ${homeMini('cut', 'Cut', { disabled: true })}
                    ${homeMini('copy', 'Copy', { disabled: true })}
                    ${homeMini('format-painter', 'Format Painter', { disabled: true })}
                </div>
            </div>
            <div class="home-group" data-label="Sort & Filter">
                ${homeBig('filter', 'Filter')}
                <div class="home-stack">
                    ${homeMini('sort-asc', 'Ascending')}
                    ${homeMini('sort-desc', 'Descending')}
                    ${homeMini('remove-sort', 'Remove Sort', { disabled: true })}
                </div>
                <div class="home-stack home-stack-wide">
                    ${homeMini('selection', 'Selection', { caret: true, menu: 'selection' })}
                    ${homeMini('advanced', 'Advanced', { caret: true, menu: 'advanced' })}
                    ${homeMini('toggle-filter', 'Toggle Filter', { disabled: true })}
                </div>
            </div>
            <div class="home-group" data-label="Records">
                ${homeBig('refresh-all', 'Refresh All', { caret: true })}
                <div class="home-stack">
                    ${homeMini('new', 'New', { disabled: true })}
                    ${homeMini('save', 'Save')}
                    ${homeMini('delete', 'Delete', { disabled: true, caret: true })}
                </div>
                <div class="home-stack">
                    ${homeMini('totals', 'Totals')}
                    ${homeMini('spelling', 'Spelling')}
                    ${homeMini('more', 'More', { caret: true, menu: 'more' })}
                </div>
            </div>
            <div class="home-group" data-label="Find">
                ${homeBig('find', 'Find')}
                <div class="home-stack">
                    ${homeMini('replace', 'Replace')}
                    ${homeMini('go-to', 'Go To', { caret: true, menu: 'goto' })}
                    ${homeMini('select', 'Select', { caret: true, menu: 'select' })}
                </div>
            </div>
            <div class="home-group home-text-group" data-label="Text Formatting">
                <div class="home-format-panel">
                    <div class="home-format-row">
                        ${homeSelect('Calibri (Detail)', 'font', 206)}
                        ${homeSelect('11', 'size', 88)}
                        ${homeIconButton('bullets', { title: 'Bullets' })}
                        ${homeIconButton('numbered-list', { title: 'Numbering' })}
                        ${homeIconButton('indent', { title: 'Increase Indent' })}
                        ${homeIconButton('outdent', { title: 'Decrease Indent' })}
                    </div>
                    <div class="home-format-row">
                        ${homeIconButton('bold', { title: 'Bold' })}
                        ${homeIconButton('italic', { title: 'Italic' })}
                        ${homeIconButton('underline', { title: 'Underline' })}
                        ${homeIconButton('font-color', { title: 'Font Color', caret: true, menu: 'color' })}
                        ${homeIconButton('text-highlight', { title: 'Text Highlight' })}
                        ${homeIconButton('fill-color', { title: 'Fill Color', caret: true, menu: 'color' })}
                        ${homeIconButton('align-left', { title: 'Align Left' })}
                        ${homeIconButton('align-center', { title: 'Align Center' })}
                        ${homeIconButton('align-right', { title: 'Align Right' })}
                        ${homeIconButton('gridlines', { title: 'Gridlines', caret: true, menu: 'gridlines' })}
                    </div>
                </div>
            </div>
        </div>
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


function renderRibbon(name) {
    closeMoreFieldsMenu();
    closeValidationMenu();
    closeCreateMenu();
    if (name === 'home') {
        renderHomeRibbon();
        return;
    }

    if (name === 'create') {
        renderCreateRibbon();
        return;
    }

    if (name === 'fields') {
        renderFieldsRibbon();
        window.updateFieldsRibbonState?.();
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
    closeActiveCellEditor(true);
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

document.addEventListener('click', async event => {
    if (activeCellEditor && !shouldKeepCellEditorOpen(event.target)) {
        closeActiveCellEditor(true);
    }

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

    const homeMenuButton = event.target.closest('[data-home-menu]');
    if (homeMenuButton && !homeMenuButton.closest('.home-menu')) {
        openHomeMenu(homeMenuButton, homeMenuButton.dataset.homeMenu);
        return;
    }

    if (createMenu && !event.target.closest('.create-menu')) {
        closeCreateMenu();
    }

    const homeMenuItem = event.target.closest('[data-home-menu-item]');
    if (homeMenuItem && event.target.closest('.home-menu')) {
        const owner = createMenu?.dataset.owner?.replace('home-', '') || '';
        const value = homeMenuItem.dataset.homeValue || '';
        const view = homeMenuItem.dataset.view;

        if (owner === 'font' || owner === 'size') {
            const selectLabel = document.querySelector(`.home-select[data-home-menu="${owner}"] span`);
            if (selectLabel) {
                selectLabel.textContent = value;
            }
        }

        closeCreateMenu();

        if (view === '@design') {
            switchTableMode('design');
            return;
        }

        if (view === '@datasheet') {
            switchTableMode('datasheet');
            return;
        }

        if (view) {
            loadView(view);
            return;
        }

        status.textContent = value ? `${value} selected` : 'Ready';
        return;
    }

    const homeColorItem = event.target.closest('.color-menu button');
    if (homeColorItem) {
        closeCreateMenu();
        status.textContent = 'Color selected';
        return;
    }

    const propertySheetCommand = event.target.closest('[data-command="properties"]');
    if (propertySheetCommand && (isTableDesignView(currentView) || currentView.startsWith('design-form-'))) {
        content.querySelector('[data-property-sheet]')?.classList.toggle('hidden');
        return;
    }

    const captionCommand = event.target.closest('[data-command="caption"]');
    if (captionCommand && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.openColumnDialog?.();
        return;
    }

    const validationToggle = event.target.closest('[data-command="required"], [data-command="unique"], [data-command="indexed"]');
    if (validationToggle && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.toggleColumnValidation?.(validationToggle.dataset.command);
        return;
    }

    const validationButton = event.target.closest('[data-command="validation"]');
    if (validationButton && isTableDatasheetView(currentView)) {
        openValidationMenu(validationButton);
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

    const validationMenuItem = event.target.closest('[data-validation-menu-item]');
    if (validationMenuItem) {
        const label = validationMenuItem.dataset.validationMenuItem === 'rule'
            ? 'Field Validation Rule'
            : 'Field Validation Message';
        closeValidationMenu();
        status.textContent = `${label} selected`;
        return;
    }

    if (validationMenu && !event.target.closest('.validation-menu')) {
        closeValidationMenu();
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

document.addEventListener('change', async event => {
    const typeSelect = event.target.closest('[data-field-data-type]');
    if (typeSelect && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.changeColumnType?.(typeSelect.value);
    }
});

document.addEventListener('dblclick', event => {
    const objectLink = event.target.closest('#object-list [data-view]');
    if (!objectLink) {
        return;
    }

    loadView(objectLink.dataset.view);
});

function isTextEditTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, .cell-edit-input'));
}

document.addEventListener('selectstart', event => {
    if (!isTextEditTarget(event.target)) {
        event.preventDefault();
    }
}, true);

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed) {
        return;
    }

    const active = document.activeElement;
    const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;

    if (!isTextEditTarget(active) && !isTextEditTarget(anchor)) {
        selection.removeAllRanges();
    }
});

document.addEventListener('scroll', positionActiveCellEditor, true);
window.addEventListener('resize', positionActiveCellEditor);

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

