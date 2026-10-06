const fileBackstage = document.querySelector('#file-backstage');
let fileBackstageSection = 'home';
let fileBackstagePreviousRibbon = 'home';
let fileCatalog = { databases: [] };
let fileServerCatalog = [];
let fileSelectedDatabase = '';
let fileSelectedTables = [];
let fileDatabaseFilter = '';
let fileDatabasePreviewRequest = 0;
let fileDatabaseOpening = false;

function formatDatabaseBytes(bytes) {
    const value = Number(bytes || 0);
    return value < 1024 ? `${value} B` : value < 1048576 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1048576).toFixed(1)} MB`;
}
function formatDatabaseDate(value) { return value ? new Date(value).toLocaleString() : ''; }
async function databaseApi(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'The operation failed.');
    return result;
}
async function fetchDatabaseCatalog(database = '', source = 'files') {
    return databaseApi(`api/databases.php?${new URLSearchParams(database ? { database } : { source })}`, { cache: 'no-store' });
}
async function postDatabaseAction(action, database, engine = 'sqlite') {
    const result = await databaseApi('api/databases.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, database, engine }) });
    if (result.database) setActiveDatabaseReference(result.database);
    if (result.item) rememberDatabase(result.item);
    return result;
}
async function fileAction(action, values = {}) {
    return databaseApi('api/files.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...values }) });
}
function fileSidebarMarkup() {
    return `<aside class="file-backstage-sidebar"><button type="button" class="file-back-button" data-file-close title="Back to database"><i class="fas fa-arrow-left"></i></button>
        <div class="file-brand"><strong>AcaciaDB</strong><span>Your databases</span></div>
        ${[['home','home','Home'],['new','file','New'],['open','folder-open','Open']].map(([section, icon, label]) => `<button type="button" class="file-nav-item ${fileBackstageSection === section ? 'active' : ''}" data-file-section="${section}"><i class="fas fa-${icon}"></i><span>${label}</span></button>`).join('')}
        <div class="file-nav-divider"></div><button class="file-nav-item" data-file-section="connection"><i class="fas fa-server"></i><span>MariaDB / MySQL</span></button>
        <div class="file-nav-spacer"></div><button class="file-nav-item" data-file-close><i class="fas fa-times"></i><span>Close</span></button></aside>`;
}
function databaseListMarkup(databases = []) {
    const filtered = databases.filter(item => item.name.toLowerCase().includes(fileDatabaseFilter.toLowerCase()));
    return filtered.length ? filtered.map(item => `<div class="database-list-entry"><button type="button" class="database-list-row ${fileSelectedDatabase === item.id ? 'active' : ''}" data-database-id="${escapeHtml(item.id)}" title="Open ${escapeHtml(item.name)}">
        <span class="database-file-icon"><i class="fas fa-${item.engine === 'mysql' ? 'server' : 'database'}"></i></span>
        <span class="database-list-name"><strong>${escapeHtml(item.name)}</strong><small>${item.demo ? 'Your editable demo copy' : item.engine === 'mysql' ? 'MariaDB / MySQL' : 'SQLite file'}${item.sizeBytes ? ` · ${formatDatabaseBytes(item.sizeBytes)}` : ''}</small></span>
        <span class="database-list-date">${escapeHtml(formatDatabaseDate(item.openedAt || item.updatedAt))}</span><i class="fas fa-chevron-right"></i></button><button type="button" class="database-details-button" data-database-details="${escapeHtml(item.id)}" aria-label="Details for ${escapeHtml(item.name)}">Details</button></div>`).join('') : '<div class="file-empty-state">No databases to show.</div>';
}
function databaseFilterMarkup() {
    return `<label class="database-filter"><i class="fas fa-search"></i><input type="search" data-database-filter value="${escapeHtml(fileDatabaseFilter)}" placeholder="Filter databases" aria-label="Filter databases"></label>`;
}
function uploadMarkup() {
    return `<label class="file-upload-button"><i class="fas fa-upload"></i> Upload SQLite or Access file<input type="file" data-database-upload accept=".sqlite,.sqlite3,.db,.mdb,.accdb" hidden></label>`;
}
function serverTileMarkup() {
    const settings = savedMysqlConnection();
    return `<button class="file-server-tile" data-file-section="connection"><i class="fas fa-server"></i><span><strong>MariaDB / MySQL</strong><small>${settings ? escapeHtml(`${settings.host}:${settings.port} · ${settings.username}`) : 'Set up a local or remote server connection'}</small></span><i class="fas fa-chevron-right"></i></button>`;
}
function tableOverviewMarkup(tables = []) {
    return tables.length ? `<div class="database-table-header"><span>Table</span><span>Columns</span><span>Rows</span><span>Size</span></div>${tables.map(table => `<div class="database-table-row"><span class="database-table-name"><i class="fas fa-table"></i><strong>${escapeHtml(table.name)}</strong></span><span>${table.columns}</span><span>${table.rows}</span><span>${table.sizeBytes ? formatDatabaseBytes(table.sizeBytes) : '—'}</span></div>`).join('')}` : '<div class="file-empty-state">This database is empty. Open it and create a table.</div>';
}
function selectedFileItem() { return [...fileCatalog.databases, ...fileServerCatalog].find(item => item.id === fileSelectedDatabase); }
function databaseDetailMarkup(loading = false) {
    if (!fileSelectedDatabase) return '<div class="file-empty-state">Click a database to open it, or Details to see its tables and file options.</div>';
    const item = selectedFileItem() || { name: fileSelectedDatabase };
    return `<div class="database-detail-title"><div><h2>${escapeHtml(item.name)}</h2><p>${loading ? 'Reading tables…' : `${fileSelectedTables.length} tables`}</p></div></div>
        <div class="file-database-actions"><button class="open-database-button" data-open-selected-database ${loading ? 'disabled' : ''}>Open Database</button>
        ${fileSelectedDatabase.startsWith('sqlite:') ? `<button data-download-database>Download SQLite</button><button data-delete-database>${item.demo ? 'Reset Demo' : 'Delete'}</button>` : ''}</div>
        ${item.demo ? '<p class="file-help">This is your private demo copy. Changes do not affect anyone else.</p>' : ''}
        <div class="database-table-list">${loading ? '' : tableOverviewMarkup(fileSelectedTables)}</div>`;
}
function visibleRecentDatabases() {
    const fileIds = new Set(fileCatalog.databases.map(item => item.id));
    return recentDatabases().filter(item => item.engine === 'mysql' ? item.connection === mysqlConnectionIdentity() : fileIds.has(item.id)).slice(0, 10);
}
function fileHomeMarkup() {
    return `<section class="file-page file-home-page"><h1>Home</h1><div class="file-toolbar"><button data-file-section="new">New database</button>${uploadMarkup()}<button data-file-section="open">Open</button></div>
        <div class="file-section-title"><h2>Recent databases</h2><span>Last 10 opened</span></div><div class="database-list">${databaseListMarkup(visibleRecentDatabases())}</div>${serverTileMarkup()}</section>`;
}
function fileNewMarkup() {
    return `<section class="file-page file-new-page"><h1>New</h1><form class="new-database-form" data-create-database-form><h2>Create a database</h2>
        <label>Database name<input name="database" placeholder="My database" required maxlength="120"></label>
        <label>Type<select name="engine"><option value="sqlite">SQLite file</option><option value="mysql" ${savedMysqlConnection() ? '' : 'disabled'}>MariaDB / MySQL</option></select></label>
        <p class="file-help">SQLite files stay in your browser's workspace and can be downloaded. Server databases are created on your configured MariaDB/MySQL connection.</p>
        ${savedMysqlConnection() ? '' : '<button type="button" data-file-section="connection">Set up MariaDB / MySQL</button>'}<button type="submit">Create</button></form></section>`;
}
function fileOpenMarkup() {
    return `<section class="file-page file-open-page"><h1>Open</h1><div class="file-toolbar">${uploadMarkup()}</div><div class="file-open-layout"><div class="database-browser"><h2>Your files</h2>${databaseFilterMarkup()}<div class="database-list">${databaseListMarkup(fileCatalog.databases)}</div>${serverTileMarkup()}</div><div class="database-detail-panel">${databaseDetailMarkup()}</div></div></section>`;
}
function fileConnectionMarkup() {
    const settings = savedMysqlConnection() || { host: 'localhost', port: 3306, username: '', password: '' };
    return `<section class="file-page"><h1>MariaDB / MySQL</h1><form class="file-connection-form" data-connection-form>
        ${[['host','Server','text'],['port','Port','number'],['username','Username','text'],['password','Password','password']].map(([key,label,type]) => `<label>${label}<input name="${key}" type="${type}" value="${escapeHtml(settings[key])}" ${key === 'password' ? 'autocomplete="current-password"' : 'required'} ${key === 'port' ? 'min="1" max="65535"' : ''}></label>`).join('')}
        <div class="file-toolbar"><button type="submit">Save & Connect</button>${savedMysqlConnection() ? '<button type="button" data-forget-connection>Forget Connection</button>' : ''}</div></form>
        <p class="file-help">Connection settings are saved in this browser. The application server connects to the host you specify.</p>
        ${savedMysqlConnection() ? `<div class="file-open-layout"><div class="database-browser"><div class="file-section-title"><h2>Server databases</h2><button data-refresh-server>Refresh</button></div><div class="database-list">${databaseListMarkup(fileServerCatalog)}</div></div><div class="database-detail-panel">${databaseDetailMarkup()}</div></div>` : ''}</section>`;
}
function renderFileBackstage() {
    const body = fileBackstageSection === 'new' ? fileNewMarkup() : fileBackstageSection === 'open' ? fileOpenMarkup() : fileBackstageSection === 'connection' ? fileConnectionMarkup() : fileHomeMarkup();
    fileBackstage.innerHTML = `${fileSidebarMarkup()}<main class="file-backstage-main">${body}</main>`;
}
function showFileScanOverlay(message = 'Loading…', detail = '') {
    hideFileScanOverlay();
    fileBackstage.insertAdjacentHTML('beforeend', `<div class="file-scan-overlay backstage-scan-overlay" role="status"><span class="file-scan-spinner"><i class="fas fa-spinner fa-spin"></i></span><strong>${escapeHtml(message)}</strong><small>${escapeHtml(detail)}</small></div>`);
}
function hideFileScanOverlay() { fileBackstage.querySelector(':scope > .file-scan-overlay')?.remove(); }
function fileError(error) {
    hideFileScanOverlay();
    fileBackstage.querySelector('.file-load-error')?.remove();
    fileBackstage.querySelector('.file-backstage-main').insertAdjacentHTML('afterbegin', `<div class="file-load-error" role="alert">${escapeHtml(error.message)}</div>`);
}
async function refreshDatabaseWorkspace(database) {
    setActiveDatabaseReference(database);
    databasePromise = null;
    const db = await getDatabase();
    currentDatabaseName = db.database || database;
    configureObjectMaps(db); renderObjectList(db);
    openTabs = []; currentView = '';
    window.acaciadbActiveDesignController = null; window.acaciadbActiveObjectController = null; window.acaciadbActiveTableController = null;
    updateQuickSaveState(); persistWorkspaceState(); renderDocumentTabs(); setActiveObject(''); updateContextualRibbon(''); renderStatusViewButtons();
    content.innerHTML = '<div class="p-6 text-neutral-500">Double-click a table or object to open it.</div>';
    status.textContent = `${db.displayName || database} ready`;
    document.querySelector('#database-title').textContent = `${db.displayName || database} : AcaciaDB`;
    document.title = `${db.displayName || database} - AcaciaDB`;
    return db;
}
async function prepareDatabaseSwitch() {
    while (openTabs.length) {
        const count = openTabs.length;
        await closeActiveTab();
        if (openTabs.length === count) return false;
    }
    return true;
}
async function previewBackstageDatabase(reference) {
    const request = ++fileDatabasePreviewRequest;
    fileSelectedDatabase = reference; fileSelectedTables = [];
    fileBackstageSection = reference.startsWith('mysql:') ? 'connection' : 'open';
    renderFileBackstage();
    fileBackstage.querySelector('.database-detail-panel').innerHTML = databaseDetailMarkup(true);
    const result = await fetchDatabaseCatalog(reference);
    if (request !== fileDatabasePreviewRequest) return;
    if (result.item?.engine === 'mysql' && !fileServerCatalog.some(item => item.id === reference)) fileServerCatalog.push(result.item);
    fileSelectedTables = result.tables;
    fileBackstage.querySelector('.database-detail-panel').innerHTML = databaseDetailMarkup();
}
async function openSelectedBackstageDatabase(reference = fileSelectedDatabase) {
    if (!reference || fileDatabaseOpening) return;
    fileDatabaseOpening = true;
    ++fileDatabasePreviewRequest;
    try {
        if (!await prepareDatabaseSwitch()) return;
        showFileScanOverlay('Opening database…');
        const result = await postDatabaseAction('open', reference);
        await refreshDatabaseWorkspace(result.database);
        closeFileBackstage();
    } finally { fileDatabaseOpening = false; hideFileScanOverlay(); }
}
async function loadServerCatalog() {
    showFileScanOverlay('Connecting to MariaDB / MySQL…');
    try { fileServerCatalog = (await fetchDatabaseCatalog('', 'mysql')).databases; renderFileBackstage(); }
    finally { hideFileScanOverlay(); }
}
async function openFileBackstage(section = 'home') {
    fileBackstagePreviousRibbon = currentRibbon === 'file' ? 'home' : currentRibbon;
    fileBackstageSection = section; fileBackstage.hidden = false; fileDatabaseFilter = '';
    document.querySelectorAll('.ribbon-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.ribbon === 'file'));
    renderFileBackstage(); showFileScanOverlay('Loading your databases…');
    try {
        fileCatalog = await fetchDatabaseCatalog();
        if (!visibleRecentDatabases().length) rememberDatabase(fileCatalog.databases.find(item => item.demo));
        renderFileBackstage();
    } catch (error) { fileError(error); } finally { hideFileScanOverlay(); }
}
function closeFileBackstage() { fileBackstage.hidden = true; activateRibbonTab(fileBackstagePreviousRibbon || 'home'); }
async function downloadSelectedDatabase() {
    const response = await fetch(`api/files.php?${new URLSearchParams({ action: 'download', database: fileSelectedDatabase })}`);
    if (!response.ok) throw new Error((await response.json()).error);
    const blob = await response.blob(); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${selectedFileItem()?.name || 'database'}.sqlite`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function deleteSelectedDatabase() {
    const item = selectedFileItem();
    const choice = await showChoiceDialog({ title: item.demo ? 'Reset Demo' : 'Delete Database', message: item.demo ? 'Replace your demo copy with the original Northwind? Your edits will be removed.' : `Delete ${item.name} from your workspace? Download a copy first if you want to keep it.`, choices: [{ value: 'cancel', label: 'Cancel' }, { value: 'delete', label: item.demo ? 'Reset Demo' : 'Delete', primary: true }] });
    if (choice !== 'delete') return;
    const wasActive = activeDatabaseReference === item.id;
    if (wasActive && !await prepareDatabaseSwitch()) return;
    await fileAction(item.demo ? 'reset' : 'delete', { database: item.id });
    localStorage.setItem(recentDatabaseStorageKey, JSON.stringify(recentDatabases().filter(old => old.id !== item.id)));
    if (wasActive) await refreshDatabaseWorkspace('sqlite:demo');
    fileSelectedDatabase = ''; fileSelectedTables = [];
    fileCatalog = await fetchDatabaseCatalog(); renderFileBackstage();
}
async function showAccessImportWizard(upload) {
    const dialog = document.createElement('dialog'); dialog.className = 'acaciadb-dialog file-import-dialog';
    const objectList = (kind, title) => `<fieldset><legend>${title}</legend>${upload.manifest[kind].map((item,index) => `<label class="file-import-object"><input type="checkbox" data-import-kind="${kind}" data-import-index="${index}" ${item.supported ? kind === 'tables' ? 'checked' : '' : 'disabled'}><span><strong>${escapeHtml(item.name)}</strong><small>${item.supported ? kind === 'tables' ? `${item.rowCount} rows · ${item.columns.length} columns` : 'Save Access SQL definition' : escapeHtml(item.reason)}</small></span></label>`).join('') || '<p>No objects found.</p>'}</fieldset>`;
    dialog.innerHTML = `<form><div class="acaciadb-dialog-title"><span>Import Access Database</span><button type="button" data-import-cancel aria-label="Close">×</button></div><div class="file-import-body"><label>Database name<input name="databaseName" value="${escapeHtml(upload.name)}" required maxlength="120"></label><p>Choose the tables and saved query definitions to import into a new SQLite file.</p><div class="file-toolbar"><button type="button" data-import-all>Select all supported</button><button type="button" data-import-none>Clear selection</button></div>${objectList('tables','Tables')}${objectList('queries','Queries')}<p class="file-help">Linked data and complex attachment/multivalue fields are unavailable. Forms, reports, macros and VBA are not converted. Saved queries retain Access SQL and may need changes for SQLite.</p><p data-import-error role="alert"></p></div><div class="dialog-actions"><button type="button" data-import-cancel>Cancel</button><button class="primary" type="submit">Import Selected</button></div></form>`;
    document.body.appendChild(dialog);
    let importing = false; let imported = false;
    dialog.addEventListener('cancel', event => { if (importing) event.preventDefault(); });
    dialog.querySelectorAll('[data-import-cancel]').forEach(button => button.onclick = () => { if (!importing) dialog.close(); });
    dialog.querySelector('[data-import-all]').onclick = () => dialog.querySelectorAll('input[type=checkbox]:not(:disabled)').forEach(input => { input.checked = true; });
    dialog.querySelector('[data-import-none]').onclick = () => dialog.querySelectorAll('input[type=checkbox]').forEach(input => { input.checked = false; });
    dialog.addEventListener('close', () => { dialog.remove(); if (!imported) fileAction('cancelImport', { token: upload.token }).catch(fileError); }, { once: true });
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault(); if (importing) return;
        const selection = { tables: [], queries: [] };
        dialog.querySelectorAll('input[type=checkbox]:checked').forEach(input => selection[input.dataset.importKind].push(upload.manifest[input.dataset.importKind][Number(input.dataset.importIndex)].name));
        if (!selection.tables.length && !selection.queries.length) { dialog.querySelector('[data-import-error]').textContent = 'Choose at least one object.'; return; }
        importing = true; dialog.querySelector('form').inert = true;
        const button = dialog.querySelector('[type=submit]'); button.textContent = 'Converting…';
        try {
            const result = await fileAction('import', { token: upload.token, name: dialog.querySelector('[name=databaseName]').value, selection });
            imported = true; importing = false; dialog.close();
            fileCatalog = await fetchDatabaseCatalog(); await previewBackstageDatabase(result.item.id);
            await showMessageDialog({ title: 'Import Complete', message: `${Object.keys(result.counts).length} tables and ${result.queries} query definitions imported. ${result.warnings.join(' ')}`, confirmText: 'OK' });
        } catch (error) { dialog.querySelector('[data-import-error]').textContent = error.message; }
        finally { importing = false; dialog.querySelector('form').inert = false; button.textContent = 'Import Selected'; }
    };
    showMovableModal(dialog);
}
fileBackstage.addEventListener('click', async event => {
    try {
        if (event.target.closest('[data-file-close]')) { closeFileBackstage(); return; }
        const section = event.target.closest('[data-file-section]');
        if (section) {
            fileBackstageSection = section.dataset.fileSection; fileDatabaseFilter = ''; fileSelectedDatabase = ''; renderFileBackstage();
            if (fileBackstageSection === 'connection' && savedMysqlConnection()) await loadServerCatalog();
            return;
        }
        const database = event.target.closest('[data-database-id]');
        if (database) { await openSelectedBackstageDatabase(database.dataset.databaseId); return; }
        const details = event.target.closest('[data-database-details]');
        if (details) { await previewBackstageDatabase(details.dataset.databaseDetails); return; }
        if (event.target.closest('[data-open-selected-database]')) await openSelectedBackstageDatabase();
        if (event.target.closest('[data-download-database]')) await downloadSelectedDatabase();
        if (event.target.closest('[data-delete-database]')) await deleteSelectedDatabase();
        if (event.target.closest('[data-refresh-server]')) await loadServerCatalog();
        if (event.target.closest('[data-forget-connection]')) {
            if (activeDatabaseReference.startsWith('mysql:') && !await prepareDatabaseSwitch()) return;
            localStorage.removeItem(connectionStorageKey); fileServerCatalog = []; fileSelectedDatabase = '';
            if (activeDatabaseReference.startsWith('mysql:')) await refreshDatabaseWorkspace('sqlite:demo');
            renderFileBackstage();
        }
    } catch (error) { fileError(error); }
});
fileBackstage.addEventListener('input', event => {
    if (!event.target.matches('[data-database-filter]')) return;
    fileDatabaseFilter = event.target.value;
    fileBackstage.querySelector('.database-browser .database-list').innerHTML = databaseListMarkup(fileCatalog.databases);
});
fileBackstage.addEventListener('change', async event => {
    if (!event.target.matches('[data-database-upload]') || !event.target.files[0]) return;
    showFileScanOverlay('Reading uploaded database…');
    try {
        const data = new FormData(); data.append('file', event.target.files[0]);
        const result = await databaseApi('api/files.php', { method: 'POST', body: data });
        hideFileScanOverlay();
        if (result.kind === 'access') await showAccessImportWizard(result);
        else { fileCatalog = await fetchDatabaseCatalog(); await previewBackstageDatabase(result.item.id); }
    } catch (error) { fileError(error); } finally { hideFileScanOverlay(); }
});
fileBackstage.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    try {
        if (form.matches('[data-connection-form]')) {
            if (activeDatabaseReference.startsWith('mysql:')) {
                if (!await prepareDatabaseSwitch()) return;
                await refreshDatabaseWorkspace('sqlite:demo');
            }
            const values = Object.fromEntries(new FormData(form)); values.port = Number(values.port);
            localStorage.setItem(connectionStorageKey, JSON.stringify(values)); fileSelectedDatabase = '';
            await loadServerCatalog();
        }
        if (form.matches('[data-create-database-form]')) {
            if (!await prepareDatabaseSwitch()) return;
            showFileScanOverlay('Creating database…');
            const result = await postDatabaseAction('create', form.elements.database.value.trim(), form.elements.engine.value);
            await refreshDatabaseWorkspace(result.database); closeFileBackstage();
        }
    } catch (error) { fileError(error); } finally { hideFileScanOverlay(); }
});
