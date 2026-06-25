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
        ['Add & Delete', [['text-field', 'Short Text'], ['number', 'Number'], ['currency', 'Currency'], ['delete', 'Delete']]],
        ['Properties', [['caption', 'Name & Caption'], ['required', 'Required'], ['validation', 'Validation']]]
    ],
    table: [
        ['Show/Hide', [['properties', 'Property Sheet'], ['index', 'Indexes']]],
        ['Events', [['macro', 'Create Data Macros'], ['rename', 'Rename/Delete Macro']]],
        ['Relationships', [['relationships', 'Relationships'], ['deps', 'Object Dependencies']]]
    ],
    file: [
        ['Backstage', [['save', 'Save'], ['save-as', 'Save As'], ['print', 'Print'], ['options', 'Options']]]
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

let databasePromise = null;
let currentView = app.dataset.initialView || 'table-customers';
let openTabs = [];

const tableViewPairs = {
    'table-customers': 'design-customers',
    'table-orders': 'design-orders',
    'table-order-items': 'design-order-items',
    'table-products': 'design-products',
    'table-regions': 'design-regions',
    'table-sales-targets': 'design-sales-targets'
};

const designViewPairs = Object.fromEntries(Object.entries(tableViewPairs).map(([table, design]) => [design, table]));

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
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
        databasePromise = fetch('data/database.json', { cache: 'no-store' }).then(response => {
            if (!response.ok) {
                throw new Error('Unable to load database.json');
            }
            return response.json();
        });
    }

    return databasePromise;
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
        report: 'fas fa-file-alt',
        query: 'fas fa-project-diagram',
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
        validation: 'fas fa-check-square',
        properties: 'fas fa-list-alt',
        index: 'fas fa-bolt',
        macro: 'fas fa-bolt',
        rename: 'fas fa-i-cursor',
        save: 'fas fa-save',
        'save-as': 'fas fa-save',
        print: 'fas fa-print',
        options: 'fas fa-cog'
    };

    return `<i class="${map[name] || map.more}" aria-hidden="true"></i>`;
}

function renderRibbon(name) {
    const groups = ribbons[name] || ribbons.home;
    ribbon.innerHTML = `<div class="ribbon-content">${groups.map(([label, commands]) => `
        <div class="ribbon-group" data-label="${label}">
            ${commands.map(([icon, text, view]) => `
                <button class="ribbon-command" ${view ? `data-view="${view}"` : ''}>
                    <span class="icon">${ribbonIcon(icon)}</span>
                    <span>${escapeHtml(text)}</span>
                </button>
            `).join('')}
        </div>
    `).join('')}</div>`;
}

function activateRibbonTab(name) {
    document.querySelectorAll('.ribbon-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.ribbon === name);
    });
    renderRibbon(name);
}

function setActiveObject(view) {
    const objectView = designViewPairs[view] || view;
    document.querySelectorAll('.object-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === objectView);
    });
}

function findTabIndex(view) {
    return openTabs.findIndex(tab => tab.view === view);
}

function findOpenObjectTab(view) {
    const objectView = designViewPairs[view] || view;
    return openTabs.find(tab => tab.view === objectView || designViewPairs[tab.view] === objectView);
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
                    ${escapeHtml(tab.title)}
                </button>
            `).join('')}
        </div>
        <button class="doc-close ml-auto mr-2 self-center" title="Close active tab"><i class="fas fa-times"></i></button>
    `;
}

async function loadView(view, options = {}) {
    const existingIndex = findTabIndex(view);
    const replaceActive = options.replaceActive === true;

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
    content.innerHTML = '<div class="p-6 text-neutral-500">Loading...</div>';
    renderDocumentTabs();
    const response = await fetch(`partial.php?view=${encodeURIComponent(view)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!response.ok) {
        content.innerHTML = '<div class="p-6 text-red-700">The selected object could not be opened.</div>';
        return;
    }

    content.innerHTML = await response.text();
    const shell = content.querySelector('.view-shell');
    const title = shell?.dataset.title || viewTitles[view] || 'Object';
    const activeTab = openTabs[findTabIndex(view)];
    if (activeTab) {
        activeTab.title = title;
    }
    renderDocumentTabs();
    status.textContent = shell?.dataset.status || 'Ready';
    setActiveObject(view);
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
        return;
    }

    const nextTab = openTabs[Math.max(0, activeIndex - 1)];
    loadView(nextTab.view);
}

function switchTableMode(mode) {
    const target = mode === 'design'
        ? tableViewPairs[currentView] || currentView
        : designViewPairs[currentView] || currentView;

    loadView(target, { replaceActive: true });
}

async function initCurrentView() {
    const db = await getDatabase();
    initTableViews(db);
    initDesignViews(db);
    initFormViews(db);
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
        const propertyRows = [
            ['Read Only When Disconnected', 'No'],
            ['Subdatasheet Expanded', 'No'],
            ['Subdatasheet Height', '0"'],
            ['Orientation', 'Left-to-Right'],
            ['Default View', 'Datasheet'],
            ['Filter', ''],
            ['Order By', ''],
            ['Subdatasheet Name', '[Auto]'],
            ['Filter On Load', 'No'],
            ['Order By On Load', 'Yes']
        ];
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
                                    <tr class="${index === 0 ? 'editing' : ''}">
                                        <td class="row-head">${index === 0 ? '*' : ''}</td>
                                        <td>${escapeHtml(column.name)}</td>
                                        <td>${escapeHtml(column.type)}</td>
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
                                <div class="property-grid">
                                    <div class="prop-label">Field Size</div><div class="prop-value">${columns[0]?.type === 'AutoNumber' ? 'Long Integer' : '255'}</div>
                                    <div class="prop-label">New Values</div><div class="prop-value">Increment</div>
                                    <div class="prop-label">Format</div><div class="prop-value"></div>
                                    <div class="prop-label">Caption</div><div class="prop-value"></div>
                                    <div class="prop-label">Indexed</div><div class="prop-value">${columns[0]?.name === tableDef.structure.primaryKey ? 'Yes (No Duplicates)' : 'No'}</div>
                                    <div class="prop-label">Text Align</div><div class="prop-value">General</div>
                                </div>
                            </div>
                            <p>A field name can be up to 64 characters long, including spaces. Press F1 for help on field names.</p>
                        </div>
                    </section>
                </div>
                <aside class="property-sheet">
                    <button class="property-close">x</button>
                    <h2>Property Sheet</h2>
                    <p>Selection type: Table Properties</p>
                    <div class="field-tabs"><button class="active">General</button></div>
                    <div class="property-grid">
                        ${propertyRows.map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('')}
                    </div>
                </aside>
            </div>
        `;
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
            const parentTable = db.tables[form.parentTable];
            const parentRows = parentTable.data;
            const parent = parentRows[index];
            const subform = form.subform;
            const subTable = db.tables[subform.table];
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

            const count = db.tables[form.parentTable].data.length;
            if (button.dataset.formNav === 'first') index = 0;
            if (button.dataset.formNav === 'previous') index = Math.max(0, index - 1);
            if (button.dataset.formNav === 'next') index = Math.min(count - 1, index + 1);
            if (button.dataset.formNav === 'last') index = count - 1;
            renderForm();
        });

        renderForm();
    });
}

function initQueryBuilders(db) {
    content.querySelectorAll('[data-query-builder]').forEach(builder => {
        if (builder.dataset.ready === 'true') {
            return;
        }

        builder.dataset.ready = 'true';
        const query = db.queries[builder.dataset.queryId];
        const canvas = builder.querySelector('[data-query-canvas]');
        const wires = builder.querySelector('[data-query-wires]');
        const picker = builder.querySelector('[data-table-picker]');
        const gridHost = builder.querySelector('[data-query-grid]');
        const sqlHost = builder.querySelector('[data-query-sql]');
        const tables = new Set(query.tables);
        let connections = query.connections.map(connection => ({ ...connection }));
        let selectedConnection = null;
        let pendingPort = null;

        picker.innerHTML = Object.keys(db.tables).map(table => `<option value="${escapeHtml(table)}">${escapeHtml(table)}</option>`).join('');

        function renderNodes() {
            canvas.querySelectorAll('.query-node').forEach(node => node.remove());
            Array.from(tables).forEach((tableName, index) => {
                const table = db.tables[tableName];
                const node = document.createElement('section');
                node.className = 'query-node table-node';
                node.dataset.node = tableName;
                node.style.left = `${34 + ((index % 3) * 280)}px`;
                node.style.top = `${26 + (Math.floor(index / 3) * 210)}px`;
                node.innerHTML = `
                    <header><span>${escapeHtml(tableName)}</span><small>Table</small></header>
                    ${table.structure.columns.map(column => `
                        <button class="query-port out" data-ref="${escapeHtml(tableName)}.${escapeHtml(column.name)}" data-table="${escapeHtml(tableName)}" data-field="${escapeHtml(column.name)}">
                            ${escapeHtml(column.name)}
                            <span>${escapeHtml(column.type)}</span>
                        </button>
                    `).join('')}
                `;
                canvas.appendChild(node);
                makeDraggable(node);
            });
            drawWires();
        }

        function renderDesignGrid() {
            gridHost.innerHTML = `
                <table class="query-grid bg-white">
                    <tbody>
                        <tr><th>Field:</th>${query.fields.map(field => `<td>${escapeHtml(field.field)}</td>`).join('')}</tr>
                        <tr><th>Table:</th>${query.fields.map(field => `<td>${escapeHtml(field.table)}</td>`).join('')}</tr>
                        <tr><th>Sort:</th>${query.fields.map(field => `<td>${escapeHtml(field.sort)}</td>`).join('')}</tr>
                        <tr><th>Show:</th>${query.fields.map(field => `<td><input type="checkbox" ${field.show ? 'checked' : ''}></td>`).join('')}</tr>
                        <tr><th>Criteria:</th>${query.fields.map(field => `<td>${escapeHtml(field.criteria)}</td>`).join('')}</tr>
                        <tr><th>or:</th>${query.fields.map(() => '<td></td>').join('')}</tr>
                    </tbody>
                </table>
            `;
            sqlHost.textContent = query.sql;
        }

        function portCenter(ref) {
            const port = canvas.querySelector(`[data-ref="${CSS.escape(ref)}"]`);
            if (!port) return null;
            const canvasBox = canvas.getBoundingClientRect();
            const portBox = port.getBoundingClientRect();
            return {
                x: portBox.right - canvasBox.left + canvas.scrollLeft - 4,
                y: portBox.top - canvasBox.top + canvas.scrollTop + (portBox.height / 2)
            };
        }

        function drawWires() {
            wires.innerHTML = '';
            const width = Math.max(canvas.scrollWidth, canvas.clientWidth, 1120);
            const height = Math.max(canvas.scrollHeight, canvas.clientHeight, 430);
            wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
            wires.style.width = `${width}px`;
            wires.style.height = `${height}px`;

            connections.forEach((connection, index) => {
                const start = portCenter(connection.from);
                const end = portCenter(connection.to);
                if (!start || !end) return;

                const control = Math.max(70, Math.abs(end.x - start.x) * .45);
                const path = `M ${start.x} ${start.y} C ${start.x + control} ${start.y}, ${end.x - control} ${end.y}, ${end.x} ${end.y}`;
                const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                shadow.setAttribute('d', path);
                shadow.setAttribute('class', 'query-wire shadow');
                wire.setAttribute('d', path);
                wire.setAttribute('class', `query-wire ${selectedConnection === index ? 'selected' : ''}`);
                wire.dataset.connectionIndex = String(index);
                wires.append(shadow, wire);
            });
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

        canvas.addEventListener('click', event => {
            const wire = event.target.closest('.query-wire:not(.shadow)');
            if (wire) {
                selectedConnection = Number(wire.dataset.connectionIndex);
                pendingPort = null;
                canvas.querySelectorAll('.query-port.pending').forEach(port => port.classList.remove('pending'));
                drawWires();
                return;
            }

            const port = event.target.closest('[data-ref]');
            if (!port) {
                return;
            }

            selectedConnection = null;
            if (!pendingPort) {
                pendingPort = port;
                port.classList.add('pending');
                drawWires();
                return;
            }

            const from = pendingPort.dataset.ref;
            const to = port.dataset.ref;
            if (from !== to && pendingPort.dataset.table !== port.dataset.table) {
                connections.push({ from, to });
            }
            pendingPort.classList.remove('pending');
            pendingPort = null;
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
            pendingPort = null;
            canvas.querySelectorAll('.query-port.pending').forEach(port => port.classList.remove('pending'));
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

activateRibbonTab('home');
loadView(app.dataset.initialView || 'table-customers');
