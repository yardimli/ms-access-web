const fileBackstage = document.querySelector('#file-backstage');
let fileBackstageSection = 'home';
let fileCatalog = null;
let fileSelectedDatabase = '';
let fileSelectedTables = [];
let fileBackstagePreviousRibbon = 'home';
let fileDatabaseFilter = '';
let fileDatabasePreviewRequest = 0;

function formatDatabaseBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDatabaseDate(value) {
    if (!value) return 'No recent changes';
    const date = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

async function fetchDatabaseCatalog(database = '') {
    const query = database ? `?database=${encodeURIComponent(database)}` : '';
    const response = await fetch(`api/databases.php${query}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to load databases.');
    }
    return payload;
}

async function postDatabaseAction(action, database) {
    const response = await fetch('api/databases.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ action, database })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'The database action failed.');
    }
    return payload;
}

function fileSidebarMarkup() {
    const item = (section, icon, label) => `
        <button type="button" class="file-nav-item ${fileBackstageSection === section ? 'active' : ''}" data-file-section="${section}">
            <i class="${icon}"></i><span>${label}</span>
        </button>`;
    return `
        <aside class="file-backstage-sidebar">
            <button type="button" class="file-back-button" data-file-close title="Back to database"><i class="fas fa-arrow-left"></i></button>
            <div class="file-brand">
                <img src="assets/acaciadb-icon.png" alt="" aria-hidden="true">
                <strong>AcaciaDB</strong>
                <span>Desktop Database</span>
            </div>
            ${item('home', 'fas fa-home', 'Home')}
            ${item('new', 'far fa-file', 'New')}
            ${item('open', 'far fa-folder-open', 'Open')}
            <div class="file-nav-divider"></div>
            <button type="button" class="file-nav-item muted"><i class="fas fa-info-circle"></i><span>Info</span></button>
            <button type="button" class="file-nav-item muted"><i class="fas fa-save"></i><span>Save</span></button>
            <button type="button" class="file-nav-item muted"><i class="fas fa-print"></i><span>Print</span></button>
            <button type="button" class="file-nav-item" data-file-close><i class="fas fa-times"></i><span>Close</span></button>
            <div class="file-nav-spacer"></div>
            <button type="button" class="file-nav-item muted"><i class="fas fa-user"></i><span>Account</span></button>
            <button type="button" class="file-nav-item muted"><i class="fas fa-cog"></i><span>Options</span></button>
        </aside>`;
}

function blankDatabaseTile() {
    return `
        <button type="button" class="blank-database-tile" data-file-section="new">
            <span class="blank-database-icon"><i class="far fa-file"></i><i class="fas fa-database"></i></span>
            <strong>Blank database</strong>
        </button>`;
}

function databaseListMarkup(databases = []) {
    if (!databases.length) {
        return '<div class="file-empty-state">No user databases are visible to this MariaDB account.</div>';
    }
    const filter = fileDatabaseFilter.trim().toLowerCase();
    const visibleCount = databases.filter(database => database.name.toLowerCase().includes(filter)).length;
    return databases.map(database => `
        <button type="button" class="database-list-row ${database.name === fileSelectedDatabase ? 'active' : ''}" data-database-name="${escapeHtml(database.name)}" ${database.name.toLowerCase().includes(filter) ? '' : 'hidden'}>
            <span class="database-file-icon"><i class="fas fa-database"></i></span>
            <span class="database-list-name"><strong>${escapeHtml(database.name)}</strong><small>${database.tableCount} tables &middot; ${formatDatabaseBytes(database.sizeBytes)}</small></span>
            <span class="database-list-date">${escapeHtml(formatDatabaseDate(database.updatedAt))}</span>
            <i class="fas fa-chevron-right"></i>
        </button>`).join('') + `<div class="file-empty-state database-filter-empty" ${visibleCount ? 'hidden' : ''}>No databases match this filter.</div>`;
}

function databaseFilterMarkup() {
    return `
        <label class="database-filter">
            <i class="fas fa-search" aria-hidden="true"></i>
            <input type="search" data-database-filter value="${escapeHtml(fileDatabaseFilter)}" placeholder="Filter databases" aria-label="Filter databases">
            <button type="button" data-clear-database-filter title="Clear filter" ${fileDatabaseFilter ? '' : 'hidden'}><i class="fas fa-times"></i></button>
        </label>`;
}

function tableOverviewMarkup(tables = []) {
    if (!tables.length) {
        return '<div class="file-empty-state compact">This database is blank. Create a table from the Create ribbon after returning to the editor.</div>';
    }
    return `
        <div class="database-table-header"><span>Table</span><span>Columns</span><span>Rows</span><span>Size</span></div>
        ${tables.map(table => `
            <div class="database-table-row">
                <span class="database-table-name"><i class="fas fa-table"></i><strong>${escapeHtml(table.name)}</strong></span>
                <span>${table.columns}</span><span>${table.rows}</span><span>${formatDatabaseBytes(table.sizeBytes)}</span>
            </div>`).join('')}`;
}

function databaseDetailMarkup(loading = false) {
    if (!fileSelectedDatabase) {
        return '<div class="file-empty-state">Select a database to inspect its tables.</div>';
    }
    return `
        <div class="database-detail-title">
            <span><i class="fas fa-database"></i></span>
            <div><h2>${escapeHtml(fileSelectedDatabase)}</h2><p>${loading ? 'Loading tables...' : `${fileSelectedTables.length} editable tables`}</p></div>
            <button type="button" class="open-database-button" data-open-selected-database ${loading ? 'disabled' : ''}><i class="far fa-folder-open"></i> Open Database</button>
        </div>
        <div class="database-table-list">${loading ? '' : tableOverviewMarkup(fileSelectedTables)}</div>
        ${loading ? '<div class="file-scan-overlay table-scan-overlay" role="status" aria-live="polite"><span class="file-scan-spinner"><i class="fas fa-spinner fa-spin"></i></span><strong>Scanning tables...</strong><small>Reading table structure and statistics</small></div>' : ''}`;
}

function updateDatabaseDetailPanel(loading = false) {
    const panel = fileBackstage?.querySelector('.database-detail-panel');
    if (panel) panel.innerHTML = databaseDetailMarkup(loading);
}

function updateDatabaseListSelection() {
    fileBackstage?.querySelectorAll('.database-list-row[data-database-name]').forEach(row => {
        row.classList.toggle('active', row.dataset.databaseName === fileSelectedDatabase);
    });
}

function fileHomeMarkup() {
    return `
        <section class="file-page file-home-page">
            <h1>Good afternoon</h1>
            <div class="file-template-band">${blankDatabaseTile()}</div>
            <div class="file-section-title"><h2>Databases</h2><button type="button" data-file-section="open">More databases <i class="fas fa-arrow-right"></i></button></div>
            ${databaseFilterMarkup()}
            <div class="database-list">${databaseListMarkup(fileCatalog?.databases || [])}</div>
        </section>`;
}

function fileNewMarkup() {
    return `
        <section class="file-page file-new-page">
            <h1>New</h1>
            <div class="new-database-panel">
                ${blankDatabaseTile()}
                <form class="new-database-form" data-create-database-form>
                    <h2>Create a blank database</h2>
                    <label>Database name<input name="database" placeholder="acaciadb_project" autocomplete="off" required></label>
                    <p>Use a SQL-safe name. AcaciaDB will initialize its object definitions and column history automatically.</p>
                    <div class="file-form-error" data-file-error hidden></div>
                    <button type="submit"><i class="fas fa-plus"></i> Create</button>
                </form>
            </div>
        </section>`;
}

function fileOpenMarkup() {
    return `
        <section class="file-page file-open-page">
            <h1>Open</h1>
            <div class="file-open-layout">
                <div class="database-browser">
                    <h2>Databases visible to this account</h2>
                    ${databaseFilterMarkup()}
                    <div class="database-list">${databaseListMarkup(fileCatalog?.databases || [])}</div>
                </div>
                <div class="database-detail-panel">
                    ${databaseDetailMarkup()}
                </div>
            </div>
        </section>`;
}

function renderFileBackstage() {
    if (!fileBackstage) return;
    const body = fileBackstageSection === 'new' ? fileNewMarkup() : fileBackstageSection === 'open' ? fileOpenMarkup() : fileHomeMarkup();
    fileBackstage.innerHTML = `${fileSidebarMarkup()}<main class="file-backstage-main">${body}</main>`;
}

function showFileScanOverlay(message = 'Scanning databases...', detail = 'Reading available schemas and statistics') {
    fileBackstage?.querySelector(':scope > .file-scan-overlay')?.remove();
    fileBackstage?.insertAdjacentHTML('beforeend', `
        <div class="file-scan-overlay backstage-scan-overlay" role="status" aria-live="polite">
            <span class="file-scan-spinner"><i class="fas fa-spinner fa-spin"></i></span>
            <strong>${escapeHtml(message)}</strong>
            <small>${escapeHtml(detail)}</small>
        </div>`);
}

function hideFileScanOverlay() {
    fileBackstage?.querySelector(':scope > .file-scan-overlay')?.remove();
}

async function refreshDatabaseWorkspace(database) {
    databasePromise = null;
    const db = await getDatabase();
    currentDatabaseName = db.database || database;
    configureObjectMaps(db);
    renderObjectList(db);
    openTabs = [];
    currentView = '';
    persistWorkspaceState();
    renderDocumentTabs();
    setActiveObject('');
    updateContextualRibbon('');
    renderStatusViewButtons();
    content.innerHTML = '<div class="p-6 text-neutral-500">Choose a table from File &gt; Open or the object pane.</div>';
    status.textContent = `${database} ready`;
    const title = document.querySelector('#database-title');
    if (title) title.textContent = `${database} : AcaciaDB`;
    document.title = `${database} - AcaciaDB`;
    return db;
}

async function previewBackstageDatabase(database) {
    const requestId = ++fileDatabasePreviewRequest;
    const alreadyOnOpenPage = fileBackstageSection === 'open';
    fileSelectedDatabase = database;
    fileBackstageSection = 'open';
    fileSelectedTables = [];
    if (alreadyOnOpenPage) {
        updateDatabaseListSelection();
        updateDatabaseDetailPanel(true);
    } else {
        renderFileBackstage();
        updateDatabaseDetailPanel(true);
    }
    const detail = await fetchDatabaseCatalog(database);
    if (requestId !== fileDatabasePreviewRequest || fileSelectedDatabase !== database) return;
    fileSelectedTables = detail.tables || [];
    updateDatabaseDetailPanel(false);
}

async function openSelectedBackstageDatabase() {
    if (!fileSelectedDatabase) return;
    showFileScanOverlay('Opening database...', `Loading ${fileSelectedDatabase}`);
    try {
        const payload = await postDatabaseAction('open', fileSelectedDatabase);
        await refreshDatabaseWorkspace(payload.database);
        fileCatalog = await fetchDatabaseCatalog();
        closeFileBackstage();
    } finally {
        hideFileScanOverlay();
    }
}

async function openFileBackstage(section = 'home') {
    if (!fileBackstage) return;
    fileBackstagePreviousRibbon = currentRibbon === 'file' ? 'home' : currentRibbon;
    fileBackstageSection = section;
    fileBackstage.hidden = false;
    document.querySelectorAll('.ribbon-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.ribbon === 'file'));
    renderFileBackstage();
    showFileScanOverlay('Scanning databases...', 'Reading available schemas and statistics');
    try {
        fileCatalog = await fetchDatabaseCatalog();
        if (!fileSelectedDatabase) {
            fileSelectedDatabase = fileCatalog.activeDatabase || '';
        }
        if (fileBackstageSection === 'open' && fileSelectedDatabase) {
            const detail = await fetchDatabaseCatalog(fileSelectedDatabase);
            fileSelectedTables = detail.tables || [];
        }
        renderFileBackstage();
    } catch (error) {
        fileBackstage.querySelector('.file-backstage-main').innerHTML = `<div class="file-load-error">${escapeHtml(error.message)}</div>`;
    } finally {
        hideFileScanOverlay();
    }
}

function closeFileBackstage() {
    if (!fileBackstage) return;
    fileBackstage.hidden = true;
    activateRibbonTab(fileBackstagePreviousRibbon || 'home');
}

fileBackstage?.addEventListener('click', async event => {
    const close = event.target.closest('[data-file-close]');
    if (close) {
        closeFileBackstage();
        return;
    }

    const clearFilter = event.target.closest('[data-clear-database-filter]');
    if (clearFilter) {
        fileDatabaseFilter = '';
        renderFileBackstage();
        fileBackstage.querySelector('[data-database-filter]')?.focus();
        return;
    }

    const section = event.target.closest('[data-file-section]');
    if (section) {
        fileBackstageSection = section.dataset.fileSection;
        renderFileBackstage();
        if (fileBackstageSection === 'open' && fileSelectedDatabase) {
            updateDatabaseDetailPanel(true);
            try {
                const detail = await fetchDatabaseCatalog(fileSelectedDatabase);
                fileSelectedTables = detail.tables || [];
                updateDatabaseDetailPanel(false);
            } catch (error) {
                fileBackstage.querySelector('.database-detail-panel').innerHTML = `<div class="file-load-error">${escapeHtml(error.message)}</div>`;
            }
        }
        return;
    }

    const databaseButton = event.target.closest('[data-database-name]');
    if (databaseButton) {
        try {
            await previewBackstageDatabase(databaseButton.dataset.databaseName);
        } catch (error) {
            const panel = fileBackstage.querySelector('.database-detail-panel') || fileBackstage.querySelector('.file-page');
            panel.insertAdjacentHTML('afterbegin', `<div class="file-load-error">${escapeHtml(error.message)}</div>`);
        }
        return;
    }

    const openDatabaseButton = event.target.closest('[data-open-selected-database]');
    if (openDatabaseButton) {
        openDatabaseButton.disabled = true;
        try {
            await openSelectedBackstageDatabase();
        } catch (error) {
            openDatabaseButton.disabled = false;
            const panel = fileBackstage.querySelector('.database-detail-panel');
            panel.insertAdjacentHTML('afterbegin', `<div class="file-load-error">${escapeHtml(error.message)}</div>`);
        }
    }
});

fileBackstage?.addEventListener('input', event => {
    const input = event.target.closest('[data-database-filter]');
    if (!input) return;
    fileDatabaseFilter = input.value;
    const filter = fileDatabaseFilter.trim().toLowerCase();
    let visibleCount = 0;
    fileBackstage.querySelectorAll('.database-list-row[data-database-name]').forEach(row => {
        const visible = row.dataset.databaseName.toLowerCase().includes(filter);
        row.hidden = !visible;
        if (visible) visibleCount += 1;
    });
    const empty = fileBackstage.querySelector('.database-filter-empty');
    if (empty) empty.hidden = visibleCount > 0;
    const clear = fileBackstage.querySelector('[data-clear-database-filter]');
    if (clear) clear.hidden = !fileDatabaseFilter;
});

fileBackstage?.addEventListener('submit', async event => {
    const form = event.target.closest('[data-create-database-form]');
    if (!form) return;
    event.preventDefault();
    const input = form.elements.database;
    const errorBox = form.querySelector('[data-file-error]');
    errorBox.hidden = true;
    showFileScanOverlay('Creating database...', 'Initializing AcaciaDB helper tables');
    try {
        const payload = await postDatabaseAction('create', input.value.trim());
        fileSelectedDatabase = payload.database;
        fileSelectedTables = payload.tables || [];
        await refreshDatabaseWorkspace(payload.database);
        fileCatalog = await fetchDatabaseCatalog();
        fileBackstageSection = 'open';
        renderFileBackstage();
    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
    } finally {
        hideFileScanOverlay();
    }
});
