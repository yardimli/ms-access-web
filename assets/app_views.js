const workspaceStateStorageKey = 'acaciadb.workspace.v1';

async function tableLayoutSession(tableName) {
    const tab = findOpenObjectTab(currentView);
    if (tab.layout) return tab.layout;
    const saved = readTablePrefs(tableName);
    let prefs = {};
    if (Object.keys(saved).length) {
        const choice = await showChoiceDialog({
            title: `Load Saved Layout: ${tableName}`,
            message: 'Load the saved column order, widths, and sort order?',
            choices: [
                { value: 'yes', label: 'Yes', primary: true },
                { value: 'no', label: 'No' },
                { value: 'forget', label: 'No and Forget It' }
            ]
        });
        if (choice === 'yes') prefs = saved;
        if (choice === 'forget') localStorage.removeItem(tablePrefsKey(tableName));
    }
    tab.layout = { tableName, prefs, baseline: JSON.stringify(prefs) };
    return tab.layout;
}

async function confirmTableLayoutClose(tab) {
    const layout = tab.layout;
    if (!layout || JSON.stringify(layout.prefs) === layout.baseline) return true;
    const choice = await showChoiceDialog({
        title: `Save Table Layout: ${layout.tableName}`,
        message: 'Save the column order, widths, and sort order for the next time you open this table?',
        choices: [
            { value: 'yes', label: 'Yes', primary: true },
            { value: 'no', label: 'No' },
            { value: 'cancel', label: 'Cancel' }
        ]
    });
    if (choice === 'yes') {
        try { writeTablePrefs(layout.tableName, layout.prefs); }
        catch (error) {
            await showMessageDialog({ title: 'Layout Not Saved', message: error.message, confirmText: 'OK' });
            return false;
        }
    }
    return choice === 'yes' || choice === 'no';
}

function activeSaveController() {
    if (isTableDatasheetView(currentView)) return null;
    return isTableDesignView(currentView) ? window.acaciadbActiveDesignController : window.acaciadbActiveObjectController;
}

function updateQuickSaveState() {
    const button = document.querySelector('[data-quick-save]');
    if (button) button.disabled = Boolean(button.dataset.saving) || !activeSaveController()?.isDirty?.();
}

async function quickSave() {
    if (!closeActiveCellEditor(true)) return;
    const controller = activeSaveController();
    if (!controller?.isDirty?.()) return;
    const button = document.querySelector('[data-quick-save]');
    button.dataset.saving = 'true';
    updateQuickSaveState();
    try {
        if (controller.saveDesign) await controller.saveDesign({ promptForConfirmation: false });
        else await controller.save();
    } catch (error) {
        await showMessageDialog({ title: 'Save Failed', message: error.message, confirmText: 'OK' });
    } finally {
        delete button.dataset.saving;
        updateQuickSaveState();
    }
}

function readWorkspaceState() {
    try {
        const state = JSON.parse(localStorage.getItem(workspaceStateStorageKey) || 'null');
        if (!state || typeof state !== 'object') return null;
        return {
            database: String(state.database || ''),
            tabs: Array.isArray(state.tabs) ? state.tabs.filter(view => typeof view === 'string') : [],
            activeView: String(state.activeView || '')
        };
    } catch (error) {
        return null;
    }
}

function persistWorkspaceState() {
    if (!currentDatabaseName) return;
    try {
        localStorage.setItem(workspaceStateStorageKey, JSON.stringify({
            database: currentDatabaseName,
            tabs: openTabs.map(tab => tab.view),
            activeView: currentView
        }));
    } catch (error) {
        // The workspace remains usable when browser storage is unavailable.
    }
}

function restorableViews(db) {
    const views = new Set();
    Object.keys(db.tables || {}).forEach(name => {
        const slug = objectSlug(name);
        views.add(`table-${slug}`);
        views.add(`design-${slug}`);
    });
    Object.keys(db.forms || {}).forEach(name => {
        const slug = objectSlug(name);
        views.add(`form-${slug}`);
        views.add(`design-form-${slug}`);
    });
    Object.keys(db.queries || {}).forEach(name => views.add(`query-${objectSlug(name)}`));
    Object.keys(db.reports || {}).forEach(name => views.add(`report-${objectSlug(name)}`));
    return views;
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
                <button class="doc-tab ${tab.view === currentView ? 'active' : ''}" data-tab-view="${escapeHtml(tab.view)}" title="${escapeHtml(tab.title)}">
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
    if (!closeActiveCellEditor(true)) return;
    const replaceActive = options.replaceActive === true;
    const existingObjectTab = replaceActive ? null : findOpenObjectTab(view);

    if (existingObjectTab) {
        view = existingObjectTab.view;
    }

    if (isTableDesignView(currentView) && designViewPairs[currentView] === view) {
        const controller = window.acaciadbActiveDesignController;
        if (controller?.isDirty?.() && !await controller.confirmClose({ switchingToDatasheet: true })) return;
    }

    const existingIndex = findTabIndex(view);
    const outgoing = findOpenObjectTab(currentView);
    if (outgoing && content.querySelector('.view-shell') && !isTableDatasheetView(currentView)) {
        outgoing.editors ||= {};
        outgoing.editors[currentView] = {
            nodes: [...content.childNodes],
            design: window.acaciadbActiveDesignController,
            object: window.acaciadbActiveObjectController
        };
    }
    if (replaceActive && view === currentView && outgoing?.editors) delete outgoing.editors[view];

    if (replaceActive && openTabs.length) {
        const activeIndex = Math.max(0, findTabIndex(currentView));
        openTabs[activeIndex] = {
            ...openTabs[activeIndex],
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
    window.acaciadbActiveDesignController = null;
    window.acaciadbActiveTableController = null;
    window.acaciadbActiveObjectController = null;
    updateQuickSaveState();
    statusModeOverride = null;
    persistWorkspaceState();
    content.innerHTML = '<div class="p-6 text-neutral-500">Loading...</div>';
    renderDocumentTabs();
    const cached = findOpenObjectTab(view)?.editors?.[view];
    if (cached) {
        content.replaceChildren(...cached.nodes);
        window.acaciadbActiveDesignController = cached.design;
        window.acaciadbActiveObjectController = cached.object;
        setActiveObject(view);
        updateContextualRibbon(view);
        renderStatusViewButtons();
        status.textContent = content.querySelector('.view-shell')?.dataset.status || 'Ready';
        updateQuickSaveState();
        return;
    }
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
    persistWorkspaceState();
    renderDocumentTabs();
    status.textContent = shell?.dataset.status || 'Ready';
    setActiveObject(view);
    updateContextualRibbon(view);
    renderStatusViewButtons();
    await initCurrentView();
    updateQuickSaveState();
}

async function closeActiveTab() {
    if (!closeActiveCellEditor(true)) return;
    const activeIndex = findTabIndex(currentView);
    if (activeIndex === -1) {
        return;
    }

    const tab = openTabs[activeIndex];
    const designView = tableViewPairs[currentView] || currentView;
    {
        const controller = isTableDesignView(currentView) ? window.acaciadbActiveDesignController : tab.editors?.[designView]?.design;
        if (controller?.isDirty?.()) {
            const canClose = await controller.confirmClose?.();
            if (!canClose) return;
        }
    }

    if (!await confirmTableLayoutClose(tab)) return;

    const objectControllers = new Set([window.acaciadbActiveObjectController,
        ...Object.values(tab.editors || {}).map(editor => editor.object)]);
    for (const controller of objectControllers) {
        if (!controller?.isDirty?.()) continue;
        const choice = await showChoiceDialog({
            title: 'Unsaved Changes', message: 'Save changes before closing?',
            choices: [{ value: 'save', label: 'Save Changes', primary: true },
                { value: 'discard', label: 'Discard Changes' }, { value: 'cancel', label: 'Cancel' }]
        });
        if (choice === 'save') {
            try { await controller.save(); }
            catch (error) {
                await showMessageDialog({ title: 'Save Failed', message: error.message, confirmText: 'OK' });
                return;
            }
        } else if (choice !== 'discard') return;
    }

    openTabs.splice(activeIndex, 1);

    if (!openTabs.length) {
        currentView = '';
        window.acaciadbActiveDesignController = null;
        window.acaciadbActiveObjectController = null;
        updateQuickSaveState();
        persistWorkspaceState();
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

async function switchTableMode(mode) {
    const target = mode === 'design'
        ? tableViewPairs[currentView] || formViewPairs[currentView] || currentView
        : designViewPairs[currentView] || formDesignViewPairs[currentView] || currentView;

    if (target === currentView) {
        return;
    }

    await loadView(target, { replaceActive: true });
}

async function initCurrentView() {
    const db = await getDatabase();
    await initTableViews(db);
    initDesignViews(db);
    initFormViews(db);
    initFormDesignViews(db);
    initReportViews(db);
    initQueryBuilders(db);
}

